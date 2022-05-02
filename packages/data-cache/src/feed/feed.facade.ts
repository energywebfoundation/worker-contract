import { Injectable } from '@nestjs/common';
import { MatchesFacade } from '../matches/matches.facade';
import { DataSource } from './data/types';

@Injectable()
export class FeedFacade {
  constructor(
    private dataSource: DataSource,
    private matchesFacade: MatchesFacade,
  ) {}

  public async feedMatches(matchRootHash: string) {
    const data = await this.dataSource.getMatchesByRootHash(matchRootHash);

    /**
     * @TODO
     * add data schema validation is probably good idea,
     * since it's external source
     */

    await this.matchesFacade.saveMatchingResult(data);
  }
}
