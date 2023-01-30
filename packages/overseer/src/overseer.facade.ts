import { Injectable } from '@nestjs/common';
import { OverseerService } from './overseer.service';

@Injectable()
export class OverseerFacade {
  constructor(private service: OverseerService) { }

  // eslint-disable-next-line max-params
  public async cancelExpiredVotings(startVotingIndex: number, numberOfVotingsLimit: number, startSessionIndex: number, numberOfSessionsLimit: number) {
    await this.service.cancelExpiredVotings(startVotingIndex, numberOfVotingsLimit, startSessionIndex, numberOfSessionsLimit);
  }
}