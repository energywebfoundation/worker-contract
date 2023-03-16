import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { setTimeout as asyncSetTimeout } from 'timers/promises';
import { InputFacade } from './input/input.facade';
import { MatchingFacade } from './matching/matching.facade';
import { ExternalResultFacade } from './results/external-results.facade';
import { appConfig, Env } from './config/app-config';
import { EventEmitter2 } from '@nestjs/event-emitter';

const processInterval = appConfig.nodeEnv === Env.E2E ? 500 : 5_000;

const MATCHING_ENDED_GRACEFULLY = 'MATCHING_ENDED_GRACEFULLY';

@Injectable()
export class AppService implements OnApplicationBootstrap, OnModuleDestroy {
  private logger = new PinoLogger({ renameContext: AppService.name });
  private matchingAbortController = new AbortController();
  private inputSyncTimeoutId: NodeJS.Timer | null = null;
  private resultsSyncTimeoutId: NodeJS.Timer | null = null;


  constructor(
    private matchingFacade: MatchingFacade,
    private inputFacade: InputFacade,
    private resultFacade: ExternalResultFacade,
    private eventEmitter: EventEmitter2,
  ) {
  }

  public onApplicationBootstrap() {
    this.startTasks();
  }

  public async onModuleDestroy() {
    console.log('Worker started to gracefully stop');
    await this.stopTasks();
    console.log('Worker gracefully stopped');
  }

  async startInputSynchronization() {
    this.inputSyncTimeoutId = setTimeout(async () => {
      try {
        await this.inputFacade.synchronizeInputs();
      } catch (err) {
        this.logger.error(err);
      }
      await asyncSetTimeout(1000);
      this.logger.info('Restarting inputs synchronization after crash');
      this.startInputSynchronization();
    }, processInterval);
  }

  async startResultSynchronization() {
    this.resultsSyncTimeoutId = setTimeout(async () => {
      try {
        await this.resultFacade.synchronizeExternalResults();
      } catch (err) {
        this.logger.error(err);
      }
      await asyncSetTimeout(1000);
      this.logger.info('Restarting results synchronization after crash');
      this.startResultSynchronization();
    }, processInterval);
  }

  async startMatching() {
    while (!this.matchingAbortController.signal.aborted) {
      try {
        await this.matchingFacade.match();
      } catch (err) {
        this.logger.info('Matching failed with error');
        this.logger.error(err);
      } finally {
        await asyncSetTimeout(processInterval, null, {
          signal: this.matchingAbortController.signal,
        }).catch(() => console.log('Matching timeout aborted'));
      }
    }
    this.eventEmitter.emit(MATCHING_ENDED_GRACEFULLY);
  }

  startTasks() {
    this.startInputSynchronization();
    this.startResultSynchronization();
    this.startMatching();
  }

  async stopTasks() {
    if (!this.matchingAbortController.signal.aborted) {
      console.log('Stopping matching process');
      this.matchingAbortController.abort();
      await this.eventEmitter.waitFor(MATCHING_ENDED_GRACEFULLY);
      console.log('Matching process stopped');
    }
    if (this.resultsSyncTimeoutId) {
      console.log('Stopping results sync process');
      clearTimeout(this.resultsSyncTimeoutId);
      console.log('Results sync process stopped');
    }

    if (this.inputSyncTimeoutId) {
      console.log('Stopping input sync process');
      clearTimeout(this.inputSyncTimeoutId);
      console.log('Input sync process stopped');

    }
  }
}
