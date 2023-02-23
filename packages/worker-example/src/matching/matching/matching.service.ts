import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { InputDTO } from 'types';
import { InputFacade } from '../../input/input.facade';
import { BatteryService, BatterySync } from '../battery/battery.service';
import { algorithm } from './algorithm';
import { MatchingResultService } from './matching-result.service';
import { MatchingTransformerService } from './matching-transformer.service';
import { MerkleTree } from '../merkleTree.service';
import type { MatchingResultReceiver } from '../types';
import { MATCHING_RECEIVERS_TOKEN } from '../types';

@Injectable()
export class MatchingService {
  private logger = new PinoLogger({ renameContext: MatchingService.name });

  constructor(
    private inputFacade: InputFacade,
    private merkleTree: MerkleTree,
    private batteryService: BatteryService,
    private matchingResultService: MatchingResultService,
    private matchingTransformer: MatchingTransformerService,
    @Inject(MATCHING_RECEIVERS_TOKEN)
    private receivers: MatchingResultReceiver[],
  ) {}

  public async match(): Promise<void> {
    await this.inputFacade.withInput(async (input) => {
      if (!input) {
        this.logger.debug('No input available');
        return;
      }

      const logTs = `[Input: ${input.timestamp.end.toISOString()}]`;

      const inputHash = this.hashInput(input);

      const { batterySync, batteryManager } = await this.batteryService.getManager(input, inputHash);

      if (batterySync === BatterySync.Synchronized) {
        // Skipping voting -> battery was synchronized, so we'll be voting on the next input
        this.logger.info(`${logTs} skipping matching and voting`);
        return;
      }

      this.logger.info(`${logTs} matching`);

      const algorithmInput = this.matchingTransformer.toAlgorithmInput(
        input,
        batteryManager,
      );
      const algorithmOutput = algorithm(algorithmInput);

      batteryManager.updateBatteryState(algorithmInput, algorithmOutput);

      const matchingResult =
        this.matchingTransformer.toMatchingResult(
          algorithmInput,
          algorithmOutput,
          input.carbonIntensities,
          input.gridRenewablePercentage,
          batteryManager.getBatteryStates(),
          inputHash,
        );

      this.logger.info(`${logTs} matching finished, sending to receivers`);

      for (const receiver of this.receivers) {
        this.logger.info(`${logTs} sending result to receiver ${receiver.name}`);
        await receiver({
          input,
          result: matchingResult,
        });
      }

      this.logger.info(`${logTs} saving battery store`);
      await this.matchingResultService.saveMatchingResult(matchingResult);
    });
  }

  private hashInput(input: InputDTO): string {
    return '0x' + this.merkleTree.merkleTree.hash(
      this.merkleTree.merkleTree.stringify({ ...(input as any) }),
    ).toString('hex');
  }
}
