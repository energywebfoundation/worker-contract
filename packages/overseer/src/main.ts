import { join } from 'path';
import { config } from 'dotenv';
import { start } from '.';
import { getLastHandledBlockNumber, saveLastHandledBlockNumber } from './example-handlers';
config({ path: join(__dirname, '..', '.env') });

const port = process.env.PORT || 3000;
const blockchainConfig = {
  rpcHost: process.env.RPC_HOST!,
  contractAddress: process.env.CONTRACT_ADDRESS!,
  overseerPrivateKey: process.env.OVERSEER_PRIVATE_KEY!,
};

start({
  blockchainConfig,
  getLastHandledBlockNumber,
  saveLastHandledBlockNumber,
}, Number(port));
