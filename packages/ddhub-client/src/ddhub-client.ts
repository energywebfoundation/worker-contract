import { z } from 'zod';
import { TopicNotConfiguredError } from './errors';
import type {
  Config,
  MessageQuery,
  SendMessageDto,
  UploadMessageBodyDto,
} from './types';
import {
  createChannel,
  getChannel,
  getReceivedMessages,
  getTopics,
  savePrivateKey,
  sendMessageToDDHub,
  updateChannel,
  ChannelTypeEnum,
  downloadFileFromDDHub,
  uploadFileToDDHub,
} from './types';

const schema = z.object({
  config: z
    .array(
      z.object({
        topicName: z.string().trim().min(1),
        topicVersion: z.string().trim().min(1),
        channelName: z.string().trim().min(1),
        channelType: z.nativeEnum(ChannelTypeEnum),
        conditions: z.object({
          dids: z.string().array(),
          roles: z.string().array(),
        }),
        encrypted: z.boolean(),
      }),
    )
    .min(1),
  privateKey: z.string().trim().min(1),
  ownerNamespace: z.string().trim().min(1),
  ddhubUrl: z.string().trim().min(1),
  debugModeOn: z.boolean().optional(),
});

export class DDHubClient {
  readonly #configuration: Config[];
  readonly #sendChannels: Map<string, Config> = new Map();
  readonly #receiveChannels: Map<string, Config> = new Map();
  readonly #uploadChannels: Map<string, Config> = new Map();
  readonly #downloadChannels: Map<string, Config> = new Map();
  readonly #owner: string;
  readonly #privateKey: string;
  readonly #ddhubUrl: string;
  readonly #debugModeOn: boolean = false;

  constructor(configuration: {
    config: Config[];
    privateKey: string;
    ownerNamespace: string;
    ddhubUrl: string;
    debugModeOn?: boolean;
  }) {
    const { config, ddhubUrl, ownerNamespace, privateKey, debugModeOn } =
      schema.parse(configuration);

    this.#ddhubUrl = ddhubUrl;
    this.#configuration = config;
    this.#owner = ownerNamespace;
    this.#privateKey = privateKey;
    this.#debugModeOn = debugModeOn ?? false;
    for (const c of config) {
      if (c.channelType === 'sub') {
        this.#receiveChannels.set(c.channelName, c);
      }

      if (c.channelType === 'pub') {
        this.#sendChannels.set(c.channelName, c);
      }

      if (c.channelType === 'download') {
        this.#downloadChannels.set(c.channelName, c);
      }

      if (c.channelType === 'upload') {
        this.#uploadChannels.set(c.channelName, c);
      }
    }
  }

  private log(msg: string) {
    if (this.#debugModeOn) {
      return console.log(`[${new Date().toISOString()}] --- [DEBUG-DDHUB-CLIENT] --- ${msg}`);
    }
  }

