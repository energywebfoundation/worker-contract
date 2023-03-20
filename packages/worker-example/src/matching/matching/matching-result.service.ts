import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ExternalResultFacade } from '../../results/external-results.facade';
import type { MatchingResult } from 'types';
import { MerkleTree } from '../merkleTree.service';
import { VotingManager } from '../voting-manager/types';
import { MatchingResultRepository } from './matching-result-sqlite.repository';

@Injectable()
export class MatchingResultService {
  private logger = new PinoLogger({ renameContext: MatchingResultService.name });

  constructor(
    private matchingResultRepository: MatchingResultRepository,
    private externalResultFacade: ExternalResultFacade,
    private votingManager: VotingManager,
    private merkleTree: MerkleTree,
  ) {}

  public async saveMatchingResult(payload: MatchingResult): Promise<void> {
    await this.matchingResultRepository.save(payload);
  }

  /**
   * Fetches external matching results for given input hash.
   * It also verifies if given result is correct (as it can be malformed)
   */
  public async getExternalResultForInput(inputHash: string): Promise<MatchingResult | null> {
    this.logger.info('Getting external result');

    const consensusReached = await this.votingManager.wasConsensusReached(inputHash);
    if (!consensusReached) {
      this.logger.info(`No consensus found for input hash: ${inputHash}`);
      return null;
    }

    this.logger.info(`Consensus for inputHash: ${inputHash} found - ${consensusReached}!`);

    const resultCursor = await this.externalResultFacade.getByInputHash(inputHash);

    for await (const result of resultCursor) {
      /** We need to manually check consensus, because it may be malformed */
      const consensus = await this.checkConsensus({
        inputHash,
        resultHash: this.merkleTree.verifyMatchingResult(result),
      });

      if (consensus === Consensus.Correct) {
        resultCursor.return();
        return result;
      }
    }

    return null;
  }

  /**
   * Iterate over all matching results from newest to oldest.
   * Verify if currently selected matching result is correct
   * (it's result hash is the same as that in voting consensus).
   *
   * This allows worker to vote more often, than other workers.
   * As long as some store in past has correct consensus worker can assume it's newer results are also correct,
   * even if they have not been voted upon yet.
   */
  public async getPreviousMatchingResults(until: Date): Promise<MatchingResult | null> {
    this.logger.info('Getting local result');

    const resultCursor = this.matchingResultRepository.getCursorForUntil(until);

    let lastStore: MatchingResult | null = null;

    for await (const pastResult of resultCursor) {
      // We assign first store as `lastStore`
      // because in case that all store states are unknown
      // we want to return this last store as "previous store"
      lastStore ??= pastResult;

      const storeState = await this.checkConsensus(pastResult);

      switch (storeState) {
        case Consensus.Correct: return lastStore;
        case Consensus.Unknown: continue;
        case Consensus.Invalid: return null;
      }
    }


    return lastStore;
  }

  private async checkConsensus(
    hashes: { inputHash: string, resultHash: string },
  ): Promise<Consensus> {
    const resultHash = await this.votingManager.getConsensusResultHash(hashes.inputHash);

    if (!resultHash) {
      return Consensus.Unknown;
    }

    return (resultHash === hashes.resultHash) ? Consensus.Correct : Consensus.Invalid;
  }
}


export enum Consensus {
  Correct = 'correct',
  Invalid = 'invalid',
  Unknown = 'unknown',
}

