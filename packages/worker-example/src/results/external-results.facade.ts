import { Injectable } from '@nestjs/common';
import { ExternalResultRepository } from './external-results.repository';
import { ResultSource } from './types';

@Injectable()
export class ExternalResultFacade {
  constructor(private repository: ExternalResultRepository, private source: ResultSource) {}

  public async synchronizeExternalResults() {
    const messagesIterator = await this.source.getNewResults();

    for await (const results of messagesIterator) {
      await this.repository.saveMany(results);
    }
  }

  public async* getByInputHash(inputHash: string) {
    const results = await this.repository.getByInputHash(inputHash);
    for (const result of results) {
      yield result;
    }
  }

}
