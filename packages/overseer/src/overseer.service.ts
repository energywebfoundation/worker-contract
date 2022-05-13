import type { JsonRpcProvider } from '@ethersproject/providers';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Wallet } from 'ethers';
import { ethers } from 'ethers';
import { PinoLogger } from 'nestjs-pino';
import type { MatchVoting} from '@energyweb/greenproof-voting-contract';
import { MatchVoting__factory } from '@energyweb/greenproof-voting-contract';
import type { TypedEvent, TypedListener } from '@energyweb/greenproof-voting-contract';
import { EventListeners } from './types';


interface BlockchainConfig {
  rpcHost: string;
  contractAddress: string;
  overseerPrivateKey: string;
}

@Injectable()
export class OverseerService implements OnApplicationBootstrap {
  private provider: JsonRpcProvider;
  private contract: MatchVoting;
  private wallet: Wallet;
  private logger = new PinoLogger({});

  constructor(private config: BlockchainConfig, private listeners: EventListeners, private getLastHandledBlockNumber: Function) {
    this.logger.setContext(OverseerService.name);

    this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcHost);
    this.wallet = new ethers.Wallet(this.config.overseerPrivateKey, this.provider);
    this.contract = MatchVoting__factory.connect(this.config.contractAddress, this.provider.getSigner());
    this.contract.connect(this.wallet);
  }

  onApplicationBootstrap() {
    this.handleMissedEvents(this.listeners, this.getLastHandledBlockNumber);
    this.registerEventListeners(this.listeners);
  }

  private async handleMissedEvents(listeners: EventListeners, getLastHandledBlockNumber:Function) {
    this.logger.info('Handling events missed while the app was down.');

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

    this.logger.info('Handling missed events completed.');
  }

  private async getUnhandledEvents(lastBlockNumber: number, eventNames: string[]) {
    this.logger.info('Getting unhandled events.');
    const allEvents: any[] = [];

    await Promise.all(eventNames.map(async (eventName) => {
      const eventsFilter = (this.contract.filters as any)[eventName]();
      const events = await this.contract.queryFilter(eventsFilter, lastBlockNumber);
      allEvents.push(...events);
    }));

    this.logger.info(`Got ${allEvents.length} unhandled events.`);
    return allEvents;
  }

  private registerEventListeners(listenersToRegister: EventListeners) {
    this.logger.info(`Registering event listeners: ${Object.keys(listenersToRegister)}`);

    Object.entries(listenersToRegister).forEach(([eventName, listeners]) => {
      listeners.forEach(listener => {
        this.contract.on(eventName as any, listener as TypedListener<TypedEvent<any, any>>);
      });
    });

    this.logger.info('Registering event listeners completed.');
  }
}
