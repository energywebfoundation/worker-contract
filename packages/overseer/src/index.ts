import { NestFactory } from '@nestjs/core';
import { OverseerModule } from './overseer.module';
import { Logger } from 'nestjs-pino';
import type { OverseerConfig } from './types';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Module } from '@nestjs/common';

@Module({})
export class OverseerDefaultModule {

  public static register(config: any) {
    return {
      module: OverseerDefaultModule,
      imports: [
        OverseerModule.register(config),
        EventEmitterModule.forRoot(),
      ],
    };
  }
}

export async function start(config: OverseerConfig, port: number) {
  const app = await NestFactory.create(OverseerDefaultModule.register(config));
  app.useLogger(app.get(Logger));
  await app.listen(port);
  console.log(`Overseer listening on port ${port}.`);
}

export * from './types';

export * from './overseer.module';

export * from './events';