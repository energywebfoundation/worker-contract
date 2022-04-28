import type { DataSource } from '../../src/feed/data/types';
import { FeedFacade } from '../../src/feed/feed.facade';
import { FeedModuleForUnitTests } from '../../src/feed/feed.module';
import { MatchesFacade } from '../../src/matches/matches.facade';
import type { MatchingResult } from '../../src/types';
import { bootstrapFacadeTest } from '../setup';

describe('FeedModule', () => {
  let feedFacade: FeedFacade;
  let matchesFacade: MatchesFacade;

  it('should save results returned from data source into Match Module', async () => {
    ({ feedFacade, matchesFacade } = await bootstrapFacadeTest(
      FeedModuleForUnitTests.register({
        dataSource: createDataSource(matchResult),
      }),
      { feedFacade: FeedFacade, matchesFacade: MatchesFacade },
    ));

    await feedFacade.feedMatches('randomHash');

    const results = await matchesFacade.getAllResults();

    expect(results).toEqual(matchResult);
  });
});

const createDataSource = (data: MatchingResult): DataSource => {
  class DataSourceForUnitTests implements DataSource {
    getMatchesByRootHash(matchRootHash: string): Promise<MatchingResult> {
      return Promise.resolve(data);
    }
  }

  return new DataSourceForUnitTests();
};

const matchResult: MatchingResult = {
  matches: [
    { consumerId: 'c1', generatorId: 'g1', generatorMetadata: { g1: true }, consumerMetadata: { c1: true }, timestamp: new Date(), volume: 1 },
  ],
  leftoverConsumption: [
    { consumerId: 'c1', consumerMetadata: { c1: true }, timestamp: new Date(), volume: 1 },
  ],
  leftoverGeneration: [
    { generatorId: 'g1', generatorMetadata: { g1: true }, timestamp: new Date(), volume: 1 },
  ],
};