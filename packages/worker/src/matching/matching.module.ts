import { Module } from '@nestjs/common';

@Module({})
export class MatchingModule {
  public static register(options: {
    dependendencies: any[]
  }) {
    return {
      module: MatchingModule,
      imports: options.dependendencies,
      provide: [MatchingFacade],
      exports: [MatchingFacade],
    }
  }
}
