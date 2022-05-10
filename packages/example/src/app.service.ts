import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchingFacade } from 'greenproof-worker';

@Injectable()
export class AppService {
  constructor(
    private matchingFacade: MatchingFacade,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  public async match(timestamp: Date) {
    await this.matchingFacade.match(timestamp);
  }
}
