import type { BatteryState, InputDTO, MatchingResult, PreferenceDTO } from 'types';
import { EnergyType } from 'types';
import { MatchingService } from '../src/matching/matching/matching.service';
import { VotingManager } from '../src/matching/voting-manager/types';
import { MerkleTree } from '../src/matching/merkleTree.service';
import { InputFacade } from '../src/input/input.facade';
import type { InputInMemorySource } from '../src/input/input-inmemory.source';
import { Test } from '@nestjs/testing';
import { InputSource } from '../src/input/types';
import { InputInMemoryModule } from '../src/input/input.module';
import { MatchingInMemoryModule } from '../src/matching/matching.module';
import { MATCHING_RECEIVERS_TOKEN } from '../src/matching/types';
import { DatabaseKyselyModuleForTesting } from '../src/kysely/db.module';
import { DatabaseService } from '../src/kysely/db.service';
import { ExternalResultFacade } from '../src/results/external-results.facade';
import { ExternalResultModuleInMemory } from '../src/results/external-results.module';
import { ResultSource } from '../src/results/types';
import type { ExternalResultInMemorySource } from '../src/results/results-inmemory.source';
import { up as migrationsUp } from '../db/migration-up';

export class MatchTest {
  private inputSource!: InputInMemorySource;
  private resultSource!: ExternalResultInMemorySource;
  private inputFacade!: InputFacade;
  private matchingService!: MatchingService;
  private merkleTree!: MerkleTree;
  private externalResults!: ExternalResultFacade;
  private latestMatchingResult: MatchingResult | null = null;
  private consensusResultHashes: Record<string, string> = {};

  public async setup(runMigrations = false) {
    const that = this;

    const mod = await Test
      .createTestingModule({
        imports: [
          InputInMemoryModule,
          MatchingInMemoryModule,
          ExternalResultModuleInMemory,
          DatabaseKyselyModuleForTesting.forRoot(),
        ],
      })
      .overrideProvider(MATCHING_RECEIVERS_TOKEN)
      .useValue([
        async (result: any) => { this.latestMatchingResult = result.result; },
      ])
      .overrideProvider(VotingManager)
      .useValue({
        async getConsensusResultHash(inputHash: string) {
          return that.consensusResultHashes[inputHash] ?? null;
        },
        async wasConsensusReached(inputHash: string){
          return Boolean(that.consensusResultHashes[inputHash] ?? null);
        },
      })
      .compile();


    await mod.init();

    const dbService = mod.get(DatabaseService);
    await dbService.clean();

    if (runMigrations) {
      await migrationsUp();
    }

    this.inputSource = mod.get(InputSource);
    this.resultSource = mod.get(ResultSource);
    this.inputFacade = mod.get(InputFacade);
    this.externalResults = mod.get(ExternalResultFacade);
    this.merkleTree = mod.get(MerkleTree);
    this.matchingService = mod.get(MatchingService);
  }

  public async match(): Promise<MatchingResult | null> {
    this.latestMatchingResult = null;

    await this.matchingService.match();

    return this.latestMatchingResult;
  }

  public async addInputAndFakeBattery(data: MatchingData, battery: Record<string, BatteryState>) {
    const input = this.matchingDataToInput(data);
    const inputHash = '0x' + this.merkleTree.merkleTree.hash(this.merkleTree.merkleTree.stringify(input as any)).toString('hex');
    const result = {
      batteryStore: {
        leaf: Math.random().toString(),
        proof: Math.random().toString(),
        states: battery,
      },
      inputData: {
        batteryDischarges: [],
        generations: [],
      },
      resultData: {
        leftoverConsumptions: [],
        leftoverGenerations: [],
        matches: [],
      },
      timestamp: input.timestamp.end,
      inputHash,
    };

    const resultHash = this.merkleTree.createTree(
      result.resultData,
      result.inputData,
      result.batteryStore.states,
    ).rootHash;

    this.inputSource.addInput(input);
    this.resultSource.addResult({
      ...result,
      resultHash,
    });
    this.consensusResultHashes[inputHash] = resultHash;

    await this.externalResults.synchronizeExternalResults();
    await this.inputFacade.synchronizeInputs();
  }

  public async addRawInput(input: InputDTO) {
    await new Promise(resolve => setTimeout(resolve, 1));
    this.inputSource.addInput(input);
    await new Promise(resolve => setTimeout(resolve, 1));

    await this.inputFacade.synchronizeInputs();
  }

  public async addInput(data: MatchingData) {
    await new Promise(resolve => setTimeout(resolve, 25));
    this.inputSource.addInput(this.matchingDataToInput(data));
    await new Promise(resolve => setTimeout(resolve, 25));

    await this.inputFacade.synchronizeInputs();
  }

  public generation(assetId: string, volume: number) {
    return {
      countryId: 'c1',
      regionId: 'r1',
      siteId: 's1',
      meterId: 'm1',
      end: new Date(0),
      start: new Date(1),
      energyType: EnergyType.Biomass,
      assetId,
      volume,
    };
  }

  public battery(assetId: string, volume: number, soc: number) {
    return {
      countryId: 'c1',
      regionId: 'r1',
      siteId: 's1',
      meterId: 'm1',
      soc,
      assetId,
      volume,
    };
  }

  public consumption(assetId: string, volume: number) {
    return {
      countryId: 'c1',
      regionId: 'r1',
      siteId: 's1',
      meterId: 'm1',
      assetId,
      volume,
    };
  }

  private matchingDataToInput(input: MatchingData): InputDTO {
    const { generations, consumptions, batteries } = input;
    const preferences = [...consumptions, ...batteries]
      .map(c => c[0])
      .reduce((p, id) => ({
        ...p,
        [id]: {
          energySourcePriority: {},
          matchInternationally: false,
          matchRegionally: false,
          matchNationally: false,
        },
      }), {} as Record<string, PreferenceDTO>);

    const currentInputCount = this.inputSource.inputs.length;
    const date = input.timestamp
      ? input.timestamp
      : new Date(Date.now() + currentInputCount * 15 * 60 * 1000);

    return {
      timestamp: {
        start: date,
        end: date,
      },
      consumptions: consumptions.map(([assetId, volume]) => this.consumption(assetId, volume)),
      generations: generations.map(([assetId, volume]) => this.generation(assetId, volume)),
      batteries: batteries.map(([assetId, volume, soc]) => this.battery(assetId, volume, soc)),
      preferences,
      carbonIntensities: input.carbon ?? {},
      gridRenewablePercentage: input.renewable ?? {},
    };
  }
}

export interface MatchingData {
  generations: [string, number][];
  consumptions: [string, number][];
  batteries: [string, number, number][];
  carbon?: InputDTO['carbonIntensities'],
  renewable?: InputDTO['gridRenewablePercentage'],
  timestamp?: Date;
}
