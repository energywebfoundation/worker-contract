import { MatchTest } from './bootstrap';
import { expectData, m, verifyMerkleTree } from './helpers';

describe('Battery synchronization', () => {
  let test: MatchTest;

  beforeEach(async () => {
    test = new MatchTest();
    await test.setup();
  });

  it('should synchronize battery', async () => {
    await test.addInputAndFakeBattery(
      { batteries: [], consumptions: [], generations: [] },
      {
        // Code will have to synchronize with that battery
        b1: {
          chargedWith: {
            g1: test.generation('g1', 100),
          },
          lastSoC: 100,
        },
      },
    );

    await test.addInput({
      batteries: [['b1', -100, 0]],
      consumptions: [['c1', 100]],
      generations: [],
    });

    // Skipped synchronization, but acked message
    expect(await test.match()).toBe(null);

    const result = await test.match();
    // Using synchronized state
    expectData(result, {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('c1', 'g1', 'b1', 100),
          timestamp: expect.any(Date),
        },
      ],
    });

    expect(verifyMerkleTree(result!)).toBe(true);
  });
});
