import { InputRepository } from '../src/input/input-sqlite.repository';
import { Kysely, SqliteDialect } from 'kysely';
import sql from 'better-sqlite3';
import { createMigrator } from '../db/migrator';
import { randomUUID } from 'crypto';
import type { DatabaseInput } from '../src/input/types';

describe('Input repository', () => {
  let repository: InputRepository;

  beforeEach(async () => {
    const db = new Kysely<DatabaseInput>({
      dialect: new SqliteDialect({
        database: sql(':memory:'),
      }),
    });
    const migrator = createMigrator(db);
    await migrator.migrateToLatest();
    repository = new InputRepository(db as unknown as DatabaseInput);
  });
  it('should update matching result on timestamp conflict', async () => {
    const firstMatch = { timestamp: new Date('2022-02-02T11:00'), input: randomUUID(), matched: false };
    const secondMatch = { timestamp: new Date('2022-02-02T11:00'), input: randomUUID(), matched: false };
    await repository.save(firstMatch);
    await repository.save(firstMatch);
    await repository.save(secondMatch);

    const result = await repository.getOldestUnmatched();

    expect(result?.input).toEqual(secondMatch.input);

  });
});

