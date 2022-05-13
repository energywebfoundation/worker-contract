import type { DynamicModule, ForwardReference, Type } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { MatchingResultFacade } from './matching-result';
import { MatchingDataFacade } from './matching-data';
import type { MatchingAlgorithm} from '.';
import { VotingFacade} from '.';
import { MatchingFacade} from '.';
import { MatchingModule } from '.';
import { NestFactory } from '@nestjs/core';
import { VotingServiceForTests } from './voting/voting-service/voting-for-tests.service';
import { VotingService } from './voting/voting-service/voting.service';

type NestModuleType = Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference;

export class WorkerBuilder {
  private dataModule?: NestModuleType;
  private resultModule?: NestModuleType;
  private matchingAlgorithm?: MatchingAlgorithm;
  private votingModule?: NestModuleType;

  public constructor() {}

  public setDataModule(mod: NestModuleType): WorkerBuilder {
    this.dataModule = mod;

    return this;
  }

  public setDataSource(source: MatchingDataFacade): WorkerBuilder {
    @Module({
      providers: [{ provide: MatchingDataFacade, useValue: source }],
      exports: [MatchingDataFacade],
    })
    class MatchingDataModule {}

    this.dataModule = MatchingDataModule;

    return this;
  }

  public setResultModule(mod: NestModuleType): WorkerBuilder {
    this.resultModule = mod;

    return this;
  }

  public setResultSource(source: MatchingResultFacade): WorkerBuilder {
    @Module({
      providers: [{ provide: MatchingResultFacade, useValue: source }],
      exports: [MatchingResultFacade],
    })
    class MatchingResultModule {}

    this.resultModule = MatchingResultModule;

    return this;
  }

  public setMatchingAlgorithm(matchingAlgorithm: MatchingAlgorithm): WorkerBuilder {
    this.matchingAlgorithm = matchingAlgorithm;

    return this;
  }

  public setVotingModule(config: {rpcHost: string, contractAddress: string, workerPrivateKey: string}): WorkerBuilder {
    @Module({
      providers: [
        { provide: VotingService,
          useClass: VotingServiceForTests,
        },
        VotingFacade,
      ],
      exports: [VotingFacade],
    })
    class VotingModule {}

    this.votingModule = VotingModule;

    return this;
  }

  public async compile(): Promise<MatchingFacade> {
    if (!this.dataModule) {
      throw new Error('Data module/source not set');
    }

    if (!this.resultModule) {
      throw new Error('Result module/source not set');
    }

    if (!this.matchingAlgorithm) {
      throw new Error('Matching algorithm not set');
    }

    if (!this.votingModule) {
      throw new Error('Voting module not set');
    }

    @Module({
      imports: [
        MatchingModule.register({
          dependendencies: [
            this.dataModule,
            this.resultModule,
            this.votingModule,
          ],
          matchingAlgorithm: this.matchingAlgorithm,
        }),
      ],
    })
    class AppModule {}

    const app = await NestFactory.create(AppModule);
    const matchingFacade = await app.get(MatchingFacade);

    return matchingFacade;
  }
}
