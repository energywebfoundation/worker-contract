export interface BlockchainConfig {
  rpcHost: string;
  contractAddress: string;
  overseerPrivateKey: string;
}

export type EventListeners = Record<string, Function[]>;

export interface OverseerConfig {
  blockchainConfig: BlockchainConfig;
  listeners: EventListeners;
  getLastHandledBlockNumber: Function;
}


