import {createHash} from 'crypto';

import {MerkleTree} from 'merkletreejs';
import {HASHING_FUNCTION} from './hashes';


const treeHashFunction = (thingToHash: string) => createHash(HASHING_FUNCTION).update(thingToHash).digest('hex');

export const createMerkleTree = (leaves: string[]) => {
  const tree = new MerkleTree(leaves, treeHashFunction);

  return {
    verify: (leaf: string) => tree.verify(tree.getProof(leaf), leaf, tree.getRoot()),
    tree,
  };
};
