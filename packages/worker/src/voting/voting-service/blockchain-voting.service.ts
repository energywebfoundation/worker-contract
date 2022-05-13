import { Injectable } from '@nestjs/common';
import type { JsonRpcProvider } from '@ethersproject/providers';
import type { Wallet } from 'ethers';
import { ethers } from 'ethers';
import type { MatchVoting } from '../typechain/contracts/MatchVoting';
import { MatchVoting__factory } from '../typechain/factories/contracts/MatchVoting__factory';
import type { MatchingInput, MatchingOutput, SerializedMerkleTree } from '../../matching/types';
import { hash } from '@energyweb/greenproof-merkle-tree';
import { BlockchainConfig } from '../types';
import type { VotingService } from './voting.service';

@Injectable()
export class BlockchainVotingService implements VotingService{
  private provider: JsonRpcProvider;
  private contract: MatchVoting;
  private wallet: Wallet;

  constructor(private readonly config: BlockchainConfig) {
    this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcHost);
    this.wallet = new ethers.Wallet(this.config.workerPrivateKey, this.provider);
    this.contract = MatchVoting__factory.connect(this.config.contractAddress, this.provider.getSigner());
    this.contract.connect(this.wallet);
  }

  public async vote(matchingInput: MatchingInput, matchingResult: {merkleTree: SerializedMerkleTree, matchingResult: MatchingOutput}) {
    await this.contract.vote(hash(JSON.stringify(matchingInput), 'MATCHING_INPUT'), JSON.stringify(matchingResult.merkleTree));
  }
}