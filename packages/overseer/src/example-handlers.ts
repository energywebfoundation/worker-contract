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
