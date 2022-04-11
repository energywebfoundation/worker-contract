import { Provider } from '@ethersproject/abstract-provider';
import type { JsonRpcProvider } from '@ethersproject/providers';
import { Injectable } from '@nestjs/common';
import type { Contract, EventFilter, Wallet } from 'ethers';
import { ethers } from 'ethers';
import type { Greeter} from './contracts/types';
import { Greeter__factory } from './contracts/types';
import type { TypedEvent, TypedListener } from './contracts/types/common';

interface BlockchainConfig {
  rpcHost: string;
  contractAddress: string;
  overseerPrivateKey: string;
}

interface DDHub {
  getLastHandledBlockNumber(): number;
}

type EventListeners = Map<string, Function>

@Injectable()
export class OverseerService {
  private lastBlockNumber: number = 0;
  private provider: JsonRpcProvider;
  private greeter: Greeter;
  private wallet: Wallet;

  constructor(private config: BlockchainConfig, private ddHub: DDHub, listeners: EventListeners) {
    this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcHost);
    this.wallet = new ethers.Wallet(this.config.overseerPrivateKey, this.provider);
    this.greeter = Greeter__factory.connect(this.config.contractAddress, this.provider.getSigner());
    this.greeter.connect(this.wallet);

    this.handleMissedEvents(listeners);
    this.registerEventListeners(listeners);
    // this.listenOnEvent();
  }

  public async greet() {
    await this.greeter.greet();
    const eventsFilter = this.greeter.filters.Greeting();
    const events = await this.greeter.queryFilter(eventsFilter);
  }

  private async listenOnEvent() {
    // this.greeter.on(this.greeter.filters.Greeting(), (greeting) => {
    //   console.log(greeting);
    // });
    this.greeter.on('Greeting', (ev) => { console.log(ev); });
  }

  private async handleMissedEvents(listeners: EventListeners) {
    this.lastBlockNumber = await this.ddHub.getLastHandledBlockNumber();
    const events = await this.getUnhandledEvents();
    events.forEach(event => {
      if (event.event) {
        listeners.get(event.event!)!(event);
      }
    });
  }

  private async getUnhandledEvents() {
    const eventsFilter = this.greeter.filters.Greeting();
    const events = await this.greeter.queryFilter(eventsFilter, this.lastBlockNumber);
    return events;
  }

  private registerEventListeners(listeners: EventListeners) {
    listeners.forEach((listener: Function, eventName: any) => {
      this.greeter.on(eventName, listener as TypedListener<TypedEvent<any, any>>);
    });
  }
}
