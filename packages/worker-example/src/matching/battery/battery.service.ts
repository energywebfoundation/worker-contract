import { Injectable } from '@nestjs/common';
import type { InputDTO } from 'types';
import { BatteryManager } from './battery-manager';
import { PinoLogger } from 'nestjs-pino';
import { InputFacade } from '../../input/input.facade';
import { MatchingResultService } from '../matching/matching-result.service';
import { VotingManager } from '../voting-manager/types';

@Injectable()
export class BatteryService {
  private logger = new PinoLogger({ renameContext: BatteryService.name });

  constructor(
    private matchingResultService: MatchingResultService,
    private inputFacade: InputFacade,
    private votingManager: VotingManager,
  ) { }

  public async getManager(input: InputDTO, inputHash: string): Promise<GetManagerResult> {
    const logTs = `[Input: ${input.timestamp.end.toISOString()}]`;
    const previousResult = await this.matchingResultService.getPreviousMatchingResults(input.timestamp.end);

    if (previousResult) {
      this.logger.info(`${logTs} battery store available and correct`);

      return {
        batterySync: BatterySync.Ready,
        batteryManager: BatteryManager.fromInput(previousResult.batteryStore.states, input),
      };
    }

    this.logger.info(`${logTs} no local correct battery store. Downloading external store.`);

    const externalResults = await this.matchingResultService.getExternalResultForInput(inputHash);

    if (externalResults) {
      await this.matchingResultService.saveMatchingResult(externalResults);
      await this.inputFacade.markAsUnmatchedNewerThan(externalResults.timestamp);

      this.logger.info(`${logTs} external store exists, saved matching result and marked newer inputs as unmatched`);

      return {
        batterySync: BatterySync.Synchronized,
        batteryManager: null,
      };
    }

    this.logger.info(`${logTs} no external store available, start fresh`);

    return {
      batterySync: BatterySync.Ready,
      batteryManager: BatteryManager.fromInput(null, input),
    };
  }
}

type GetManagerResult =
  { batterySync: BatterySync.Ready; batteryManager: BatteryManager }
  | { batterySync: BatterySync.Synchronized; batteryManager: null };

export enum BatterySync {
  /** Battery synchronization was not necessary because its state was correct */
  Ready = 'ready',
  /** Battery synchronization happened, so voting should be skipped */
  Synchronized = 'synchronized',
}
