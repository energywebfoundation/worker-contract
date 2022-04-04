import { Test } from '@nestjs/testing';
import { MatchingDataService } from '../src/matching-data/matching-data.service';
import { MatchingDataInMemoryService} from '../src/matching-data/matching-data-in-memory-adapter/matching-data-in-memory.service';
import type { InputData } from '../src/matching-data/matching-data-in-memory-adapter/matching-data-in-memory.service';

enum ConsumptionDevice {
  A = 'CONSUMPTION_DEVICE_A',
  B = 'CONSUMPTION_DEVICE_B',
  C = 'CONSUMPTION_DEVICE_C',
}

enum GenerationDevice {
  A = 'GENERATION_DEVICE_A',
  B = 'GENERATION_DEVICE_B',
  C = 'GENERATION_DEVICE_C',
}

const testData: InputData = {
  consumptions: [
    {
      timestamp: new Date('2022-04-01T00:00:00.000Z'),
      deviceId: ConsumptionDevice.A,
      volume: 100,
    },
    {
      timestamp: new Date('2022-04-01T00:30:00.000Z'),
      deviceId: ConsumptionDevice.A,
      volume: 100,
    },
    {
      timestamp: new Date('2022-04-01T01:00:00.000Z'),
      deviceId: ConsumptionDevice.A,
      volume: 100,
    },
    {
      timestamp: new Date('2022-04-01T00:00:00.000Z'),
      deviceId: ConsumptionDevice.B,
      volume: 100,
    },
    {
      timestamp: new Date('2022-04-01T00:30:00.000Z'),
      deviceId: ConsumptionDevice.B,
      volume: 100,
    },
    {
      timestamp: new Date('2022-04-01T01:00:00.000Z'),
      deviceId: ConsumptionDevice.B,
      volume: 100,
    },
    {
      timestamp: new Date('2022-04-01T01:30:00.000Z'),
      deviceId: ConsumptionDevice.C,
      volume: 100,
    },
  ],
  generations: [
    {
      timestamp: new Date('2022-04-01T00:00:00.000Z'),
      deviceId: GenerationDevice.A,
      volume: 50,
    },
    {
      timestamp: new Date('2022-04-01T00:30:00.000Z'),
      deviceId: GenerationDevice.A,
      volume: 50,
    },
    {
      timestamp: new Date('2022-04-01T01:00:00.000Z'),
      deviceId: GenerationDevice.A,
      volume: 50,
    },
    {
      timestamp: new Date('2022-04-01T00:00:00.000Z'),
      deviceId: GenerationDevice.B,
      volume: 50,
    },
    {
      timestamp: new Date('2022-04-01T00:30:00.000Z'),
      deviceId: GenerationDevice.B,
      volume: 50,
    },
    {
      timestamp: new Date('2022-04-01T01:00:00.000Z'),
      deviceId: GenerationDevice.B,
      volume: 50,
    },
    {
      timestamp: new Date('2022-04-01T01:30:00.000Z'),
      deviceId: GenerationDevice.C,
      volume: 50,
    },
  ],
  preferences: {
    groupPriority: [],
  },
};

describe('MatchingDataService', () => {
  let matchingDataService: MatchingDataService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: MatchingDataService,
          useValue: new MatchingDataInMemoryService(testData),
        },
      ],
    }).compile();

    matchingDataService = moduleRef.get<MatchingDataService>(MatchingDataService);
  });


  describe('getPreferences', () => {
    it('should get preferences', async () => {
      const preferences = await matchingDataService.getPreferences();

      expect(preferences).toMatchObject(testData.preferences);
    });
  });

  describe('getConsumptions', () => {
    it('should get all consumptions when no query parameters are specified', async () => {
      const consumptions = await matchingDataService.getConsumptions({});
      expect(consumptions).toMatchObject(testData.consumptions);
    });

    it('should get all consumptions within specified timeframe - lower bound', async () => {
      const consumptions = await matchingDataService.getConsumptions({
        from: new Date('2022-04-01T01:00:00.000Z'),
      });
      expect(consumptions).toMatchObject([testData.consumptions[2], testData.consumptions[5], testData.consumptions[6]]);
    });

    it('should get all consumptions within specified timeframe - upper bound', async () => {
      const consumptions = await matchingDataService.getConsumptions({
        to: new Date('2022-04-01T00:30:00.000Z'),
      });
      expect(consumptions).toMatchObject([
        testData.consumptions[0],
        testData.consumptions[1],
        testData.consumptions[3],
        testData.consumptions[4],
      ]);
    });

    it('should get all consumptions within specified timeframe - lower and upper bound', async () => {
      const consumptions = await matchingDataService.getConsumptions({
        from: new Date('2022-04-01T00:30:00.000Z'),
        to: new Date('2022-04-01T01:00:00.000Z'),
      });
      expect(consumptions).toMatchObject([
        testData.consumptions[1],
        testData.consumptions[2],
        testData.consumptions[4],
        testData.consumptions[5],
      ]);
    });

    it('should get all consumptions for specified deviceIds', async () => {
      const consumptions = await matchingDataService.getConsumptions({
        deviceIds: [ConsumptionDevice.C],
      });

      expect(consumptions).toMatchObject([testData.consumptions[6]]);
    });

    it('should get all consumptions that match query parameters', async () => {
      const consumptions = await matchingDataService.getConsumptions({
        from: new Date('2022-04-01T00:30:00.000Z'),
        to: new Date('2022-04-01T01:00:00.000Z'),
        deviceIds: [ConsumptionDevice.B],
      });

      expect(consumptions).toMatchObject([testData.consumptions[4], testData.consumptions[5]]);
    });
  });

  describe('getGenerations', () => {
    it('should get all generations when no query parameters are specified', async () => {
      const generations = await matchingDataService.getGenerations({});
      expect(generations).toMatchObject(testData.generations);
    });

    it('should get all generations within specified timeframe - lower bound', async () => {
      const generations = await matchingDataService.getGenerations({
        from: new Date('2022-04-01T01:00:00.000Z'),
      });
      expect(generations).toMatchObject([testData.generations[2], testData.generations[5], testData.generations[6]]);
    });

    it('should get all generations within specified timeframe - upper bound', async () => {
      const generations = await matchingDataService.getGenerations({
        to: new Date('2022-04-01T00:30:00.000Z'),
      });
      expect(generations).toMatchObject([
        testData.generations[0],
        testData.generations[1],
        testData.generations[3],
        testData.generations[4],
      ]);
    });

    it('should get all generations within specified timeframe - lower and upper bound', async () => {
      const generations = await matchingDataService.getGenerations({
        from: new Date('2022-04-01T00:30:00.000Z'),
        to: new Date('2022-04-01T01:00:00.000Z'),
      });
      expect(generations).toMatchObject([
        testData.generations[1],
        testData.generations[2],
        testData.generations[4],
        testData.generations[5],
      ]);
    });

    it('should get all generations for specified deviceIds', async () => {
      const generations = await matchingDataService.getGenerations({
        deviceIds: [GenerationDevice.C],
      });

      expect(generations).toMatchObject([testData.generations[6]]);
    });

    it('should get all generations that match query parameters', async () => {
      const generations = await matchingDataService.getGenerations({
        from: new Date('2022-04-01T00:30:00.000Z'),
        to: new Date('2022-04-01T01:00:00.000Z'),
        deviceIds: [GenerationDevice.B],
      });

      expect(generations).toMatchObject([testData.generations[4], testData.generations[5]]);
    });
  });
});