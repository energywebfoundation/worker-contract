import { Injectable } from '@nestjs/common';
import type { JsonRpcProvider } from '@ethersproject/providers';
import type { Wallet } from 'ethers';
import { ethers } from 'ethers';
import type { MatchVoting } from '@energyweb/greenproof-voting-contract';
import { MatchVoting__factory } from '@energyweb/greenproof-voting-contract';
import type { MatchingInput, MatchingOutput, SerializedMerkleTree } from '../../matching/types';
import { hash } from '@energyweb/greenproof-merkle-tree';
import { BlockchainConfig } from '../types';
import type { VotingService } from './voting.service';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class BlockchainVotingService implements VotingService{
  private provider: JsonRpcProvider;
  private contract: MatchVoting;
  private wallet: Wallet;
  private logger = new PinoLogger({renameContext: BlockchainVotingService.name });

  constructor(private readonly config: BlockchainConfig) {
    this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcHost);
    this.wallet = new ethers.Wallet(this.config.workerPrivateKey, this.provider);
    this.contract = MatchVoting__factory.connect(this.config.contractAddress, this.provider.getSigner());
    this.contract.connect(this.wallet);
  }

  public async vote(matchingInput: MatchingInput, matchingResult: {merkleTree: SerializedMerkleTree, matchingResult: MatchingOutput}) {
    const inputHash = hash(JSON.stringify(matchingInput), 'MATCHING_INPUT');

    this.logger.info(`Voting for input hash: ${inputHash}`);
    await this.contract.vote(inputHash, JSON.stringify(matchingResult.merkleTree));
    this.logger.info(`Vote for ${inputHash} sent.`);
  }
}