import MerkleTree from 'merkletreejs';
import keccak256 from 'keccak256'
import { sortObject } from './utils';
import type { Target, Options } from './types';

export const createMerkleTree = (
  leaves: string[],
  { hashLeaves = false }: Options = {} as Options
) => {
  return new MerkleTree(leaves, keccak256, { sortPairs: true, sortLeaves: true, hashLeaves });
};

export const createPreciseProof = (target: Target, { hashLeaves = true }: Options = {} as Options) => {
  const sorted = sortObject(target);
  const leaves = Object.entries(sorted).map(([key, value]) => key + JSON.stringify(value));
  return new MerkleTree(leaves, keccak256, { sortPairs: true, sortLeaves: true, hashLeaves });
};

export const verify = ({
  leaf,
  proof,
  root,
}: {
  proof: any[]
  leaf: string | Buffer
  root: string | Buffer
}) => {
  return MerkleTree.verify(proof, leaf, root, keccak256, { sortPairs: true, sortLeaves: true });
};
