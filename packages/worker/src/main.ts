import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { MatchVoting } from '@energyweb/greenproof-voting-contract';
import { MatchVoting__factory } from '@energyweb/greenproof-voting-contract';
import { createMerkleTree, stringify, verify, createPreciseProof } from '@energyweb/greenproof-merkle-tree';
import { providers, Wallet } from 'ethers';
import type { Config } from '@energyweb/greenproof-ddhub-client';
import { DDHubClient } from '@energyweb/greenproof-ddhub-client';
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

type DDHUBConfig = {
  appNamespace: string;
  debugMode: boolean;
  channelConfig: Config[];
  ddhubUrl: string;
}

export type MerkleTree = {
  createMerkleTree: typeof createMerkleTree;
  stringify: typeof stringify;
  verify: typeof verify;
  createPreciseProof: typeof createPreciseProof;
};

type Runtime = {
  merkleTree: MerkleTree;
  getVotingContract: () => MatchVoting;
  ddhubClient: DDHubClient,
};

type CallBack = (runtime: Runtime) => Promise<void>;

export class GreenProofWorker {
  private provider: providers.JsonRpcProvider;
  private privateKey: string;
  private votingContractAddress: string;
  private merkleTree: MerkleTree;
  private port: number;
  private _ddhubClient: DDHubClient | null = null;

  constructor(config: WorkerConfig) {
    const { privateKey, rpcUrl, votingContractAddress, port } = this.validateConfig(config);
    this.provider = new providers.JsonRpcProvider(rpcUrl);
    this.privateKey = privateKey;
    this.votingContractAddress = votingContractAddress;

    this.merkleTree = { createMerkleTree, stringify, verify, createPreciseProof };
    this.port = port ?? 3030;
  }

  public get ddhubClient() {
    if (!this._ddhubClient) {
      throw new Error('DDHub communication not enabled. Please use "enableDDHubCommunication" method!');
    }
    return this._ddhubClient;
  }

  public async enableDDHubCommunication({appNamespace, channelConfig, debugMode, ddhubUrl}: DDHUBConfig) {
    this._ddhubClient = new DDHubClient({
      config: channelConfig,
      ddhubUrl,
      ownerNamespace: appNamespace,
      privateKey: this.privateKey,
      debugModeOn: debugMode ?? false,
    });
    await this._ddhubClient.setup();
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

  private getContractWithSigner = (): MatchVoting => {
    const signer = new Wallet(this.privateKey, this.provider);
    const contract = MatchVoting__factory.connect(
      this.votingContractAddress,
      this.provider.getSigner(),
    );
    return contract.connect(signer);
  };

  private async registerWorkerAsAVoter() {
    const workerAddress = this.getContractWithSigner().address;
    const isWorker = await this.getContractWithSigner().isWorker(workerAddress);
    if (isWorker) return;
    const tx = await this.getContractWithSigner().addWorker(workerAddress);
    await tx.wait();
  }

  async start(cb: CallBack) {
    const app = await NestFactory.create(AppModule);
    await app.listen(this.port);
    await this.registerWorkerAsAVoter();
    await cb({
      merkleTree: this.merkleTree,
      getVotingContract: this.getContractWithSigner,
      ddhubClient: this.ddhubClient,
    });
  }
}
