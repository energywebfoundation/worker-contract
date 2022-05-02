import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { SlonikCoreModule } from './slonik-core.module';
import type {
  SlonikModuleAsyncOptions,
  SlonikModuleOptions,
} from './interfaces';

// Taken from https://github.com/mkorobkov/nestjs-slonik
// It was not updated and isn't working with the newest versions of nestjs and slonik
@Module({})
export class SlonikModule {
  static forRoot(options: SlonikModuleOptions): DynamicModule {
    return {
      module: SlonikModule,
      imports: [SlonikCoreModule.forRoot(options)],
    };
  }

  static forRootAsync(options: SlonikModuleAsyncOptions): DynamicModule {
    return {
      module: SlonikModule,
      imports: [SlonikCoreModule.forRootAsync(options)],
    };
  }
}
