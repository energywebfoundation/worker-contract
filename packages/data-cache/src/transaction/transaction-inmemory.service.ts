import { Injectable } from '@nestjs/common';
import type { TransactionService } from './types';

@Injectable()
export class TransactionInMemoryService implements TransactionService {
  public async withTransaction<T>(cb: (tx: any) => Promise<T>): Promise<T> {
    return await cb(null);
  }
}