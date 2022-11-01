import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createMerkleTree, stringify, verify, createPreciseProof, hash } from '@energyweb/greenproof-merkle-tree';
import { providers, Wallet } from 'ethers';
import type { Config } from '@energyweb/greenproof-ddhub-client';
import { DDHubClient } from '@energyweb/greenproof-ddhub-client';
import * as Joi from 'joi';
import type { VotingFacet} from '@energyweb/greenproof-contracts';
import { VotingFacet__factory } from '@energyweb/greenproof-contracts';

const configSchema = Joi.object<WorkerConfig>({
  privateKey: Joi.string().required().not().empty(),
  diamondContractAddress: Joi.string().required().not().empty(),
  rpcUrl: Joi.string().required().not().empty(),
  port: Joi.number().optional().default(3000),
});

type WorkerConfig = {
  privateKey: string;
  diamondContractAddress: string;
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
  hash: typeof hash;
};

type Runtime = {
  merkleTree: MerkleTree;
  getVotingContract: () => VotingFacet;
  getDDhubClient: () => DDHubClient,
};

type CallBack = (runtime: Runtime) => Promise<void>;

export class GreenProofWorker {
  private provider: providers.JsonRpcProvider;
  private privateKey: string;
  private diamondContractAddress: string;
  private merkleTree: MerkleTree;
  private port: number;
  private _ddhubClient: DDHubClient | null = null;

  constructor(config: WorkerConfig) {
    const { privateKey, rpcUrl, diamondContractAddress, port } = this.validateConfig(config);
    this.provider = new providers.JsonRpcProvider(rpcUrl);
    this.privateKey = privateKey;
    this.diamondContractAddress = diamondContractAddress;

    this.merkleTree = { createMerkleTree, stringify, verify, createPreciseProof, hash };
    this.port = port ?? 3030;
  }

  public getDDhubClient = () => {
    if (!this._ddhubClient) {
      throw new Error('DDHub communication not enabled. Please use "enableDDHubCommunication" method!');
    }
    return this._ddhubClient;
  };

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

  private getContractWithSigner = (): VotingFacet => {
    const signer = new Wallet(this.privateKey, this.provider);
    const contract = VotingFacet__factory.connect(
      this.diamondContractAddress,
      this.provider.getSigner(),
    );
    return contract.connect(signer);
  };

  async start(cb: CallBack) {
    const app = await NestFactory.create(AppModule);
    await app.listen(this.port);
    await cb({
      merkleTree: this.merkleTree,
      getVotingContract: this.getContractWithSigner,
      getDDhubClient: this.getDDhubClient,
    });
  }
}
