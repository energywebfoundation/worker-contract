import { ConsoleLogger, Injectable } from '@nestjs/common';
import { DatabasePool, sql } from 'slonik';
import { InjectPool } from '.';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectPool()
    private pool: DatabasePool,
  ) {}

  public async clean() {
    await this.pool.query(sql`TRUNCATE match RESTART IDENTITY`);
    await this.pool.query(sql`TRUNCATE leftover_generation RESTART IDENTITY`);
    await this.pool.query(sql`TRUNCATE leftover_consumption RESTART IDENTITY`);
  }
}
