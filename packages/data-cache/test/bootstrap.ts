import type { TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { DynamicModule, ForwardReference, Provider, Type } from '@nestjs/common';
import { SlonikModule } from '../src/database';
import { getConnectionOptions } from '../src/database/database.utils';
import { DatabaseService } from '../src/database/database.service';

type ModDef = Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference;

interface FacadeTestParams {
  providers?: Type<any>[],
  modules?: ModDef[],
  overrideProviders?: { provide: any; useClass: any }[],
}

export const bootstrapFacadeTest = async <T extends Record<string, any>>(
  mainModule: ModDef,
  resolve: T,
  params: FacadeTestParams = {},
) => {
  const module: TestingModuleBuilder = Test.createTestingModule({
    imports: [mainModule, ...(params.modules ?? [])],
    providers: params.providers ?? [],
  });

  (params.overrideProviders ?? []).forEach((provider) => {
    module.overrideProvider(provider.provide).useClass(provider.useClass);
  });

  const app: TestingModule = await module.compile();

  const resolveResult = {} as Record<keyof T, any>;

  for (const [entryKey, entryValue] of Object.entries(resolve)) {
    resolveResult[entryKey as keyof T] = app.get(entryValue);
  }

  await app.init();

  return {
    ...resolveResult,
    stop: async () => await app.close(),
  };
};

export const bootstrapPostgresRepositoryTest = async <T>(repositoryClass: new (...args: any[]) => T) => {
  const app = await Test.createTestingModule({
    imports: [SlonikModule.forRoot({ connectionUri: getConnectionOptions().uri })],
    providers: [repositoryClass],
  }).compile();

  const repository = app.get<T>(repositoryClass);
  const database = app.get(DatabaseService);

  await database.clean();

  return repository;
};