import { NestFactory } from '@nestjs/core';
import { OverseerModule } from './overseer.module';
import { Logger } from 'nestjs-pino';
import type { OverseerConfig } from './types';
import { join } from 'path';
import { config } from 'dotenv';
config({ path: join(__dirname, '..', '.env') });

const port = process.env.PORT || 3000;
const blockchainConfig = {
  rpcHost: process.env.RPC_HOST!,
  contractAddress: process.env.CONTRACT_ADDRESS!,
  overseerPrivateKey: process.env.OVERSEER_PRIVATE_KEY!,

};

export async function bootstrap(config: OverseerConfig) {
  const app = await NestFactory.create(OverseerModule.register(config));
  app.useLogger(app.get(Logger));
  await app.listen(port);
  console.log(`Overseer listening on port ${port}.`);
}

bootstrap({
  blockchainConfig,
  listeners: {},
  getLastHandledBlockNumber: () => { return 0; },
});
