import { SlonikModule } from '../../src/database';
import { DatabaseService } from '../../src/database/database.service';
import { getConnectionOptions } from '../../src/database/database.utils';
import { MatchesFacade } from '../../src/matches/matches.facade';
import { MatchesModule } from '../../src/matches/matches.module';
import { bootstrapFacadeTest } from '../bootstrap';
import { runMatchesModuleTests } from './matches-module-tests';

let appStop: () => Promise<void>;

runMatchesModuleTests({
  beforeEach: async () => {
    const { matchesFacade, databaseService, stop } = await bootstrapFacadeTest(
      MatchesModule,
      { matchesFacade: MatchesFacade, databaseService: DatabaseService },
      {
        modules: [SlonikModule.forRoot({ connectionUri: getConnectionOptions().uri })],
      },
    );

    await databaseService.clean();

    appStop = stop;

    return { matchesFacade };
  },
  afterEach: async () => {
    await appStop();
  },
});
