import { SlonikModule } from '../../src/database';
import { DatabaseService } from '../../src/database/database.service';
import { getConnectionOptions } from '../../src/database/database.utils';
import { DataSource } from '../../src/feed/data/types';
import { FeedFacade } from '../../src/feed/feed.facade';
import { FeedModule } from '../../src/feed/feed.module';
import { MatchesFacade } from '../../src/matches/matches.facade';
import type { MatchingResult } from '../../src/types';
import { bootstrapFacadeTest } from '../bootstrap';
import { runFeedModuleTests, feedModuleMatchResult } from './feed-module-tests';

let appStop: () => Promise<void>;

runFeedModuleTests({
  beforeEach: async () => {
    const { feedFacade, matchesFacade, databaseService, stop } = await bootstrapFacadeTest(
      FeedModule,
      { feedFacade: FeedFacade, matchesFacade: MatchesFacade, databaseService: DatabaseService },
      {
        overrideProviders: [{ provide: DataSource, useValue: createDataSource(feedModuleMatchResult) }],
        modules: [SlonikModule.forRoot({ connectionUri: getConnectionOptions().uri })],
      },
    );

    await databaseService.clean();

    appStop = stop;

    return { feedFacade, matchesFacade };
  },
  afterEach: async () => {
    await appStop();
  },
});

const createDataSource = (data: MatchingResult): DataSource => {
  class DataSourceForUnitTests implements DataSource {
    getMatchesByRootHash(matchRootHash: string): Promise<MatchingResult> {
      return Promise.resolve(data);
    }
  }

  return new DataSourceForUnitTests();
};