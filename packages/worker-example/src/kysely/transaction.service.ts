import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from './repository';

@Injectable()
export class TransactionKyselyService {
  constructor(
    @InjectKysely()
    private db: Kysely<any>,
  ) {}

  public async withTransaction<T>(cb: (tx: Kysely<any>) => Promise<T>): Promise<T> {
    return await this.db
      .transaction()
      .execute(async (tx) => {
        return await cb(tx);
      });
  }
}
