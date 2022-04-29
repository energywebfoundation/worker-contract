import { Module } from '@nestjs/common';
import { ApiModule } from './api/api.module';
import { FileModule } from './file/file.module';
import { TopicModule } from './topic/topic.module';

@Module({
  imports: [TopicModule, ApiModule, FileModule],
  controllers: [],
})
export class AppModule {}
