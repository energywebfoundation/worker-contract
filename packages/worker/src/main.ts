import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { MatchVoting } from '@energyweb/greenproof-voting-contract';
import { MatchVoting__factory } from '@energyweb/greenproof-voting-contract';
import { createMerkleTree, stringify, verify } from '@energyweb/greenproof-merkle-tree';
import { providers, Wallet } from 'ethers';
import * as Joi from 'joi';

const configSchema = Joi.object<WorkerConfig>({
  privateKey: Joi.string().required().not().empty(),
  votingContractAddress: Joi.string().required().not().empty(),
  rpcUrl: Joi.string().required().not().empty(),
  port: Joi.number().optional().default(3000),
});

type WorkerConfig = {
  privateKey: string;
  votingContractAddress: string;
  rpcUrl: string;
  port?: number;
};

export type MerkleTree = {
  createMerkleTree: typeof createMerkleTree;
  stringify: typeof stringify;
  verify: typeof verify;
};

type Runtime = {
  merkleTree: MerkleTree;
  votingContract: MatchVoting;
};

type CallBack = (runtime: Runtime) => Promise<void>;

export class GreenProofWorker {
  votingContract: MatchVoting;
  merkleTree: MerkleTree;
  port: number;

  constructor(config: WorkerConfig) {
    const { privateKey, rpcUrl, votingContractAddress, port } = this.validateConfig(config);
    const provider = new providers.JsonRpcProvider(rpcUrl);
    const signer = new Wallet(privateKey, provider);
    this.votingContract = MatchVoting__factory.connect(
      votingContractAddress,
      signer,
    );
    this.merkleTree = { createMerkleTree, stringify, verify };
    this.port = port as number;
  }

  private validateConfig(config: WorkerConfig) {
    const { error, value } = configSchema.validate(config, { abortEarly: false });
    if (error) {
      console.error('Validation of worker config failed');
      throw error;
    }
    if (!value) {
      throw new Error('No configuration specified');
    }
    return value;
  }

  async start(cb: CallBack) {
    const app = await NestFactory.create(AppModule);
    await app.listen(this.port);
    await cb({
      merkleTree: this.merkleTree,
      votingContract: this.votingContract,
    });
  }
}
