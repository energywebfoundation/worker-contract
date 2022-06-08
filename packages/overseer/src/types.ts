import type {Event} from 'ethers';

export interface BlockchainConfig {
  rpcHost: string;
  contractAddress: string;
  overseerPrivateKey: string;
}

export type EventListeners = Record<string, [(event: Event) => any]>;

export interface OverseerConfig {
  blockchainConfig: BlockchainConfig;
  listeners: EventListeners;
  getLastHandledBlockNumber: () => Promise<number>;
  saveLastHandledBlockNumber: (blockNumber: number) => Promise<void>;
}
