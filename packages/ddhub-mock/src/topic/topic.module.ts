import { Module } from '@nestjs/common';
import { TopicFacade } from './topic.facade';
import { TopicService } from './topic.service';

@Module({
  providers: [TopicService, TopicFacade],
  exports: [TopicFacade],
})
export class TopicModule {}
