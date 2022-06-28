import { Injectable } from '@nestjs/common';
import { OverseerService } from './overseer.service';

@Injectable()
export class OverseerFacade {
  constructor(private service: OverseerService) { }

  public async cancelExpiredVotings() {
    await this.service.cancelExpiredVotings();
  }
}