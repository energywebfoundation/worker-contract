import { Injectable } from '@nestjs/common';
import { MatchingService } from './matching/matching.service';

@Injectable()
export class MatchingFacade {
  constructor(
    private matchingService: MatchingService,
  ) {}

  public async match(): Promise<void> {
    await this.matchingService.match();
  }
}
