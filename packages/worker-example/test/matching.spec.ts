import { MatchTest } from './bootstrap';
import type { MatchingData } from './bootstrap';
import { expectData, m, verifyMerkleTree } from './helpers';
import { InputBuilder } from './input.builder';

describe('Matching', () => {
  let test: MatchTest;
  let builder: InputBuilder;

  beforeEach(async () => {
    test = new MatchTest();
    builder = InputBuilder.create(test);
    await test.setup();
  });

  describe('Without battery', () => {
    it('should make match with leftover consumption', async () => {
      await (builder
        .withConsumption().withId('c1').withVolume(150).add()
        .withGeneration().withId('g1').withVolume(100).add()
      ).apply();

      const result = await test.match();

      expectData(result, {
        leftoverConsumptions: [
          {
            consumptionId: 'c1',
            volume: 50,
            carbonUsage: 0,
            gridRenewable: 0,
            timestamp: expect.any(Date),
          },
        ],
        leftoverGenerations: [],
        matches: [
          {
            ...m('c1', 'g1', null, 100),
            timestamp: expect.any(Date),
          },
        ],
      });

      expect(verifyMerkleTree(result!)).toBe(true);
    });

    it('should make match with leftover generation', async () => {
      await (builder
        .withConsumption().withId('c1').withVolume(100).add()
        .withGeneration().withId('g1').withVolume(150).add()
      ).apply();

      const result = await test.match();

      expectData(result, {
        leftoverConsumptions: [],
        leftoverGenerations: [
          {
            generationId: 'g1',
            volume: 50,
            throughBatteryId: null,
            timestamp: expect.any(Date),
          },
        ],
        matches: [
          {
            ...m('c1', 'g1', null, 100),
            timestamp: expect.any(Date),
          },
        ],
      });

      expect(verifyMerkleTree(result!)).toBe(true);
    });
  });

  describe('Carbon intensity', () => {
    it('should compute carbon usage as zero if no country intensity available', async () => {
      await (builder
        .withConsumption().withId('c1').withVolume(200).add()
        .withGeneration().withId('g1').withVolume(100).add()
      ).apply();

      const result = await test.match();

      expectData(result, {
        leftoverConsumptions: [
          {
            consumptionId: 'c1',
            volume: 100,
            carbonUsage: 0,
            gridRenewable: 0,
            timestamp: expect.any(Date),
          },
        ],
        leftoverGenerations: [],
        matches: [
          {
            consumptionId: 'c1',
            generationId: 'g1',
            volume: 100,
            throughBatteryId: null,
            carbonDisplacement: 0,
            timestamp: expect.any(Date),
          },
        ],
      });
    });

    it('should compute carbon usage from country data if no region intensity available', async () => {
      const carbon = { c1: { carbonIntensity: 10, regions: {}, sites: {} } };

      await test.addInput({
        batteries: [],
        consumptions: [['c1', 200]],
        generations: [['g1', 100]],
        carbon,
      });

      const result = await test.match();

      expectData(result, {
        leftoverConsumptions: [
          {
            consumptionId: 'c1',
            volume: 100,
            carbonUsage: 1000,
            gridRenewable: 0,
            timestamp: expect.any(Date),
          },
        ],
        leftoverGenerations: [],
        matches: [
          {
            consumptionId: 'c1',
            generationId: 'g1',
            volume: 100,
            throughBatteryId: null,
            carbonDisplacement: 1000,
            timestamp: expect.any(Date),
          },
        ],
      });
    });

    it('should compute carbon usage from region data', async () => {
      const carbon = {
        c1: { carbonIntensity: 10, regions: { r1: 15 }, sites: {} },
      };

      await test.addInput({
        batteries: [],
        consumptions: [['c1', 200]],
        generations: [['g1', 100]],
        carbon,
      });

      const result = await test.match();

      expectData(result, {
        leftoverConsumptions: [
          {
            consumptionId: 'c1',
            volume: 100,
            carbonUsage: 1500,
            gridRenewable: 0,
            timestamp: expect.any(Date),
          },
        ],
        leftoverGenerations: [],
        matches: [
          {
            consumptionId: 'c1',
            generationId: 'g1',
            volume: 100,
            throughBatteryId: null,
            carbonDisplacement: 1500,
            timestamp: expect.any(Date),
          },
        ],
      });
    });

    it('should compute carbon usage from site data', async () => {
      const carbon = {
        c1: { carbonIntensity: 10, regions: { r1: 15 }, sites: { s1: 20 } },
      };

      await test.addInput({
        batteries: [],
        consumptions: [['c1', 200]],
        generations: [['g1', 100]],
        carbon,
      });

      const result = await test.match();

      expectData(result, {
        leftoverConsumptions: [
          {
            consumptionId: 'c1',
            volume: 100,
            carbonUsage: 2000,
            gridRenewable: 0,
            timestamp: expect.any(Date),
          },
        ],
        leftoverGenerations: [],
        matches: [
          {
            consumptionId: 'c1',
            generationId: 'g1',
            volume: 100,
            throughBatteryId: null,
            carbonDisplacement: 2000,
            timestamp: expect.any(Date),
          },
        ],
      });
    });
  });

  describe('Grid renewable energy', () => {
    it('should compute renewable as zero if no country renewable available', async () => {
      await (builder
        .withConsumption().withId('c1').withVolume(200).add()
        .withGeneration().withId('g1').withVolume(100).add()
      ).apply();

      const result = await test.match();

      expectData(result, {
        leftoverConsumptions: [
          {
            consumptionId: 'c1',
            volume: 100,
            carbonUsage: 0,
            gridRenewable: 0,
            timestamp: expect.any(Date),
          },
        ],
        leftoverGenerations: [],
        matches: [
          {
            consumptionId: 'c1',
            generationId: 'g1',
            volume: 100,
            throughBatteryId: null,
            carbonDisplacement: 0,
            timestamp: expect.any(Date),
          },
        ],
      });
    });

    it('should compute renewable from country data if no region renewable available', async () => {
      const renewable: MatchingData['renewable'] = { c1: { renewablePercentage: 0.1, regions: {}, sites: {} } };

      await test.addInput({
        batteries: [],
        consumptions: [['c1', 200]],
        generations: [['g1', 100]],
        renewable,
      });

      const result = await test.match();

      expectData(result, {
        leftoverConsumptions: [
          {
            consumptionId: 'c1',
            volume: 100,
            carbonUsage: 0,
            gridRenewable: 10,
            timestamp: expect.any(Date),
          },
        ],
        leftoverGenerations: [],
        matches: [
          {
            consumptionId: 'c1',
            generationId: 'g1',
            volume: 100,
            throughBatteryId: null,
            carbonDisplacement: 0,
            timestamp: expect.any(Date),
          },
        ],
      });
    });

    it('should compute renewable from region data', async () => {
      const renewable: MatchingData['renewable'] = {
        c1: { renewablePercentage: 0.1, regions: { r1: 0.15 }, sites: {} },
      };

      await test.addInput({
        batteries: [],
        consumptions: [['c1', 200]],
        generations: [['g1', 100]],
        renewable,
      });

      const result = await test.match();

      expectData(result, {
        leftoverConsumptions: [
          {
            consumptionId: 'c1',
            volume: 100,
            carbonUsage: 0,
            gridRenewable: 15,
            timestamp: expect.any(Date),
          },
        ],
        leftoverGenerations: [],
        matches: [
          {
            consumptionId: 'c1',
            generationId: 'g1',
            volume: 100,
            throughBatteryId: null,
            carbonDisplacement: 0,
            timestamp: expect.any(Date),
          },
        ],
      });
    });

    it('should compute renewable from site data', async () => {
      const renewable: MatchingData['renewable'] = {
        c1: { renewablePercentage: 0.1, regions: { r1: 0.15 }, sites: { s1: 0.20 } },
      };

      await test.addInput({
        batteries: [],
        consumptions: [['c1', 200]],
        generations: [['g1', 100]],
        renewable,
      });

      const result = await test.match();

      expectData(result, {
        leftoverConsumptions: [
          {
            consumptionId: 'c1',
            volume: 100,
            carbonUsage: 0,
            gridRenewable: 20,
            timestamp: expect.any(Date),
          },
        ],
        leftoverGenerations: [],
        matches: [
          {
            consumptionId: 'c1',
            generationId: 'g1',
            volume: 100,
            throughBatteryId: null,
            carbonDisplacement: 0,
            timestamp: expect.any(Date),
          },
        ],
      });
    });
  });
});
