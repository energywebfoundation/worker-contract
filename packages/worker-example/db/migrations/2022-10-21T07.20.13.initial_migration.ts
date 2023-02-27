import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.transaction().execute(async tx => {
    await tx.schema.
      createTable('input')
      .ifNotExists()
      .addColumn('timestamp', 'integer', col => col.notNull().primaryKey())
      .addColumn('matched', 'integer', col => col.notNull().check(sql`matched = 0 OR matched = 1`))
      .addColumn('input', 'text', col => col.notNull())
      .execute();

    await tx.schema
      .createTable('input_source_cursor')
      .ifNotExists()
      .addColumn('cursor', 'integer')
      .execute();

    await tx.schema
      .createTable('matching_result')
      .ifNotExists()
      .addColumn('timestamp', 'integer', col => col.notNull().primaryKey())
      .addColumn('result', 'text', col => col.notNull())
      .execute();
  });
}

export async function down(db: Kysely<any>): Promise<void> {
}
