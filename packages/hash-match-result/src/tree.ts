import type {BinaryLike} from 'crypto';
import {createHash} from 'crypto';

import {MerkleTree} from 'merkletreejs';
import {getConsumptionHash, getGenerationHash, getMatchHash, HASHING_FUNCTION} from './hashes';

type Match = Record<string, unknown>;

export type MatchingResult = {
    matches: Match[];
    leftoverEntities: [Match[], Match[]];
}

const treeHashFunction = (objectToHash: BinaryLike) => createHash(HASHING_FUNCTION).update(JSON.stringify(objectToHash));

export const hashMatchingResult = (matchingResult: MatchingResult) => {
  const leaves = [
    ...matchingResult.matches.map(match => getMatchHash(match)),
    ...matchingResult.leftoverEntities[0].map(leftover => getConsumptionHash(leftover)),
    ...matchingResult.leftoverEntities[1].map(leftover => getGenerationHash(leftover)),
  ];

  const tree = new MerkleTree(leaves, treeHashFunction);

  return {
    root: tree.getHexRoot(),
    verify: (leaf: string) => tree.verify(tree.getProof(leaf), leaf, tree.getRoot()),
  };
};
