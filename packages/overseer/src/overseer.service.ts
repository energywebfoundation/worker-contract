import type { JsonRpcProvider } from '@ethersproject/providers';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Wallet } from 'ethers';
import { ethers } from 'ethers';
import { PinoLogger } from 'nestjs-pino';
import type { MatchVoting } from '@energyweb/greenproof-voting-contract';
import { MatchVoting__factory } from '@energyweb/greenproof-voting-contract';
import { EventListeners } from './types';

interface BlockchainConfig {
  rpcHost: string;
  contractAddress: string;
  overseerPrivateKey: string;
}

@Injectable()
export class OverseerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private provider: JsonRpcProvider;
  private contract: MatchVoting;
  private wallet: Wallet;
  private logger = new PinoLogger({});

  constructor(
    private config: BlockchainConfig,
    private listeners: EventListeners,
    private getLastHandledBlockNumber: () => Promise<number>,
    private saveLastHandledBlockNumber: (blockNumber: number) => Promise<void>) {

    this.logger.setContext(OverseerService.name);

    this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcHost);
    this.wallet = new ethers.Wallet(this.config.overseerPrivateKey, this.provider);
    this.contract = MatchVoting__factory.connect(this.config.contractAddress, this.provider.getSigner());
    this.contract.connect(this.wallet);
  }

  async onApplicationBootstrap() {
    await this.handleMissedEvents(this.listeners, this.getLastHandledBlockNumber);
    await this.registerEventListeners(this.listeners);
  }

  onApplicationShutdown() {
    Object.entries(this.listeners).forEach(([eventName, listeners]) => {
      listeners.forEach(listener => {
        this.contract.off(eventName as any, listener as any);
      });
    });
  }

  private async handleMissedEvents(listeners: EventListeners, getLastHandledBlockNumber: Function) {
    this.logger.info('Handling events missed while the app was down.');

    const lastBlockNumber = await getLastHandledBlockNumber();
    const eventNames = Object.keys(listeners);
    const events = await this.getUnhandledEvents(lastBlockNumber, eventNames);
    events.forEach(event => {
      if (event.event) {
        listeners[event.event].forEach(listener => {
          listener(event);
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

  private async registerEventListeners(listenersToRegister: EventListeners) {
    this.logger.info(`Registering event listeners: ${Object.keys(listenersToRegister)}`);

    const startBlockNumber = await this.provider.getBlockNumber();

    Object.entries(listenersToRegister).forEach(([eventName, listeners]) => {
      listeners.forEach(listener => {
        // Arguments is the array with event args followed by whole event.
        // In order to get the whole event we have to get the last item in the array
        this.contract.on(eventName as any, async (argsWithEvent) => {
          const event = argsWithEvent[argsWithEvent.length - 1];
          const blockNumber = event.blockNumber;

          if (blockNumber <= startBlockNumber) {
            return;
          }
          await this.saveLastHandledBlockNumber(blockNumber);
          listener(event);
        });

      });
    });

    this.logger.info('Registering event listeners completed.');
  }
}
