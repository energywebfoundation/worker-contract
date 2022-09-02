/* eslint-disable max-params */
import MerkleTree from 'merkletreejs';
import { sortObject } from './utils';
import type { Target } from './types';

export const createMerkleTree = (
  leaves: string[],
  hash: (...data: string[]) => string,
) => {
  return new MerkleTree(leaves, hash, { sortLeaves: true, sortPairs: true });
};

export const createPreciseProof = (target: Target, hashFn: (...data: string[]) => string) => {
  const sorted = sortObject(target);
  const leaves = Object.entries(sorted).map(([key, value]) => hashFn(key, JSON.stringify(value)));
  return new MerkleTree(leaves, hashFn, {
    sortLeaves: true,
    sortPairs: true,
  });
};

export const verify = ({
  hashFn,
  leaf,
  proof,
  root,
}: {
  proof: any[]
  leaf: string | Buffer
  root: string | Buffer
  hashFn: (...data: string[]) => string
}) => {
  return MerkleTree.verify(proof, leaf, root, hashFn, {
    sortLeaves: true,
    sortPairs: true,
  });
};
