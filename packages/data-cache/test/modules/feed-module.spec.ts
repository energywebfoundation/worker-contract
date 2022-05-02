import type { DataSource } from '../../src/feed/data/types';
import { FeedFacade } from '../../src/feed/feed.facade';
import { FeedModuleForUnitTests } from '../../src/feed/feed.module';
import { MatchesFacade } from '../../src/matches/matches.facade';
import type { MatchingResult } from '../../src/types';
import { bootstrapFacadeTest } from '../bootstrap';
import { runFeedModuleTests, feedModuleMatchResult } from './feed-module-tests';

runFeedModuleTests({
  beforeEach: async () => {
    return await bootstrapFacadeTest(
      FeedModuleForUnitTests.register({
        dataSource: createDataSource(feedModuleMatchResult),
      }),
      { feedFacade: FeedFacade, matchesFacade: MatchesFacade },
    );
  },
  afterEach: () => {},
});

const createDataSource = (data: MatchingResult): DataSource => {
  class DataSourceForUnitTests implements DataSource {
    getMatchesByRootHash(matchRootHash: string): Promise<MatchingResult> {
      return Promise.resolve(data);
    }
  }

  return new DataSourceForUnitTests();
};