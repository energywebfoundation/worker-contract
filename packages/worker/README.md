### Example implementation:

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
