# Green Proof worker

Template for creating Green Proof worker using Nest.
It mostly preconfigures communication with blockchain.

## Example implementation:

```ts
import { GreenProofWorker } from '@energyweb/greenproof-worker';

const worker = new GreenProofWorker({
  privateKey: '035678b90179a...c4f078ac00bc45fc9fb674ddfe2f17c14f',
  rpcUrl: 'https://rpc.url.com',
  votingContractAddress: '0xCD2a3d9F938...c05AbC7FE734Df8DD826',
});

/* 
* As first argument of callback function worker 
* provides a runtime object with
* MerkleTree and VotingContract helpers
*/  
worker.start(async ({ merkleTree, votingContract }) => {
  // Get data that needs to ba validated
  const input = await getInput()
  
  // Execute some decentralized logic
  const results = await decentralizedLogic(input);

  // Create voting ID (it can be a hash of input data)
  const inputHash = merkleTree.hash(input, 'input');

  // Create merkle tree leaves of the results
  const leaves = results.map((item, index) => 
    merkleTree.hash(item, index));

  // Create merkle tree
  const { tree } = merkleTree.createMerkleTree(leaves);

  // Get merkle tree root hash
  const rootHash = tree.getHexRoot();

  // Cast vote to voting contract
  await votingContract.vote(inputHash, rootHash);
});
```

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