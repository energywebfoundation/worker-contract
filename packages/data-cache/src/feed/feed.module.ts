import { Module } from '@nestjs/common';
import { MatchesModule } from '../matches/matches.module';
import { DDHubDataSource } from './data/ddhub.data';
import { DataSource } from './data/types';
import { FeedFacade } from './feed.facade';

@Module({
  imports: [
    MatchesModule,
  ],
  exports: [
    FeedFacade,
  ],
  providers: [
    { provide: DataSource, useClass: DDHubDataSource },
    FeedFacade
  ],
})
export class FeedModule {}
