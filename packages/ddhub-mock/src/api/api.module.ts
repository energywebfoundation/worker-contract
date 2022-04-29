import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { TopicModule } from '../topic/topic.module';
import { TopicController } from './topic/topic.controller';
import { FileController } from './file/file.controller';
import { AuthController } from './auth/auth.controller';

@Module({
  imports: [TopicModule, FileModule],
  controllers: [TopicController, FileController, AuthController],
})
export class ApiModule {}
