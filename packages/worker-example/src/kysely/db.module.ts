import type { DynamicModule, OnApplicationShutdown } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import { Kysely, SqliteDialect } from 'kysely';
import { InjectKysely, KYSELY_POOL } from './repository';
import { ConfigModule } from '@nestjs/config';
import sql from 'better-sqlite3';
import { createMigrator } from '../../db/migrator';
import { DatabaseService } from './db.service';
import { TransactionKyselyService } from './transaction.service';
import { appConfig } from '../config/app-config';

interface Database {}

@Module({})
@Global()
export class DatabaseKyselyModule implements OnApplicationShutdown {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseKyselyModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: KYSELY_POOL,
          useFactory: () => {
            return new Kysely<Database>({
              dialect: new SqliteDialect({
                database: sql(appConfig.dbConfig.location),
              }),
            });
          },
        },
        DatabaseService,
        TransactionKyselyService,
      ],
      exports: [KYSELY_POOL, DatabaseService, TransactionKyselyService],
    };
  }

  constructor(
    @InjectKysely()
    private db: Kysely<any>,
  ) {}

  public async onApplicationShutdown() {
    await this.db.destroy();
  }
}


@Module({})
@Global()
export class DatabaseKyselyModuleForTesting implements OnApplicationShutdown {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseKyselyModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: KYSELY_POOL,
          useFactory: async () => {
            const db = new Kysely<Database>({
              dialect: new SqliteDialect({
                database: sql(':memory:'),
              }),
            });

            const migrator = createMigrator(db);

            await migrator.migrateToLatest();

            return db;
          },
        },
        DatabaseService,
        TransactionKyselyService,
      ],
      exports: [DatabaseService, KYSELY_POOL, TransactionKyselyService],
    };
  }

  constructor(
    @InjectKysely()
    private db: Kysely<any>,
  ) {}

  public async onApplicationShutdown() {
    await this.db.destroy();
  }
}