  /**
   * This function sets up all the necessary communication configuration.
   * Needs to be called before any interactions with DDHUB Client.
   */
  async setup(omitSavingPrivateKey: boolean = false) {

    if (!omitSavingPrivateKey) {
      /**
       * Set the private key for Client Gateway
       */
      this.log('Saving private key');
      await savePrivateKey(
        { privateKey: this.#privateKey },
        { baseURL: this.#ddhubUrl },
      );
      this.log('Private key saved');
    }

    /**
     * Get all topics configured globally for the app owner
     */
    this.log('Getting all topics for owner namespace');
    const { records: topics } = await getTopics(
      {
        owner: this.#owner,
        limit: 20,
      },
      { baseURL: this.#ddhubUrl },
    );

    this.log(`Received topics: ${topics.map(({name}) => name).join(' ,')}`);

    /**
     * Verify if all topics are configured
     * Throw and error when any of the topics is not configured
     * Not able to create topic - special role needed
     */
    const topicsNotFound = this.#configuration.filter(
      ({ topicName }) => !topics.some(({ name }) => name === topicName),
    );

    if (topicsNotFound.length > 0) {
      throw new TopicNotConfiguredError(
        topicsNotFound.map(({ topicName }) => topicName).join(' ,'),
      );
    }

    /**
     * Verify all if all channels are up to date configured
     * 1. Check if channel exists
     *  a) exists => update to passed configuration
     *  b) not exists => create as passed in configuration
     */
    for (const {
      channelName,
      conditions,
      channelType,
      encrypted,
      topicName,
    } of this.#configuration) {
      try {
        await getChannel(channelName, { baseURL: this.#ddhubUrl });
        this.log(`Channel: ${channelName} found, updating channel`);
        await updateChannel(
          channelName,
          {
            conditions: {
              ...conditions,
              topics: [{ owner: this.#owner, topicName }],
            },
            payloadEncryption: encrypted,
            type: channelType,
          },
          { baseURL: this.#ddhubUrl },
        );
        this.log(`Updating channel: ${channelName} finished successfully`);
      } catch {
        this.log(`Channel: ${channelName} not found, creating channel`);
        await createChannel(
          {
            conditions: {
              ...conditions,
              topics: [{ owner: this.#owner, topicName }],
            },
            fqcn: channelName,
            payloadEncryption: encrypted,
            type: channelType,
          },
          { baseURL: this.#ddhubUrl },
        );
        this.log(`Channel: ${channelName} created`);
      }
    }
    this.log('Setup finished');
  }

  /**
   * @param {string} query.fqcn channel name
   * @param {number} query.amount number of messages to get
   * @param {string} query.clientId cursor for pointing to messages
   * @param {string} query.from date from which messages to be fetched
   */
  async getMessages({
    fqcn,
    amount,
    clientId,
    from,
  }: Omit<MessageQuery, 'topicName' | 'topicOwner'>) {
    const { topicName } = this.#receiveChannels.get(fqcn) ?? {};

    if (!topicName) {
      throw new Error(`Channel: ${fqcn} not found in configuration`);
    }

    return await getReceivedMessages(
      {
        fqcn,
        topicName,
        topicOwner: this.#owner,
        amount,
        clientId,
        from,
      },
      { baseURL: this.#ddhubUrl },
    );
  }

  /**
   * @param {string} query.fqcn channel name
   * @param {string} query.payload stringified message
   * @param {string} query.transactionId ??
   */
  async sendMessage({
    fqcn,
    payload,
    transactionId,
  }: Pick<SendMessageDto, 'fqcn' | 'payload' | 'transactionId'>) {
    const { topicName, topicVersion } = this.#sendChannels.get(fqcn) ?? {};

    if (!topicName || !topicVersion) {
      throw new Error(`Channel: ${fqcn} not found in configuration`);
    }

    return await sendMessageToDDHub(
      {
        fqcn,
        payload,
        topicName,
        topicOwner: this.#owner,
        topicVersion,
        transactionId,
      },
      { baseURL: this.#ddhubUrl },
    );
  }

  /**
   * @param {string} query.fqcn channel name
   * @param {blob} query.file file blob
   * @param {string} query.transactionId ??
   */
  async uploadFile({
    file,
    fqcn,
    transactionId,
  }: Pick<UploadMessageBodyDto, 'file' | 'fqcn' | 'transactionId'>) {
    const { topicName, topicVersion } = this.#uploadChannels.get(fqcn) || {};

    if (!topicName || !topicVersion) {
      throw new Error(`Channel: ${fqcn} not found in configuration`);
    }

    return await uploadFileToDDHub(
      {
        file,
        fqcn,
        topicName,
        topicOwner: this.#owner,
        topicVersion,
        transactionId,
      },
      { baseURL: this.#ddhubUrl },
    );
  }

  /**
   * @param {string} fileId id of the file
   */
  async downloadFile(fileId: string) {
    return await downloadFileFromDDHub({
      fileId,
    });
  }
}
