import { Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { InjectKysely } from './repository';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectKysely()
    private db: Kysely<{}>,
  ) {}

  public async clean() {
    const { rows } = await sql<{name: string}>`
    SELECT 
      name
    FROM 
      sqlite_master
    WHERE 
      type = 'table' 
        and name != 'migration' 
        and name != 'kysely_migration_lock'`
      .execute(this.db);

    for (const { name } of rows) {
      await sql`DELETE FROM ${sql.table(name)}`.execute(this.db);
    }

  }
}
