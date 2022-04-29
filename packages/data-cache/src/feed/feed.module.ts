import type { DynamicModule} from '@nestjs/common';
import { Module } from '@nestjs/common';
import { MatchesModule, MatchesModuleForUnitTests } from '../matches/matches.module';
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
    FeedFacade,
  ],
})
export class FeedModule {}

@Module({})
export class FeedModuleForUnitTests {
  static register(params: { dataSource: DataSource }): DynamicModule {
    return {
      module: FeedModuleForUnitTests,
      imports: [
        MatchesModuleForUnitTests,
      ],
      exports: [
        FeedFacade,
      ],
      providers: [
        { provide: DataSource, useValue: params.dataSource },
        FeedFacade,
      ],
    };
  }
}
