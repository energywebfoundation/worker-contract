import { getExpectedResults } from '../../../../greenproof-quinbrook/packages/e2e/src/algo';
import { bootstrap } from './config';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function start() {
  const { backend, provider, worker, worker_1, worker_2 } = bootstrap();

  try {
    await Promise.all([
      worker.setup(),
      worker_1.setup(),
      worker_2.setup(),
      backend.setup(),
      provider.setup(),
    ]);
  } catch (err: any) {
    console.log(JSON.stringify(err.response.data, null, 2));
  }

  try {
    const { input, matchingResult } = getExpectedResults();
    await provider.sendMessage({
      fqcn: 'provider.send.input',
      payload: JSON.stringify(input),
      transactionId: '1',
    });

    await Promise.all([
      async () => {
        while (true) {
          const [message] = await worker.getMessages({
            fqcn: 'worker.receive.input',
            amount: 1,
            clientId: '1',
          });
          if (message) {
            console.log(`Worker_0 received message: ${message.payload}`);
            await worker.sendMessage({
              fqcn: 'worker.send.result',
              payload: JSON.stringify({ data: matchingResult }),
              transactionId: '2',
            });
            return;
          }
          await delay(100);
        }
      },
      async () => {
        while (true) {
          const [message] = await worker_1.getMessages({
            fqcn: 'worker.receive.input',
            amount: 1,
            clientId: '1',
          });
          if (message) {
            console.log(`Worker_0 received message: ${message.payload}`);
            await worker_1.sendMessage({
              fqcn: 'worker.send.result',
              payload: JSON.stringify({ data: matchingResult }),
              transactionId: '2',
            });
            return;
          }
          await delay(100);
        }
      },
      async () => {
        while (true) {
          const [message] = await worker_2.getMessages({
            fqcn: 'worker.receive.input',
            amount: 1,
            clientId: '1',
          });
          if (message) {
            console.log(`Worker_0 received message: ${message.payload}`);
            await worker_2.sendMessage({
              fqcn: 'worker.send.result',
              payload: JSON.stringify({ data: matchingResult }),
              transactionId: '2',
            });
            return;
          }
          await delay(100);
        }
      },
    ]);
    const messages = await backend.getMessages({
      fqcn: 'cache.receive.result',
      amount: 3,
      clientId: '1',
    });

    console.log(JSON.stringify(messages));
  } catch (err: any) {
    console.log(err);
    console.log(JSON.stringify(err.response.data));
  }
}

start();
