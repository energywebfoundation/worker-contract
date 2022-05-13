import { NestFactory } from '@nestjs/core';
import type { Reading, ReadingQuery} from '@energyweb/greenproof-worker';
import { WorkerBuilder } from '@energyweb/greenproof-worker';
import { matchingAlgorithm } from './algorithm';
import { AppModule } from './app.module';
import { produceData } from './data-producer';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '..', '.env') });
const port = process.env.PORT || 3000;

// Launch Nest.js application
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(port);
  console.log(`${process.env.WORKER_BLOCKCHAIN_ADDRESS} started on port ${port}`);
}
bootstrap();

// const data = produceData();

// const filterReading = (query: ReadingQuery) => (reading: Reading) => {
//   const isGreater = reading.timestamp >= (query.from ?? new Date(0));
//   const isSmaller = reading.timestamp <= (query.to ?? new Date(Number.MAX_SAFE_INTEGER));

//   return isGreater && isSmaller;
// };

// // Or bootstrap worker with a builder
// (async () => {
//   const matchingFacade = await new WorkerBuilder()
//     .setMatchingAlgorithm(matchingAlgorithm)
//     .setDataSource({
//       getConsumptions: async (query: ReadingQuery) => data.consumptions.filter(filterReading(query)),
//       getGenerations: async (query: ReadingQuery) => data.generations.filter(filterReading(query)),
//       getPreferences: async () => data.preferences,
//     })
//     .setResultSource({
//       receiveMatchingResult: async (result) => console.log(JSON.stringify(result, null, 2)),
//     })
//     .compile();

//   await matchingFacade.match(new Date('2022-04-01T01:00:00.000Z'));
// })();
