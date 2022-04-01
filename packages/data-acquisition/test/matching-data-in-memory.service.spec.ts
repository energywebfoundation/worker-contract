import { Test } from '@nestjs/testing';
import { MatchingDataService } from '../src/matching-data.service';
import { MatchingDataInMemoryService, InputData } from '../src/adapters/matching-data-in-memory.service';

enum ConsumptionDevice {
  A = "CONSUMPTION_DEVICE_A",
  B = "CONSUMPTION_DEVICE_B",
  C = "CONSUMPTION_DEVICE_C",
};

const testData: InputData = {
  consumptions: [
    {
      timestamp: new Date('2022-04-01T00:00:00.000Z'),
      deviceId: ConsumptionDevice.A,
      volume: 100
    },
    {
      timestamp: new Date('2022-04-01T00:30:00.000Z'),
      deviceId: ConsumptionDevice.A,
      volume: 100
    },
    {
      timestamp: new Date('2022-04-01T01:00:00.000Z'),
      deviceId: ConsumptionDevice.A,
      volume: 100
    },
    {
      timestamp: new Date('2022-04-01T00:00:00.000Z'),
      deviceId: ConsumptionDevice.B,
      volume: 100
    },
    {
      timestamp: new Date('2022-04-01T00:30:00.000Z'),
      deviceId: ConsumptionDevice.B,
      volume: 100
    },
    {
      timestamp: new Date('2022-04-01T01:00:00.000Z'),
      deviceId: ConsumptionDevice.B,
      volume: 100
    },
    {
      timestamp: new Date('2022-04-01T01:30:00.000Z'),
      deviceId: ConsumptionDevice.C,
      volume: 100
    },
  ],
  generations: [],
  preferences: {}
};

describe('MatchingDataService', () => {
  let matchingDataService: MatchingDataService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: MatchingDataService,
          useValue: new MatchingDataInMemoryService(testData)
        }
      ]
    }).compile();

    matchingDataService = moduleRef.get<MatchingDataService>(MatchingDataService);
  })

  describe('getReadings', () => {
    it('should get all readings when no query parameters are specified', async () => {
      const consumptions = await matchingDataService.getConsumptions({});
      expect(consumptions).toMatchObject(testData.consumptions);
    });

    it('should get all readings within specified timeframe - lower bound', async () => {
      const consumptions = await matchingDataService.getConsumptions({
        from: new Date('2022-04-01T01:00:00.000Z')
      });
      expect(consumptions).toMatchObject([testData.consumptions[2], testData.consumptions[5], testData.consumptions[6]])
    });

    it('should get all readings within specified timeframe - upper bound', async () => {
      const consumptions = await matchingDataService.getConsumptions({
        to: new Date('2022-04-01T00:30:00.000Z')
      });
      expect(consumptions).toMatchObject([
        testData.consumptions[0], 
        testData.consumptions[1],
        testData.consumptions[3],
        testData.consumptions[4]])
    });

    it('should get all readings within specified timeframe - lower and upper bound', async () => {
      const consumptions = await matchingDataService.getConsumptions({
        from: new Date('2022-04-01T00:30:00.000Z'),
        to: new Date('2022-04-01T01:00:00.000Z')
      });
      expect(consumptions).toMatchObject([
        testData.consumptions[1], 
        testData.consumptions[2],
        testData.consumptions[4],
        testData.consumptions[5]])
    });

    it('should get all readings for specified deviceIds', async () => {
      const consumptions = await matchingDataService.getConsumptions({
        deviceIds: [ConsumptionDevice.C]
      });

      expect(consumptions).toMatchObject([testData.consumptions[6]])
    });

    it('should get all readings that match query parameters', async () => {
      const consumptions = await matchingDataService.getConsumptions({
        from: new Date('2022-04-01T00:30:00.000Z'),
        to: new Date('2022-04-01T01:00:00.000Z'),
        deviceIds: [ConsumptionDevice.B]
      });

      expect(consumptions).toMatchObject([testData.consumptions[4], testData.consumptions[5]])
    });
  });

  describe('getPreferences', () => {
    it('should get preferences', async () => {
      const preferences = await matchingDataService.getPreferences();

      expect(preferences).toMatchObject(testData.preferences);
    })
  })
})