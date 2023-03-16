import { MatchTest } from './bootstrap';
import { expectBatteryStore, expectData, m, verifyMerkleTree } from './helpers';
import { InputBuilder } from './input.builder';

describe('With battery', () => {
  let test: MatchTest;
  let builder: InputBuilder;

  beforeEach(async () => {
    test = new MatchTest();
    builder = InputBuilder.create(test);
    await test.setup();
  });

  it('should charge and use battery', async () => {
    await (builder
      .withBattery().withId('b1').withVolume(100).withSoC(100).add()
      .withGeneration().withId('g1').withVolume(100).add()
    ).apply();

    await (builder
      .withBattery().withId('b1').withVolume(-100).withSoC(0).add()
      .withConsumption().withId('c1').withVolume(100).add()
    ).apply();

    const result1 = await test.match();
    const result2 = await test.match();

    expectData(result1, {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('b1', 'g1', null, 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expect(verifyMerkleTree(result1!)).toBe(true);

    expectData(result2, {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('c1', 'g1', 'b1', 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expect(verifyMerkleTree(result2!)).toBe(true);

    expectBatteryStore(result1, {
      b1: {
        lastSoC: 100,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 100,
          }),
        },
      },
    });

    expectBatteryStore(result2, {
      b1: {
        lastSoC: 0,
        chargedWith: {},
      },
    });
  });

  it('should charge twice and use battery', async () => {
    await (builder
      .withBattery().withId('b1').withVolume(100).withSoC(100).add()
      .withGeneration().withId('g1').withVolume(100).add()
    ).apply();

    await (builder
      .withBattery().withId('b1').withVolume(100).withSoC(200).add()
      .withGeneration().withId('g1').withVolume(100).add()
    ).apply();

    await (builder
      .withBattery().withId('b1').withVolume(-200).withSoC(0).add()
      .withConsumption().withId('c1').withVolume(200).add()
    ).apply();

    const results = [await test.match(), await test.match(), await test.match()];

    expectData(results[0], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('b1', 'g1', null, 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expectData(results[1], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('b1', 'g1', null, 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expectData(results[2], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('c1', 'g1', 'b1', 200),
          timestamp: expect.any(Date),
        },
      ],
    });

    expect(verifyMerkleTree(results[0]!)).toBe(true);
    expect(verifyMerkleTree(results[1]!)).toBe(true);
    expect(verifyMerkleTree(results[2]!)).toBe(true);

    expectBatteryStore(results[0], {
      b1: {
        lastSoC: 100,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 100,
          }),
        },
      },
    });

    expectBatteryStore(results[1], {
      b1: {
        lastSoC: 200,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 200,
          }),
        },
      },
    });

    expectBatteryStore(results[2], {
      b1: {
        lastSoC: 0,
        chargedWith: {},
      },
    });
  });

  it('should charge and use battery, generation, and leftover consumption', async () => {
    await (builder
      .withBattery().withId('b1').withVolume(100).withSoC(100).add()
      .withGeneration().withId('g1').withVolume(100).add()
    ).apply();

    await (builder
      .withBattery().withId('b1').withVolume(-100).withSoC(0).add()
      .withConsumption().withId('c1').withVolume(150).add()
      .withGeneration().withId('g1').withVolume(25).add()
    ).apply();

    const results = [await test.match(), await test.match()];

    expectData(results[0], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('b1', 'g1', null, 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expectData(results[1], {
      leftoverConsumptions: [
        {
          consumptionId: 'c1',
          volume: 25,
          carbonUsage: 0,
          gridRenewable: 0,
          timestamp: expect.any(Date),
        },
      ],
      leftoverGenerations: [],
      matches: [
        {
          ...m('c1', 'g1', null, 25),
          timestamp: expect.any(Date),
        },
        {
          ...m('c1', 'g1', 'b1', 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expect(verifyMerkleTree(results[0]!)).toBe(true);
    expect(verifyMerkleTree(results[1]!)).toBe(true);

    expectBatteryStore(results[0], {
      b1: {
        lastSoC: 100,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 100,
          }),
        },
      },
    });

    expectBatteryStore(results[1], {
      b1: {
        lastSoC: 0,
        chargedWith: {},
      },
    });
  });

  it('should charge and use battery, and leftover generation from battery', async () => {
    await (builder
      .withBattery().withId('b1').withVolume(100).withSoC(100).add()
      .withGeneration().withId('g1').withVolume(100).add()
    ).apply();

    await (builder
      .withBattery().withId('b1').withVolume(-100).withSoC(0).add()
      .withConsumption().withId('c1').withVolume(75).add()
    ).apply();

    const results = [await test.match(), await test.match()];

    expectData(results[0], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('b1', 'g1', null, 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expectData(results[1], {
      leftoverConsumptions: [],
      leftoverGenerations: [
        {
          generationId: 'g1',
          volume: 25,
          throughBatteryId: 'b1',
          timestamp: expect.any(Date),
        },
      ],
      matches: [
        {
          ...m('c1', 'g1', 'b1', 75),
          timestamp: expect.any(Date),
        },
      ],
    });

    expect(verifyMerkleTree(results[0]!)).toBe(true);
    expect(verifyMerkleTree(results[1]!)).toBe(true);

    expectBatteryStore(results[0], {
      b1: {
        lastSoC: 100,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 100,
          }),
        },
      },
    });

    expectBatteryStore(results[1], {
      b1: {
        lastSoC: 0,
        chargedWith: {},
      },
    });
  });

  it('should charge with some loss, then use battery, with grid energy', async () => {
    await (builder
      .withBattery().withId('b1').withVolume(100).withSoC(100).add()
      .withGeneration().withId('g1').withVolume(100).add()
    ).apply();

    await (builder
      .withBattery().withId('b1').withVolume(200).withSoC(260).add()
      .withGeneration().withId('g1').withVolume(100).add()
    ).apply();

    await (builder
      .withBattery().withId('b1').withVolume(-180).withSoC(0).add()
      .withConsumption().withId('c1').withVolume(200).add()
    ).apply();

    const results = [await test.match(), await test.match(), await test.match()];

    expectData(results[0], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('b1', 'g1', null, 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expectData(results[1], {
      leftoverConsumptions: [
        {
          consumptionId: 'b1',
          volume: 100,
          carbonUsage: 0,
          gridRenewable: 0,
          timestamp: expect.any(Date),
        },
      ],
      leftoverGenerations: [],
      matches: [
        {
          ...m('b1', 'g1', null, 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expectData(results[2], {
      leftoverConsumptions: [
        {
          consumptionId: 'c1',
          volume: 20,
          carbonUsage: 0,
          gridRenewable: 0,
          timestamp: expect.any(Date),
        },
      ],
      leftoverGenerations: [],
      matches: [
        {
          ...m('c1', 'g1', 'b1', 180),
          timestamp: expect.any(Date),
        },
      ],
    });

    expect(verifyMerkleTree(results[0]!)).toBe(true);
    expect(verifyMerkleTree(results[1]!)).toBe(true);
    expect(verifyMerkleTree(results[2]!)).toBe(true);

    expectBatteryStore(results[0], {
      b1: {
        lastSoC: 100,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 100,
          }),
        },
      },
    });

    expectBatteryStore(results[1], {
      b1: {
        lastSoC: 260,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 180,
          }),
        },
      },
    });

    expectBatteryStore(results[2], {
      b1: {
        lastSoC: 0,
        chargedWith: {},
      },
    });
  });

  it('should charge with some loss, then use battery', async () => {
    await (builder
      .withBattery().withId('b1').withVolume(100).withSoC(100).add()
      .withGeneration().withId('g1').withVolume(100).add()
    ).apply();

    await (builder
      .withBattery().withId('b1').withVolume(100).withSoC(180).add()
      .withGeneration().withId('g1').withVolume(100).add()
    ).apply();

    await (builder
      .withBattery().withId('b1').withVolume(-180).withSoC(0).add()
      .withConsumption().withId('c1').withVolume(200).add()
    ).apply();

    const results = [await test.match(), await test.match(), await test.match()];

    expectData(results[0], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('b1', 'g1', null, 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expectData(results[1], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('b1', 'g1', null, 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expectData(results[2], {
      leftoverConsumptions: [
        {
          consumptionId: 'c1',
          volume: 20,
          carbonUsage: 0,
          gridRenewable: 0,
          timestamp: expect.any(Date),
        },
      ],
      leftoverGenerations: [],
      matches: [
        {
          ...m('c1', 'g1', 'b1', 180),
          timestamp: expect.any(Date),
        },
      ],
    });

    expect(verifyMerkleTree(results[0]!)).toBe(true);
    expect(verifyMerkleTree(results[1]!)).toBe(true);
    expect(verifyMerkleTree(results[2]!)).toBe(true);

    expectBatteryStore(results[0], {
      b1: {
        lastSoC: 100,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 100,
          }),
        },
      },
    });

    expectBatteryStore(results[1], {
      b1: {
        lastSoC: 180,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 180,
          }),
        },
      },
    });

    expectBatteryStore(results[2], {
      b1: {
        lastSoC: 0,
        chargedWith: {},
      },
    });
  });

  it('should reset battery state if one state is not received', async () => {
    await (builder
      .withBattery().withId('b1').withVolume(100).withSoC(100).add()
      .withGeneration().withId('g1').withVolume(100).add()
    ).apply();

    await (builder).apply();

    await (builder
      .withBattery().withId('b1').withVolume(-50).withSoC(50).add()
      .withConsumption().withId('c1').withVolume(50).add()
    ).apply();

    const results = [await test.match(), await test.match(), await test.match()];

    expectData(results[0], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('b1', 'g1', null, 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expectData(results[1], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [],
    });

    expectData(results[2], {
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
      matches: [],
    });

    expect(verifyMerkleTree(results[0]!)).toBe(true);
    expect(verifyMerkleTree(results[2]!)).toBe(true);

    expectBatteryStore(results[0], {
      b1: {
        lastSoC: 100,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 100,
          }),
        },
      },
    });

    expectBatteryStore(results[1], {});

    expectBatteryStore(results[2], {
      b1: {
        lastSoC: 50,
        chargedWith: {},
      },
    });
  });

  it('should not reset battery state if volume zero is received for battery', async () => {
    await (builder
      .withBattery().withId('b1').withVolume(100).withSoC(100).add()
      .withGeneration().withId('g1').withVolume(100).add()
    ).apply();

    await (builder
      .withBattery().withId('b1').withVolume(0).withSoC(100).add()
    ).apply();

    await (builder
      .withBattery().withId('b1').withVolume(-50).withSoC(50).add()
      .withConsumption().withId('c1').withVolume(50).add()
    ).apply();

    const results = [await test.match(), await test.match(), await test.match()];

    expectData(results[0], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('b1', 'g1', null, 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expectData(results[1], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [],
    });

    expectData(results[2], {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('c1', 'g1', 'b1', 50),
          timestamp: expect.any(Date),
        },
      ],
    });

    expect(verifyMerkleTree(results[0]!)).toBe(true);
    expect(verifyMerkleTree(results[2]!)).toBe(true);

    expectBatteryStore(results[0], {
      b1: {
        lastSoC: 100,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 100,
          }),
        },
      },
    });

    expectBatteryStore(results[1], {
      b1: {
        lastSoC: 100,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 100,
          }),
        },
      },
    });

    expectBatteryStore(results[2], {
      b1: {
        lastSoC: 50,
        chargedWith: {
          g1: expect.objectContaining({
            assetId: 'g1',
            volume: 50,
          }),
        },
      },
    });
  });
});
