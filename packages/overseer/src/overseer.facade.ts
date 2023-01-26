import { Injectable } from '@nestjs/common';
import { OverseerService } from './overseer.service';

@Injectable()
export class OverseerFacade {
  constructor(private service: OverseerService) { }

  public async cancelExpiredVotings(numberOfVotingsLimit: number, numberOfSessionsLimit: number) {
    await this.service.cancelExpiredVotings(numberOfVotingsLimit, numberOfSessionsLimit);
  }
}