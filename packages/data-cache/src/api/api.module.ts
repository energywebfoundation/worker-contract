import { Module } from '@nestjs/common';
import { FeedModule } from '../feed/feed.module';
import { FeedController } from './feed.controller';

@Module({
  controllers: [
    FeedController,
  ],
  imports: [
    FeedModule,
  ]
})
export class ApiModule {}
