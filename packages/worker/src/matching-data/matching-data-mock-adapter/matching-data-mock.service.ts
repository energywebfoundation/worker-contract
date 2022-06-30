import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { MatchingInput } from '../../types';

@Injectable()
export class MatchingDataMockService {
  private matchingInputQueue: MatchingInput[] = [];

  private logger = new PinoLogger({ renameContext: MatchingDataMockService.name });

  public async getInput(): Promise<MatchingInput | null> {
    const input = this.matchingInputQueue.shift();

    return input ?? null;
  }

  public async storeInput(input: MatchingInput): Promise<void> {
    this.matchingInputQueue.push(input);
    this.logger.info(`Stored input for ${input.timestamp}`);
  }
}
