import type { JsonRpcProvider } from '@ethersproject/providers';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Wallet } from 'ethers';
import { BigNumber } from 'ethers';
import { ethers } from 'ethers';
import { PinoLogger } from 'nestjs-pino';
import type { VotingFacet } from '@energyweb/greenproof-contracts';
import { VotingFacet__factory } from '@energyweb/greenproof-contracts/dist';
import {EventEmitter2} from '@nestjs/event-emitter';
import { ContractEvent, parseEventArgs, WinningMatchEvent } from './events';

interface BlockchainConfig {
  rpcHost: string;
  contractAddress: string;
  overseerPrivateKey: string;
}

@Injectable()
export class OverseerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private provider: JsonRpcProvider;
  private contract: VotingFacet;
  private wallet: Wallet;
  private logger = new PinoLogger({});

  constructor(
    private config: BlockchainConfig,
    private getLastHandledBlockNumber: () => Promise<number>,
    private saveLastHandledBlockNumber: (blockNumber: number) => Promise<void>,
    private eventEmitter: EventEmitter2,
  ) {

    this.logger.setContext(OverseerService.name);

    this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcHost);
    this.wallet = new ethers.Wallet(this.config.overseerPrivateKey, this.provider);
    this.contract = VotingFacet__factory.connect(this.config.contractAddress, this.provider.getSigner());
    this.contract.connect(this.wallet);
  }

  async onApplicationBootstrap() {
    // @Note: event listeners (EventEmitter2) are registered on onApplicationBootstrap, we need to handle it after it
    setTimeout(() => {
      this.handleMissedEvents(this.getLastHandledBlockNumber);
      this.registerEventListeners();
    }, 5000);
  }

  onApplicationShutdown() {
    this.contract.off(this.contract.filters.WinningMatch(), this.handleWinningMatchEvent);
  }

  public async cancelExpiredVotings(): Promise<void> {
    await this.contract.cancelExpiredVotings();
  }

  private async handleMissedEvents(getLastHandledBlockNumber: Function) {
    this.logger.info('Handling events missed while the app was down.');

    const lastBlockNumber = await getLastHandledBlockNumber();
    const winningMatchEvents = await this.getUnhandledWinningMatchEvents(lastBlockNumber);

    winningMatchEvents.forEach(this.emitEvent.bind(this));

    this.logger.info('Publishing missed events completed.');
  }

  private async getUnhandledWinningMatchEvents(lastBlockNumber: number) {
    this.logger.info('Getting unhandled events.');

    const eventsFilter = this.contract.filters.WinningMatch();
    const events = await this.contract.queryFilter(eventsFilter, lastBlockNumber);

    this.logger.info(`Got ${events.length} unhandled events.`);
    return events;
  }

  private async registerEventListeners() {
    this.logger.info('Registering event listeners.');


    this.contract.on(this.contract.filters.WinningMatch(), (...ev) => {
      this.handleWinningMatchEvent(...ev);
    });

    this.logger.info('Registering event listeners completed.');
  }

  private async handleWinningMatchEvent(...argsWithEvent: any) {
    const lastHandledBlockNumber = await this.getLastHandledBlockNumber();
    // Arguments is the array with event args followed by whole event.
    // In order to get the whole event we have to get the last item in the array
    const event = argsWithEvent[argsWithEvent.length - 1];
    const blockNumber = event.blockNumber;

    if (blockNumber <= lastHandledBlockNumber) {
      return;
    }

    this.emitEvent(event);
    await this.saveLastHandledBlockNumber(blockNumber);
  }

  private emitEvent(event: any) {
    if (!event?.args) {
      return;
    }

    const { matchInput, matchResult, voteCount } = parseEventArgs(event.args as any);

    const eventToPublish = new WinningMatchEvent({
      transactionHash: event.transactionHash,
      matchInput: matchInput.hash,
      matchResult,
      voteCount: BigNumber.from(voteCount).toNumber(),
    });

    this.eventEmitter.emit(ContractEvent.WinningMatch, eventToPublish);
  }
}
