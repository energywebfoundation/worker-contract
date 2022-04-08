import type { Reading, ReadingQuery} from 'greenproof-worker';
import { WorkerBuilder } from 'greenproof-worker';
import { matchingAlgorithm } from './algorithm';
import { produceData } from './data-producer';

// Launch Nest.js application
// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   await app.listen(3000);
// }
// bootstrap();

const data = produceData();

const filterReading = (query: ReadingQuery) => (reading: Reading) => {
  const isGreater = reading.timestamp >= (query.from ?? new Date(0));
  const isSmaller = reading.timestamp <= (query.to ?? new Date(Number.MAX_SAFE_INTEGER));

  return isGreater && isSmaller;
};

// Or bootstrap worker with a builder
(async () => {
  const matchingFacade = await new WorkerBuilder()
    .setMatchingAlgorithm(matchingAlgorithm)
    .setDataSource({
      getConsumptions: async (query: ReadingQuery) => data.consumptions.filter(filterReading(query)),
      getGenerations: async (query: ReadingQuery) => data.generations.filter(filterReading(query)),
      getPreferences: async () => data.preferences,
    })
    .setResultSource({
      receiveMatchingResult: async (result) => console.log(JSON.stringify(result, null, 2)),
    })
    .compile();

  await matchingFacade.match(new Date('2022-04-01T01:00:00.000Z'));
})();
