import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchingFacade } from '@energyweb/greenproof-worker';

@Injectable()
export class AppService {
  constructor(
    private matchingFacade: MatchingFacade,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  public async match(timestamp: Date) {
    await this.matchingFacade.match(timestamp);
  }
}
