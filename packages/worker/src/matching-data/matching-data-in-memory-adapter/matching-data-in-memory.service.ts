import { Injectable } from '@nestjs/common';
import { MatchingInput } from '../types';

@Injectable()
export class MatchingDataInMemoryService {
  private matchingInputQueue: MatchingInput[] = [];

  constructor(input: MatchingInput) {
    this.matchingInputQueue.push(input);
  }

  public async getInput(): Promise<MatchingInput | null> {
    const input = this.matchingInputQueue.shift();

    return input ?? null;
  }
}
