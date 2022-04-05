import type { Preferences, Reading } from '../matching-data/types';
import { MatchingDataFacade } from '../matching-data/matching-data.facade';
import { MatchingResultFacade } from '../matching-result/matching-result.facade';
import { Inject } from '@nestjs/common';
import type { ExcessGeneration, LeftoverConsumption, Match, MatchingOutput} from './types';
import { MatchingAlgorithm, MATCHING_ALGO } from './types';
import { createMerkleTree, hash } from 'greenproof-merkle-tree';


export class MatchingFacade {
  constructor(
    private matchingDataFacade: MatchingDataFacade,
    private matchingResultFacade: MatchingResultFacade,
    @Inject(MATCHING_ALGO)
    private matchingAlgorithm: MatchingAlgorithm,
  ) {}

  public async match(timestamp: Date) {
    const consumptions = await this.matchingDataFacade.getConsumptions({from: timestamp, to: timestamp});
    const generations = await this.matchingDataFacade.getGenerations({from: timestamp, to: timestamp});
    const preferences = await this.matchingDataFacade.getPreferences();

    const matchingResult = this.matchingAlgorithm({consumptions, generations, preferences});
    const merkleTree = this.createTree(matchingResult);

    await this.matchingResultFacade.receiveMatchingResult({tree: merkleTree, data: matchingResult});
  }

  private createTree(matchingResult: MatchingOutput) {
    const hashes = this.createHashes(matchingResult);
    const merkleTree = createMerkleTree(hashes);
    const root = merkleTree.tree.getRoot().toString();
    const leaves = merkleTree.tree.getLeaves().map(leaf => leaf.toString());

    return {
      rootHash: root,
      leaves,
    };
  }

  private createHashes(matchingResult: MatchingOutput): string[] {
    const hashMatch = (match: Match) => hash(JSON.stringify(match), 'MATCH');
    const hashGeneration = (generation: ExcessGeneration) => hash(JSON.stringify(generation), 'EXCESS_GENERATION');
    const hashConsumption = (consumption: LeftoverConsumption) => hash(JSON.stringify(consumption), 'LEFTOVER_CONSUMPTION');

    const matchesHashes = matchingResult.matches.map(hashMatch);
    const excessGenerationHashes = matchingResult.excessGenerations.map(hashGeneration);
    const leftoverConsumptionMatches = matchingResult.leftoverConsumptions.map(hashConsumption);

    return [...matchesHashes, ...excessGenerationHashes, ...leftoverConsumptionMatches];
  }
}
