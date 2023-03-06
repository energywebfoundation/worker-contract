import type { BatteryState, MatchingResult } from 'types';
import { merkleTree } from '@energyweb/worker';
import { mapValues } from 'lodash';

const { createPreciseProof, verify } = merkleTree;


export const expectData = (actual: any, toEqualResult: any) => {
  // Remove leafs and proofs as we are not testing them here
  const resultData = mapValues(actual.resultData, d => d.map(({ leaf, proof, ...item }: any) => item));

  expect(resultData).toEqual(toEqualResult);
};

export const expectBatteryStore = (
  actual: any,
  toEqual: Record<string, BatteryState>,
) => {
  expect(actual.batteryStore.states).toEqual(toEqual);
};

export const m = (
  consumptionId: string,
  generationId: string,
  throughBatteryId: string | null,
  volume: number,
  carbonDisplacement = 0,
) => ({
  consumptionId,
  generationId,
  throughBatteryId,
  volume,
  carbonDisplacement,
});

export const verifyMerkleTree = ({ resultHash, resultData, inputData }: MatchingResult) => {
  const leftoversOK = [...resultData.leftoverConsumptions, ...resultData.leftoverGenerations].every(
    ({ leaf, proof, ...left }) => {
      const generatedLeaf = createPreciseProof(left as any).getHexRoot();

      const verified = verify({
        leaf: generatedLeaf,
        proof: JSON.parse(proof),
        root: resultHash,
      });

      if (!verified) {
        console.log({
          leaf,
          generatedLeaf,
          same: leaf === generatedLeaf,
          left,
          verified,
        });
      }
      return verified;
    },
  );

  const matchesOK = resultData.matches.every(
    ({
      leaf,
      proof,
      carbonDisplacement,
      consumptionId,
      generationId,
      throughBatteryId,
      volume,
      timestamp,
    }) => {
      const match = {
        ...m(
          consumptionId,
          generationId,
          throughBatteryId,
          volume,
          carbonDisplacement,
        ),
        timestamp,
      };
      const generatedLeaf = createPreciseProof(match).getHexRoot();
      const verified = verify({
        leaf: generatedLeaf,
        proof: JSON.parse(proof),
        root: resultHash,
      });

      if (!verified) {
        console.log({
          leaf,
          generatedLeaf,
          same: leaf === generatedLeaf,
          match,
          verified,
        });
      }

      return verified;
    },
  );

  const inputsOK = [
    ...inputData.batteryDischarges,
    ...inputData.generations,
  ].every(({
    leaf,
    proof,
    timestamp,
    generationId,
    volume,
  }) => {
    const input = {
      timestamp,
      generationId,
      volume,
    };

    const generatedLeaf = createPreciseProof(input).getHexRoot();

    const verified = verify({
      leaf: generatedLeaf,
      proof: JSON.parse(proof),
      root: resultHash,
    });

    if (!verified) {
      console.log({
        leaf,
        generatedLeaf,
        same: leaf === generatedLeaf,
        input,
        verified,
      });
    }

    return verified;
  });

  return matchesOK && leftoversOK && inputsOK;
};
