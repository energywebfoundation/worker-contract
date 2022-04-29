import { Injectable } from '@nestjs/common';
import type { DatabaseTransactionConnection } from 'slonik';
import { DatabasePool } from 'slonik';
import { InjectPool } from '../database';
import type { TransactionService } from './types';

@Injectable()
export class TransactionSlonikService implements TransactionService {
  constructor(
    @InjectPool()
    private database: DatabasePool,
  ) {}

  public async withTransaction<T>(cb: (tx: DatabaseTransactionConnection) => Promise<T>): Promise<T> {
    return await this.database.transaction(async (tx) => {
      return await cb(tx);
    });
  }
}
