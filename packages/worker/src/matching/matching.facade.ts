import type { Preferences, Reading } from '../matching-data/types';
import { MatchingDataFacade } from '../matching-data/matching-data.facade';
import { MatchingResultFacade } from '../matching-result/matching-result.facade';
import { Inject, Injectable } from '@nestjs/common';
import type { ExcessGeneration, LeftoverConsumption, Match, MatchingOutput} from './types';
import { MatchingAlgorithm, MATCHING_ALGO } from './types';
import { createMerkleTree, hash } from 'greenproof-merkle-tree';
import { PinoLogger } from 'nestjs-pino';
import { VotingFacade } from '../voting/voting.facade';

@Injectable()
export class MatchingFacade {
  private logger = new PinoLogger({});

  constructor(
    private matchingDataFacade: MatchingDataFacade,
    private matchingResultFacade: MatchingResultFacade,
    @Inject(MATCHING_ALGO)
    private matchingAlgorithm: MatchingAlgorithm,
    private votingFacade: VotingFacade,
  ) {}

  public async match(timestamp: Date): Promise<void> {
    await this.matchingDataFacade.processData({from: timestamp, to: timestamp}, this.matching);
  }

  private matching = async (consumptions: Reading[], generations: Reading[], preferences: Preferences) => {
    this.logger.info('Matching data.');

    if (consumptions.length === 0 && generations.length === 0) {
      this.logger.info('Matching omitted (no consumptions and generations during timeframe).');
      return;
    }

    const matchingResult = this.matchingAlgorithm({consumptions, generations, preferences});
    const merkleTree = this.createTree(matchingResult);

    this.logger.info('Sending matching data.');
    await this.matchingResultFacade.receiveMatchingResult({tree: merkleTree, data: matchingResult});

    try {
      this.logger.info('Sending vote for match result.');
      this.votingFacade.vote({consumptions, generations, preferences}, {merkleTree, matchingResult});
      this.logger.info('Vote sent.');
    } catch (error) {
      this.logger.info(`Error occured during voting: ${error}`);
    }

    this.logger.info('Matching for timestamp complete.');
  };

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

    const hashMatch = (match: Match) => hash(JSON.stringify(match), 'MATCH');
    const hashGeneration = (generation: ExcessGeneration) => hash(JSON.stringify(generation), 'EXCESS_GENERATION');
    const hashConsumption = (consumption: LeftoverConsumption) => hash(JSON.stringify(consumption), 'LEFTOVER_CONSUMPTION');

    const matchesHashes = matchingResult.matches.map(hashMatch);
    this.logger.info('Match hashes created.');

    const excessGenerationHashes = matchingResult.excessGenerations.map(hashGeneration);
    this.logger.info('Excess generation hashes created.');

    const leftoverConsumptionMatches = matchingResult.leftoverConsumptions.map(hashConsumption);
    this.logger.info('Leftover consumption hashes created.');

    return [...matchesHashes, ...excessGenerationHashes, ...leftoverConsumptionMatches];
  }
}
