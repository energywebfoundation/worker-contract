import * as fs from 'fs';
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ContractEvent, WinningMatchEvent } from './events';

/*
Note: leaving this as example
 */

@Injectable()
export class ContractEventsListener {

  @OnEvent(ContractEvent.WinningMatch)
  public async handleWinningMatchEvent(ev: WinningMatchEvent) {
    console.log(ev);
  }
}


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