import { OverseerConfig, BlockchainConfig, EventListeners } from "../types";

export const localBlockchainConfig: BlockchainConfig = {
  rpcHost: 'http://localhost:8545',
  contractAddress: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
  overseerPrivateKey: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
};

export const exampleListeners: EventListeners = {
  'InterestingEvent' : [(ev: any) => { console.log(ev); }]
}

export const exampleConfig: OverseerConfig = {
  blockchainConfig: localBlockchainConfig,
  listeners: exampleListeners,
  getLastHandledBlockNumber: () => { return 0; }
}

