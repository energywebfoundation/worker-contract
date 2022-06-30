import { MatchingDataFacade } from '../matching-data/matching-data.facade';
import { MatchingResultFacade } from '../matching-result/matching-result.facade';
import { Inject, Injectable } from '@nestjs/common';
import { MATCHING_ALGO } from './types';
import { createMerkleTree, hash } from '@energyweb/greenproof-merkle-tree';
import { PinoLogger } from 'nestjs-pino';
import { MatchingAlgorithm} from '../types';
import type { MatchingInput, MatchingOutput} from '../types';

@Injectable()
export class MatchingFacade {
  private logger = new PinoLogger({});

  constructor(
    private matchingDataFacade: MatchingDataFacade,
    private matchingResultFacade: MatchingResultFacade,
    @Inject(MATCHING_ALGO)
    private matchingAlgorithm: MatchingAlgorithm,
  ) {}

  public async match(): Promise<void> {
    await this.matchingDataFacade.withMatchingInput(async (input) => {
      if (!input) {
        this.logger.info('No input found');
        return;
      }

      await this.matching(input);
    });
  }

  private async matching(input: MatchingInput): Promise<void> {
    this.logger.info('Matching data.');

    const matchingResult = this.matchingAlgorithm(input);
    const merkleTree = this.createTree(matchingResult);

    this.logger.info('Sending matching data.');

    await this.matchingResultFacade.receiveMatchingResult({
      timestamp: input.timestamp,
      tree: merkleTree,
      data: {
        ...matchingResult,
      },
    }, input);

    this.logger.info(`Matching for timestamp ${input.timestamp.toISOString()} complete.`);
  }

  private createTree(matchingResult: MatchingOutput) {
    this.logger.info('Creating merkle tree.');

    const hashes = this.createHashes(matchingResult);
    const merkleTree = createMerkleTree(hashes);
    const root = merkleTree.tree.getHexRoot();
    const leaves = merkleTree.tree.getHexLeaves();

    this.logger.info('Merkle tree created.');
    return {
      rootHash: root,
      leaves,
    };
  }

  private createHashes(matchingResult: MatchingOutput): string[] {
    this.logger.info('Creating hashes.');

    const matchesHashes = matchingResult.matches.map(
      m => hash(JSON.stringify(m), 'MATCH'),
    );
    this.logger.info('Match hashes created.');

    const excessGenerationHashes = matchingResult.leftoverGenerations.map(
      g => hash(JSON.stringify(g), 'LEFTOVER_GENERATION'),
    );
    this.logger.info('Excess generation hashes created.');

    const leftoverConsumptionMatches = matchingResult.leftoverConsumptions.map(
      c => hash(JSON.stringify(c), 'LEFTOVER_CONSUMPTION'),
    );
    this.logger.info('Leftover consumption hashes created.');

    return [...matchesHashes, ...excessGenerationHashes, ...leftoverConsumptionMatches];
  }
}
