import type {
  ChannelConditionsDto as ChannelConditions,
  GetChannelResponseDtoType as ChannelType,
} from './client';

export type {
  MessageControlllerGetMessageParams as MessageQuery,
  SendMessageDto,
  UploadMessageBodyDto,
} from './client';

export {
  topicsControllerGetTopics as getTopics,
  channelControllerCreate as createChannel,
  channelControllerGet as getChannel,
  channelControllerUpdate as updateChannel,
  messageControlllerGetMessage as getReceivedMessages,
  messageControlllerCreate as sendMessageToDDHub,
  messageControlllerUploadFile as uploadFileToDDHub,
  messageControlllerDownloadMessage as downloadFileFromDDHub,
  GetChannelResponseDtoType as ChannelTypeEnum,
  identityControllerPost as savePrivateKey,
  topicsControllerPostTopics as createTopic,
  topicsControllerDeleteTopics as deleteTopic,
} from './client';


export type Config = {
  topicName: string;
  topicVersion: string;
  channelName: string;
  channelType: ChannelType;
  conditions: Omit<ChannelConditions, 'topics'>;
  encrypted: boolean;
};
