import type {
  DynamicModule,
  OnApplicationShutdown,
  Provider,
  Type,
} from '@nestjs/common';
import { Global, Inject, Module, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { defer } from 'rxjs';
import type { DatabasePool } from 'slonik';
import { createPool } from 'slonik';
import {
  generateString,
  getPoolName,
  getPoolToken,
  handleRetry,
} from './common';
import { DatabaseService } from './database.service';
import type {
  SlonikModuleAsyncOptions,
  SlonikOptionsFactory,
} from './interfaces';
import { SlonikModuleOptions } from './interfaces';
import { SLONIK_MODULE_ID, SLONIK_MODULE_OPTIONS } from './slonik.constants';

@Global()
@Module({})
export class SlonikCoreModule implements OnApplicationShutdown {
  private readonly logger = new Logger('SlonikModule');

  constructor(
    @Inject(SLONIK_MODULE_OPTIONS)
    private readonly options: SlonikModuleOptions,
    private readonly moduleRef: ModuleRef,
  ) {}

  static forRoot(options: SlonikModuleOptions): DynamicModule {
    const slonikOptions = {
      provide: SLONIK_MODULE_OPTIONS,
      useValue: options,
    };
    const poolProvider = {
      provide: getPoolToken(options),
      useFactory: async () => await this.createPoolFactory(options),
    };

    return {
      module: SlonikCoreModule,
      providers: [poolProvider, slonikOptions, DatabaseService],
      exports: [poolProvider],
    };
  }

  static forRootAsync(options: SlonikModuleAsyncOptions): DynamicModule {
    const poolProvider = {
      provide: getPoolToken(options as SlonikModuleOptions),
      useFactory: async (slonikOptions: SlonikModuleOptions) => {
        if (options.name) {
          return await this.createPoolFactory({
            ...slonikOptions,
            name: options.name,
          });
        }
        return await this.createPoolFactory(slonikOptions);
      },
      inject: [SLONIK_MODULE_OPTIONS],
    };

    const asyncProviders = this.createAsyncProviders(options);
    return {
      module: SlonikCoreModule,
      imports: options.imports,
      providers: [
        ...asyncProviders,
        poolProvider,
        {
          provide: SLONIK_MODULE_ID,
          useValue: generateString(),
        },
        DatabaseService,
      ],
      exports: [poolProvider],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    const pool = this.moduleRef.get<DatabasePool>(getPoolToken(this.options));
    try {
      // https://github.com/gajus/slonik#end-connection-pool
      // The result of pool.end() is a promise that is resolved when all connections are ended.
      // Note: pool.end() does not terminate active connections/ transactions.
      await pool?.end();
    } catch (e: any) {
      this.logger.error(e?.message);
    }
  }

  private static createAsyncProviders(
    options: SlonikModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<SlonikOptionsFactory>;
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: SlonikModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: SLONIK_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    // `as Type<SlonikOptionsFactory>` is a workaround for microsoft/TypeScript#31603
    const inject = [
      (options.useClass || options.useExisting) as Type<SlonikOptionsFactory>,
    ];
    return {
      provide: SLONIK_MODULE_OPTIONS,
      useFactory: async (optionsFactory: SlonikOptionsFactory) =>
        await optionsFactory.createSlonikOptions(options.name),
      inject,
    };
  }

  private static async createPoolFactory(
    options: SlonikModuleOptions,
  ): Promise<DatabasePool | undefined> {
    const poolToken = getPoolName(options);

    return await defer(async () => {
      const pool = await createPool(
        options.connectionUri,
        options.clientConfigurationInput,
      );

      // try to connect to database to catch errors if database is not reachable
      await pool.connect(() => Promise.resolve());

      return pool;
    })
      .pipe(
        handleRetry(
          options.retryAttempts,
          options.retryDelay,
          poolToken,
          options.verboseRetryLog,
          options.toRetry,
        ),
      )
      .toPromise();
  }
}
