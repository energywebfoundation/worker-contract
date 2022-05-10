import { start } from 'overseer';

start({
  blockchainConfig: {
    contractAddress: '',
    overseerPrivateKey: '',
    rpcHost: 'localhost:5432',
  },
  getLastHandledBlockNumber: () => 0,
  listeners: [],
});
