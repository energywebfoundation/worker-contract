import { ethers } from 'ethers';
import { MatchVoting__factory } from '@energyweb/greenproof-voting-contract';
import { hash } from '@energyweb/greenproof-merkle-tree';
import type { MatchingResultReceiver } from './types';

interface BlockchainConfig {
  rpcHost: string;
  contractAddress: string;
  workerPrivateKey: string;
}

export const matchingResultVotingContractSender =
  (config: BlockchainConfig): MatchingResultReceiver =>
    async (result, input) => {
      const provider = new ethers.providers.JsonRpcProvider(config.rpcHost);
      const wallet = new ethers.Wallet(config.workerPrivateKey, provider);
      const contract = MatchVoting__factory.connect(config.contractAddress, provider.getSigner());

      const inputHash = hash(JSON.stringify(input), 'MATCHING_INPUT');

      /** @TODO use better logger */

      console.debug(`Voting for input hash: ${inputHash}`);
      console.debug(`Voting input: ${JSON.stringify(input)}`);
      console.debug(`Matching result: ${JSON.stringify(result)}`);

      await contract.connect(wallet).vote(inputHash, result.tree.rootHash, { gasLimit: 1000000 });

      console.debug(`Vote for ${inputHash} sent.`);
    };
