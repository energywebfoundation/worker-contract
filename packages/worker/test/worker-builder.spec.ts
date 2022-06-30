import { WorkerBuilder } from '../src';

const mockConsumptions = [{ deviceId: 'c1', volume: 100 }];
const mockGenerations = [{ deviceId: 'g1', volume: 100 }];
const mockPreferences = { groupPriority: [[{ id: 'c1', groupPriority: [[{ id: 'g1' }]]}]]};
const mockTimestamp = new Date('2022-04-01T01:00:00.000Z');

describe('WorkerBuilder', () => {
  it('properly matches using data source and result source', async () => {
    const receiveMatchingResult = jest.fn();

    const matchingInput = {
      consumptions: mockConsumptions,
      generations: mockGenerations,
      preferences: mockPreferences,
      timestamp: mockTimestamp,
    };

    const matchingFacade = await new WorkerBuilder()
      .setMatchingAlgorithm((input) => {
        return {
          leftoverGenerations: [],
          leftoverConsumptions: [],
          matches: [{
            consumerId: (input as any).consumptions[0].deviceId,
            generatorId: (input as any).generations[0].deviceId,
            volume: 100,
          }],
        };
      })
      .setDataSource({
        async withMatchingInput(cb) {
          return await cb(matchingInput);
        },
      })
      .setResultSource({
        receiveMatchingResult,
      })
      .compile();

    await matchingFacade.match();

    expect(receiveMatchingResult).toBeCalledWith({
      timestamp: expect.any(Date),
      tree: {
        rootHash: expect.any(String),
        leaves: [
          expect.any(String),
        ],
      },
      data: {
        leftoverGenerations: [],
        leftoverConsumptions: [],
        matches: [{
          consumerId: 'c1',
          generatorId: 'g1',
          volume: 100,
        }],
      },
    }, matchingInput);
  });
});