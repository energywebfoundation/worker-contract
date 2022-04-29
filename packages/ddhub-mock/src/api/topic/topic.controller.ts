import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { TopicFacade } from '../../topic/topic.facade';
import { AckMessageDTO } from './dto/ackMessage.dto';
import { CreateTopicDTO } from './dto/createTopic.dto';
import { GetMessagesDTO } from './dto/getMessages.dto';
import { SendMessageDTO } from './dto/sendMessage.dto';

@Controller()
export class TopicController {
  constructor(private topicFacade: TopicFacade) {}

  @Post('topic')
  async createTopic(@Body() { clientIds, topicName }: CreateTopicDTO) {
    await this.topicFacade.createTopic({
      clientIds,
      topicName,
    });
  }

  @Get('topic')
  async getTopics() {
    const topics = await this.topicFacade.getTopics();
    return { topics };
  }

  @Delete('/topic/:topicName')
  async deleteTopic(@Param('topicName') topicName: string) {
    await this.topicFacade.deleteTopic({ topicName });
  }

  @Post('message')
  async sendMessage(@Body() { message, topicName }: SendMessageDTO) {
    await this.topicFacade.sendMessage({
      message,
      topicName,
    });
  }

  @Get('message')
  async getMessages(
    @Query() { clientID, topicName, from, to }: GetMessagesDTO,
  ) {
    const messages = await this.topicFacade.getMessages({
      clientID,
      topicName,
      from,
      to,
    });

    return {
      messages,
    };
  }

  @Post('message/ack')
  async ackMessage(@Body() { clientId, messageId, topicName }: AckMessageDTO) {
    await this.topicFacade.ackMessage({ clientId, messageId, topicName });
  }
}
