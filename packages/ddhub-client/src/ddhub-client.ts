import { z } from 'zod';
import { TopicNotConfiguredError } from './errors';
import { AXIOS_INSTANCE } from './response-type';
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
});

export class DDHubClient {
  readonly #configuration: Config[];
  readonly #configToChannelMap: Map<string, Config>;
  readonly #owner: string;
  readonly #privateKey: string;

  constructor(configuration: {
    config: Config[];
    privateKey: string;
    ownerNamespace: string;
    ddhubUrl: string;
  }) {
    const { config, ddhubUrl, ownerNamespace, privateKey } =
      schema.parse(configuration);
    AXIOS_INSTANCE.defaults.baseURL = ddhubUrl;
    this.#configuration = config;
    this.#owner = ownerNamespace;
    this.#privateKey = privateKey;
    const channelToConfig = new Map<string, Config>();
    for (const c of config) {
      channelToConfig.set(c.channelName, c);
    }
    this.#configToChannelMap = channelToConfig;
  }

  /**
   * This function sets up all the necessary communication configuration.
   * Needs to be called before any interactions with DDHUB Client.
   */
  async setup() {
    /**
     * Set the private key for Client Gateway
     */
    await savePrivateKey({ privateKey: this.#privateKey });

    /**
     * Get all topics configured globally for the app owner
     */
    const { records: topics } = await getTopics({
      owner: this.#owner,
      limit: 10,
    });

    /**
     * Verify if all topics are configured
     * Throw and error when any of the topics is not configured
     * Not able to create topic - special role needed
     */
    const topicsNotFound = this.#configuration.filter(
      ({ topicName }) => !topics.some(({ name }) => name === topicName),
    );

    if (topicsNotFound.length > 0) {
      throw new TopicNotConfiguredError(topicsNotFound.join(' ,'));
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
        await getChannel(channelName);
        await updateChannel(channelName, {
          conditions: {
            ...conditions,
            topics: [{ owner: this.#owner, topicName }],
          },
          payloadEncryption: encrypted,
          type: channelType,
        });
      } catch {
        await createChannel({
          conditions: {
            ...conditions,
            topics: [{ owner: this.#owner, topicName }],
          },
          fqcn: channelName,
          payloadEncryption: encrypted,
          type: channelType,
        });
      }
    }
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
    const { topicName } = this.#configToChannelMap.get(fqcn) ?? {};

    if (!topicName) {
      throw new Error(`Channel: ${fqcn} not found in configuration`);
    }

    return await getReceivedMessages({
      fqcn,
      topicName,
      topicOwner: this.#owner,
      amount,
      clientId,
      from,
    });
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
    const { topicName, topicVersion } =
      this.#configToChannelMap.get(fqcn) ?? {};

    if (!topicName || !topicVersion) {
      throw new Error(`Channel: ${fqcn} not found in configuration`);
    }

    return await sendMessageToDDHub({
      fqcn,
      payload,
      topicName,
      topicOwner: this.#owner,
      topicVersion,
      transactionId,
    });
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
    const { topicName, topicVersion } =
      this.#configToChannelMap.get(fqcn) || {};

    if (!topicName || !topicVersion) {
      throw new Error(`Channel: ${fqcn} not found in configuration`);
    }

    return await uploadFileToDDHub({
      file,
      fqcn,
      topicName,
      topicOwner: this.#owner,
      topicVersion,
      transactionId,
    });
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
