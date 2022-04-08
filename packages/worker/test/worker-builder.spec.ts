import { WorkerBuilder } from '../src';

describe('WorkerBuilder', () => {
  it('properly matches using data source and result source', async () => {
    const receiveMatchingResult = jest.fn();
    const matchingFacade = await new WorkerBuilder()
      .setMatchingAlgorithm((input) => {
        return {
          excessGenerations: [],
          leftoverConsumptions: [],
          matches: [{
            consumerId: input.consumptions[0].deviceId,
            generatorId: input.generations[0].deviceId,
            volume: 100,
          }],
        };
      })
      .setDataSource({
        getConsumptions: async () => [{ deviceId: 'c1', volume: 100, timestamp: new Date(0) }],
        getGenerations: async () => [{ deviceId: 'g1', volume: 100, timestamp: new Date(0) }],
        getPreferences: async () => ({ groupPriority: [[{ id: 'c1', groupPriority: [[{ id: 'g1' }]]}]]}),
      })
      .setResultSource({
        receiveMatchingResult,
      })
      .compile();

    await matchingFacade.match(new Date('2022-04-01T01:00:00.000Z'));

    expect(receiveMatchingResult).toBeCalledWith({
      tree: {
        rootHash: expect.any(String),
        leaves: [
          expect.any(String),
        ],
      },
      data: {
        excessGenerations: [],
        leftoverConsumptions: [],
        matches: [{
          consumerId: 'c1',
          generatorId: 'g1',
          volume: 100,
        }],
      },
    });
  });
});