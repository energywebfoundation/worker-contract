import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  SqliteDialect,
} from 'kysely';
import * as fs from 'fs/promises';
import * as path from 'path';
import { join } from 'path';
import sql from 'better-sqlite3';

require('dotenv').config();

const dbFile = join(process.env['SQLITE_LOCATION']! ?? join('/tmp', 'worker.sqlite'));

export const db = new Kysely<any>({
  dialect: new SqliteDialect({
    database: sql(dbFile),
  }),
});

export const createMigrator = (database: Kysely<any>): Migrator => {
  return new Migrator({
    db: database,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: join(__dirname, 'migrations'),
    }),
    migrationTableName: 'migration',
  });
};

export const migrator = createMigrator(db);
