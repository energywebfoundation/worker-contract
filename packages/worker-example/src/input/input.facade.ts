import { Injectable } from '@nestjs/common';
import { minBy } from 'lodash';
import { TransactionKyselyService } from '../kysely/transaction.service';
import type { InputDTO } from 'types';
import { InputRepository } from './input-sqlite.repository';
import type { DatabaseInput, StoredInput } from './types';
import { InputSource } from './types';

@Injectable()
export class InputFacade {
  constructor(
    private repository: InputRepository,
    private source: InputSource,
    private transactionService: TransactionKyselyService,
  ) {}

  public async synchronizeInputs(): Promise<void> {
    const inputsIterator = await this.source.getInputMessages();

    for await (const inputs of inputsIterator) {
      const storedInputs = inputs.map(this.mapInputToStore);
      await this.transactionService.withTransaction(async (tx: DatabaseInput) => {

        for (const input of storedInputs) {
          await this.repository.save(input, tx);
        }

        if (inputs.length > 0) {
          const oldestInput = minBy(storedInputs, i => i.timestamp)!;
          await this.repository.markAsUnmatchedNewerThan(oldestInput.timestamp, tx);
        }
      });
    }
  }

  public async markAsUnmatchedNewerThan(date: Date): Promise<void> {
    await this.repository.markAsUnmatchedNewerThan(date);
  }

  /**
   * This also marks as matched
   */
  public async withInput<T>(cb: (i: InputDTO | null) => Promise<T>): Promise<T> {
    const oldestUnmatched = await this.repository.getOldestUnmatched();
    const input = oldestUnmatched ? this.mapStoredToInput(oldestUnmatched) : null;

    const result = await cb(input);

    if (oldestUnmatched) {
      await this.repository.markAsMatched(oldestUnmatched.timestamp);
    }

    return result;
  }

  private mapInputToStore(i: InputDTO): StoredInput {
    return {
      input: JSON.stringify(i),
      matched: false,
      timestamp: i.timestamp.end,
    };
  }

  private mapStoredToInput(i: StoredInput): InputDTO {
    const parsed = JSON.parse(i.input);
    return {
      ...parsed,
      timestamp: {
        start: new Date(parsed.timestamp.start),
        end: new Date(parsed.timestamp.end),
      },
    };
  }
}
