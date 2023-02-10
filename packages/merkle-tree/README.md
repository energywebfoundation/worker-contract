# Green Proof Merkle Tree

This package is a wrapper around `merkletreejs` and can be used to create unified merkle trees.

# Installation

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

## Questions and Support

For questions and support please use Energy Web's [Discord channel](https://discord.com/channels/706103009205288990/843970822254362664)

Or reach out to us via email: 247enquiries@energyweb.org

## EW-DOS

The Energy Web Decentralized Operating System is a blockchain-based, multi-layer digital infrastructure.

The purpose of EW-DOS is to develop and deploy an open and decentralized digital operating system for the energy sector in support of a low-carbon, customer-centric energy future.

We develop blockchain technology, full-stack applications and middleware packages that facilitate participation of Distributed Energy Resources on the grid and create open market places for transparent and efficient renewable energy trading.

-   To learn about more about the EW-DOS tech stack, see our [documentation](https://app.gitbook.com/@energy-web-foundation/s/energy-web/).

-   For an overview of the energy-sector challenges our use cases address, go [here](https://app.gitbook.com/@energy-web-foundation/s/energy-web/our-mission).

For a deep-dive into the motivation and methodology behind our technical solutions, we encourage you to read our White Papers:

-   [Energy Web White Paper on Vision and Purpose](https://www.energyweb.org/reports/EWDOS-Vision-Purpose/)
-   [Energy Web White Paper on Technology Detail](https://www.energyweb.org/wp-content/uploads/2020/06/EnergyWeb-EWDOS-PART2-TechnologyDetail-202006-vFinal.pdf)

## Connect with Energy Web

-   [Twitter](https://twitter.com/energywebx)
-   [Discord](https://discord.com/channels/706103009205288990/843970822254362664)
-   [Telegram](https://t.me/energyweb)