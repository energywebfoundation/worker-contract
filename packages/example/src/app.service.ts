import { Injectable } from '@nestjs/common';
import { MatchingFacade } from 'greenproof-worker';

@Injectable()
export class AppService {
  constructor(
    private matchingFacade: MatchingFacade,
  ) {}

  public async match() {
    await this.matchingFacade.match(new Date('2022-04-07T09:00:00.000Z'));
  }
}
