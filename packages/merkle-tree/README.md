# Green Proof Merkle Tree
This package is a wrapper around `merkletreejs` and can be used to create unified merkle trees.

# Installation

[//]: # (TODO: Change after deployment)
1. ```yarn add @energyweb/greenproof-merkle-tree```

# Usage
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

Refer to [unit tests](test/hashing.test.ts) for more examples.