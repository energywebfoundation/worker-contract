import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.transaction().execute(async tx => {
    await tx.schema.createTable('external_result')
      .addColumn('id', 'integer', col => col.autoIncrement().primaryKey())
      .addColumn('input_hash', 'text', col => col.notNull())
      .addColumn('result_hash', 'text', col => col.notNull())
      .addColumn('result', 'text', col => col.notNull())
      .addColumn('timestamp', 'integer', col => col.notNull())
      .execute();

    await tx.schema.createTable('external_result_cursor')
      .addColumn('cursor', 'integer')
      .execute();
  });

}

export async function down(db: Kysely<any>): Promise<void> {
  await db.transaction().execute(async tx => {
    await tx.schema.dropTable('external_result').execute();
    await tx.schema.dropTable('external_result_cursor').execute();
  });
}
