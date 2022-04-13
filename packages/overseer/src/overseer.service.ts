import type { JsonRpcProvider } from '@ethersproject/providers';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Wallet } from 'ethers';
import { ethers } from 'ethers';
import type { SampleContract} from './contracts/types';
import { SampleContract__factory } from './contracts/types';
import type { TypedEvent, TypedListener } from './contracts/types/common';
import { EventListeners } from './types';

interface BlockchainConfig {
  rpcHost: string;
  contractAddress: string;
  overseerPrivateKey: string;
}

@Injectable()
export class OverseerService implements OnApplicationBootstrap {
  private provider: JsonRpcProvider;
  private contract: SampleContract;
  private wallet: Wallet;

  constructor(private config: BlockchainConfig, private listeners: EventListeners, private getLastHandledBlockNumber: Function) {
    this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcHost);
    this.wallet = new ethers.Wallet(this.config.overseerPrivateKey, this.provider);
    this.contract = SampleContract__factory.connect(this.config.contractAddress, this.provider.getSigner());
    this.contract.connect(this.wallet);
  }

  onApplicationBootstrap() {
    this.handleMissedEvents(this.listeners, this.getLastHandledBlockNumber);
    this.registerEventListeners(this.listeners);
  }

  public async testFunction() {
    await this.contract.interestingFunction();
  }

  private async handleMissedEvents(listeners: EventListeners, getLastHandledBlockNumber:Function) {
    const lastBlockNumber = await getLastHandledBlockNumber();
    const eventNames = Object.keys(listeners);
    const events = await this.getUnhandledEvents(lastBlockNumber, eventNames);
    events.forEach(event => {
      if (event.event) {
        listeners[event.event].forEach(listener => {
          listener(event.args);
        });
      }
    });
  }

  private async getUnhandledEvents(lastBlockNumber: number, eventNames: string[]) {
    const allEvents = [];

    await Promise.all(eventNames.map(async (eventName) => {
      const eventsFilter = this.contract.filters[eventName]();
      const events = await this.contract.queryFilter(eventsFilter, lastBlockNumber);
      allEvents.push(...events);
    }));

    return allEvents;
  }

  private registerEventListeners(listenersToRegister: EventListeners) {
    Object.entries(listenersToRegister).forEach(([eventName, listeners]) => {
      listeners.forEach(listener => {
        this.contract.on(eventName, listener as TypedListener<TypedEvent<any, any>>);
      });
    });
  }
}
