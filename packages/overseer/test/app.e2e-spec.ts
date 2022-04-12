import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { OverseerModule } from '../src/overseer.module';
import { exampleConfig } from '../src/example/example';
import type { SampleContract} from '../src/contracts/types';
import { SampleContract__factory } from '../src/contracts/types';
import { ethers } from 'ethers';

jest.setTimeout(12000);

describe('Overseer (e2e)', () => {
  let app: INestApplication;
  let contract: SampleContract;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OverseerModule.register(exampleConfig)],
    }).compile();

    app = moduleFixture.createNestApplication();
    const provider = new ethers.providers.JsonRpcProvider(exampleConfig.blockchainConfig.rpcHost);
    contract = SampleContract__factory.connect(exampleConfig.blockchainConfig.contractAddress, provider.getSigner());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should run', async () => {
    await contract.interestingFunction();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });
});
