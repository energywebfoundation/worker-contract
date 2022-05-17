import type { EventListeners } from './types';
import * as fs from 'fs';

export const listeners: EventListeners = {
  WinningMatch: [(...ev: any) => {
    // Note: leaving this as example
    const [matchInput, matchResult, voteCount] = ev;
    console.log({matchInput});
    console.log({matchResult});
    console.log({voteCount});
  }],
};

export async function getLastHandledBlockNumber(): Promise<number> {
  const path = __dirname + '/last_block.txt';
  if (fs.existsSync(path)) {
    const lastBlockNumber = fs.readFileSync(path, 'utf-8');
    return parseInt(lastBlockNumber, 10);
  }
  return 0;
}

export async function saveLastHandledBlockNumber(blockNumber: number): Promise<void> {
  fs.writeFileSync(__dirname + '/last_block.txt', blockNumber.toString());
}