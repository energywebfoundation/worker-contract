import { Injectable } from '@nestjs/common';
import type { MatchingResult } from 'types';
import type { ResultSource } from './types';

@Injectable()
export class ExternalResultInMemorySource implements ResultSource {
  results: MatchingResult[] = [];

  addResult(result: MatchingResult) {
    this.results.push(result);
  }

  public async* getNewResults(): AsyncGenerator<MatchingResult[]> {
    yield this.results;
    this.results = [];
  }
}
