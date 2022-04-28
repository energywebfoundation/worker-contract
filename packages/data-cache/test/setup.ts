import type { TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { DynamicModule, ForwardReference, Type } from '@nestjs/common';

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