import { MatchesFacade } from '../../src/matches/matches.facade';
import { MatchesModuleForUnitTests } from '../../src/matches/matches.module';
import { bootstrapFacadeTest } from '../bootstrap';
import { runMatchesModuleTests } from './matches-module-tests';

runMatchesModuleTests({
  beforeEach: async () => {
    return await bootstrapFacadeTest(
      MatchesModuleForUnitTests,
      { matchesFacade: MatchesFacade },
    );
  },
  afterEach: () => {},
});
