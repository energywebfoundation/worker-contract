/* eslint-disable max-params */
import MerkleTree from 'merkletreejs';

export const createMerkleTree = (
  leaves: string[],
  hash: (data: string) => string,
) => {
  return new MerkleTree(leaves, hash, { sortLeaves: true, sortPairs: true });
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
  hashFn: (data: string) => string
}) => {
  return MerkleTree.verify(proof, leaf, root, hashFn, {
    sortLeaves: true,
    sortPairs: true,
  });
};
