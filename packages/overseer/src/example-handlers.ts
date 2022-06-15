import type { EventListeners } from './types';
import * as fs from 'fs';
import { join } from 'path';

/*
Note: leaving this as example
 */

// Blockchain event arguments are stored in array indexed both by incremented numbers and strings
// e.g. Array [ '0': 'firstArg', '1': 'secondArg', 'firstKey': 'firstArg', 'secondKey': 'secondArg' ]
// We can filter out the number indexed keys and construct the object from the rest to parse the args.
const parseEventArgs = (eventArguments: Record<string, string>) =>
  Object.fromEntries(Object.entries(eventArguments).filter(
    ([k]) => !Number.isInteger(Number.parseInt(k, 10)),
  ));

export const listeners: EventListeners = {
  WinningMatch: [(event) => {
    if (!event.args) {
      console.debug(`No event arguments in event: ${event.event}`);
      return;
    }

    const { matchInput, matchResult, voteCount } = parseEventArgs(event.args);
    console.log({ matchInput });
    console.log({ matchResult });
    console.log({ voteCount });
  }],
};

export async function getLastHandledBlockNumber(): Promise<number> {
  const path = join(__dirname, 'last_block.txt');

  if (fs.existsSync(path)) {
    const lastBlockNumber = fs.readFileSync(path, 'utf-8');
    return parseInt(lastBlockNumber, 10);
  }
  return 0;
}

export async function saveLastHandledBlockNumber(blockNumber: number): Promise<void> {
  fs.writeFileSync(join(__dirname, 'last_block.txt'), blockNumber.toString());
}