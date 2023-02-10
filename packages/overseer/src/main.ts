import * as fs from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { start } from '.';
config({ path: join(__dirname, '..', '.env') });


async function getLastHandledBlockNumber(): Promise<number> {
  const path = join(__dirname, 'last_block.txt');

  if (fs.existsSync(path)) {
    const lastBlockNumber = fs.readFileSync(path, 'utf-8');
    return parseInt(lastBlockNumber, 10);
  }
  return 0;
}

async function saveLastHandledBlockNumber(blockNumber: number): Promise<void> {
  fs.writeFileSync(join(__dirname, 'last_block.txt'), blockNumber.toString());
}

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
