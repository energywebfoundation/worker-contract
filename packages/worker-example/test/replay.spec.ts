import { MatchTest } from './bootstrap';
import { expectData, m } from './helpers';

describe('Replay', () => {
  let test: MatchTest;

  beforeEach(async () => {
    test = new MatchTest();
    await test.setup();
  });

  it('should replay matching', async () => {
    const timestamps = [
      new Date('2022-01-01T10:00Z'),
      new Date('2022-01-01T10:15Z'),
      new Date('2022-01-01T10:30Z'),
    ];

    const matching = [
      // ======== Normal matching ========
      { timestamp: timestamps[0], volume: 100 },
      { timestamp: timestamps[1], volume: 200 },
      { timestamp: timestamps[2], volume: 300 },
      // ======== Replayed matching ========
      { timestamp: timestamps[1], volume: 400 },
    ];

    for (const data of matching) {
      await test.addInput({
        batteries: [],
        consumptions: [['c1', data.volume]],
        generations: [['g1', data.volume]],
        timestamp: data.timestamp,
      });

      const result = await test.match();

      expectData(result, {
        leftoverConsumptions: [],
        leftoverGenerations: [],
        matches: [
          {
            ...m('c1', 'g1', null, data.volume),
            timestamp: data.timestamp,
          },
        ],
      });
    }

    // additional replayed match (entry 3 should be rematched, because entry 2 was overwritten)
    const replayedMatch = await test.match();
    expectData(replayedMatch, {
      leftoverConsumptions: [],
      leftoverGenerations: [],
      matches: [
        {
          ...m('c1', 'g1', null, matching[2].volume),
          timestamp: matching[2].timestamp,
        },
      ],
    });
  });
});
