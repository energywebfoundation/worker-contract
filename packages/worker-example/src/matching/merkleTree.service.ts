import { Injectable } from '@nestjs/common';
import { MerkleTree as MT } from '@energyweb/greenproof-worker';
import type { BatteryState, MatchingConsumptionLeftover, MatchingGenerationLeftover, MatchingResult, MatchingResultGeneration, MatchingResultMatch } from 'types';
import { omit } from 'lodash';

@Injectable()
export class MerkleTree {
  constructor(public merkleTree: MT) {}

  public createTree(
    matchingResult: {
      matches: Omit<MatchingResultMatch, 'proof' | 'leaf'>[];
      leftoverConsumptions: Omit<MatchingConsumptionLeftover, 'proof' | 'leaf'>[];
      leftoverGenerations: Omit<MatchingGenerationLeftover, 'proof' | 'leaf'>[];
    },
    inputData: {
      generations: Omit<MatchingResultGeneration, 'proof' | 'leaf'>[];
      batteryDischarges: Omit<MatchingResultGeneration, 'proof' | 'leaf'>[];
    },
    batteryStates: Record<string, BatteryState>,
  ) {
    const preparedMatches = matchingResult.matches.map(this.addLeaf);
    const preparedLeftOverConsumption = matchingResult.leftoverConsumptions.map(this.addLeaf);
    const preparedLeftoverGeneration = matchingResult.leftoverGenerations.map(this.addLeaf);
    const preparedInputGenerations = inputData.generations.map(this.addLeaf);
    const preparedBatteryDischarges = inputData.batteryDischarges.map(this.addLeaf);

    const preparedBatteryState = {
      ...batteryStates,
      leaf: this.merkleTree.hash(this.merkleTree.stringify(batteryStates as any)).toString('hex'),
    };

    const tree = this.merkleTree.createMerkleTree(
      [
        ...preparedMatches,
        ...preparedLeftOverConsumption,
        ...preparedLeftoverGeneration,
        ...preparedInputGenerations,
        ...preparedBatteryDischarges,
        preparedBatteryState,
      ].map(({ leaf }) => leaf),
    );

    const addProof = this.makeAddProof(tree);

    return {
      rootHash: tree.getHexRoot(),
      matches: preparedMatches.map(addProof),
      leftoverConsumptions: preparedLeftOverConsumption.map(addProof),
      leftoverGenerations: preparedLeftoverGeneration.map(addProof),
      inputGenerations: preparedInputGenerations.map(addProof),
      inputBatteryDischarges: preparedBatteryDischarges.map(addProof),
      batteryStore: addProof(preparedBatteryState),
    };
  }

  public verifyMatchingResult(matchingResult: MatchingResult): string {
    return this.createTree(
      {
        leftoverConsumptions: matchingResult.resultData.leftoverConsumptions.map(this.omitProof),
        leftoverGenerations: matchingResult.resultData.leftoverGenerations.map(this.omitProof),
        matches: matchingResult.resultData.matches.map(this.omitProof),
      },
      {
        batteryDischarges: matchingResult.inputData.batteryDischarges.map(this.omitProof),
        generations: matchingResult.inputData.generations.map(this.omitProof),
      },
      matchingResult.batteryStore.states,
    ).rootHash;
  }

  // Field instead of function will keep `this` context
  private addLeaf = <T extends HashingTarget>(obj: T): T & { leaf: string } => {
    const hash = this.merkleTree.createPreciseProof(obj).getHexRoot();
    return {
      ...obj,
      leaf: hash,
    };
  };

  private makeAddProof = (tree: ReturnType<MT['createMerkleTree']>) => <T extends { leaf: string }>(entry: T): T & { proof: string } => {
    return {
      ...entry,
      proof: JSON.stringify(tree.getHexProof(entry.leaf)),
    };
  };

  private omitProof<T extends { leaf: string; proof: string }>(e: T): Omit<T, 'proof' | 'leaf'> {
    return omit(e, 'proof', 'leaf');
  }
}

// It is copied over from merkle tree, this is generalized thing that can be JSON.stringified
interface HashingTarget {
  [k: string]: string | number | boolean | null | undefined | Date | HashingTarget | HashingTarget[] | string[] | number[] | boolean[] | Date[];
}
