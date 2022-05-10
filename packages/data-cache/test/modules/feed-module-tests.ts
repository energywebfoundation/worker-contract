import type { FeedFacade } from '../../src/feed/feed.facade';
import type { MatchesFacade } from '../../src/matches/matches.facade';
import type { MatchingResult } from '../../src/types';

interface Params {
  beforeEach: () => Promise<{ feedFacade: FeedFacade, matchesFacade: MatchesFacade }>;
  afterEach: () => Promise<void> | void;
}

export const runFeedModuleTests = (params: Params) => {
  let feedFacade: FeedFacade;
  let matchesFacade: MatchesFacade;

  beforeEach(async () => {
    ({ feedFacade, matchesFacade } = await params.beforeEach());
  });

  afterEach(async () => {
    await params.afterEach();
  });

  describe('FeedModule', () => {
    it('should save results returned from data source into Match Module', async () => {
      await feedFacade.feedMatches('randomHash');

      const results = await matchesFacade.getAllResults();

      expect(results).toEqual(feedModuleMatchResult);
    });
  });
};

export const feedModuleMatchResult: MatchingResult = {
  matches: [
    {
      consumerId: 'c1',
      generatorId: 'g1',
      generatorMetadata: { g1: true },
      consumerMetadata: { c1: true },
      timestamp: new Date(),
      volume: 1,
    },
  ],
  leftoverConsumption: [
    { consumerId: 'c1', consumerMetadata: { c1: true }, timestamp: new Date(), volume: 1 },
  ],
  leftoverGeneration: [
    { generatorId: 'g1', generatorMetadata: { g1: true }, timestamp: new Date(), volume: 1 },
  ],
};