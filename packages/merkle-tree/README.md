# Green Proof Merkle Tree
This package is a wrapper around `merkletreejs` and can be used to create unified merkle trees.

# Installation

[//]: # (TODO: Change after deployment)
1. ```yarn add @energyweb/greenproof-merkle-tree```

# Usage

1. Create leaves using exported `hash` function.
   - Pass `string` to hash as first argument and `key` as second argument.
2. Use `createMerkleTree` function to create merkle tree from leaves.
3. Returned function `verify` can be used to verify if leaf is present in the constructed tree. Tree is the constructed instance of `MerkleTree` from [merkletreejs library](https://github.com/miguelmota/merkletreejs).

Full example:
```typescript
import {createMerkleTree, hash} from '@energyweb/greenproof-merkle-tree';

const leavesForMerkleTree = [
    hash('my data'),
    hash(JSON.stringify({someData: 1, otherData: '123'})),
];

const {tree, verify} = createMerkleTree(leavesForMerkleTree);

verify(hash('my data')) // `true` -> leaf is present in merkle tree'
verify(JSON.stringify({someData: 1, otherData: '123'})) // `true` -> leaf is in merkle tree

verify(hash('not existing data')) // `false` -> leaf is not in merkle tree
verify(JSON.stringify({someData: 1})) // `false` -> leaf is not in merkle tree
```

NOTE:
`key` is used to differentiate between leaves with the same values. For example you can have leaves:
```typescript
const johnFromPoland = hash('John', 'PL');
const johnFromUSA = hash('John', 'USA');

const {verify} = createMerkleTree([johnFromPoland, johnFromUSA]);

verify(johnFromPoland) // true
verify(johnFromUSA) // true
verify(hash('John', 'DE')) // false, as there was no John with such a key in the tree
```

Refer to [unit tests](test/hashing.test.ts) for more examples.