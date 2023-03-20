import type { VotingFacet } from '@energyweb/worker';
import { ExponentialBackoff, retry, handleAll } from 'cockatiel';
import { PinoLogger } from 'nestjs-pino';
import type { MatchingResultReceiver } from '../types';

const logger = new PinoLogger({ renameContext: 'matchingResultVotingContractSender' });

const retryPolicy = retry(handleAll, { maxAttempts: 3, backoff: new ExponentialBackoff() });

export const matchingResultVotingContractSender =
  (votingContract: VotingFacet): MatchingResultReceiver =>
    async (data) => {
      logger.info(`Voting input: ${JSON.stringify(data.input)}`);
      logger.info(`Matching result: ${JSON.stringify(data.result)}`);
      logger.info(`Voting for input hash: ${data.result.inputHash}`);

      try {
        await retryPolicy.execute(async () => {
          const tx = await votingContract.vote(data.result.inputHash, data.result.resultHash, { gasLimit: 1000000 });
          await tx.wait();
        });
      } catch (err) {
        logger.info('Voting failed');
        logger.error(err);
        return;
      }


      logger.info(`Vote for ${data.result.inputHash} with result ${data.result.resultHash} sent.`);
    };
