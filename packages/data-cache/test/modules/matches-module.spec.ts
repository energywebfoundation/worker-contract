import { MatchesFacade } from '../../src/matches/matches.facade';
import { MatchesModuleForUnitTests } from '../../src/matches/matches.module';
import type { MatchingResult } from '../../src/types';
import { bootstrapFacadeTest } from '../bootstrap';

describe('MatchesModule', () => {
  let matchesFacade: MatchesFacade;

  it('should save results', async () => {
    ({ matchesFacade } = await bootstrapFacadeTest(
      MatchesModuleForUnitTests,
      { matchesFacade: MatchesFacade },
    ));

    await matchesFacade.saveMatchingResult(matchResult);

    const results = await matchesFacade.getAllResults();

    expect(results).toEqual(matchResult);
  });
});

const matchResult: MatchingResult = {
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