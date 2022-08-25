import { MerkleTree } from 'merkletreejs';
import { hash } from './hashes';

export const createMerkleTree = (leaves: string[]) => {
  const tree = new MerkleTree(leaves, hash);

  return {
    verify: (leaf: string) =>
      tree.verify(tree.getProof(leaf), leaf, tree.getRoot()),
    tree,
  };
};

