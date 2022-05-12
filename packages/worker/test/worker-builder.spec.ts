import { WorkerBuilder } from '../src';
const mockGetConsumptions = async () => [{ deviceId: 'c1', volume: 100, timestamp: new Date(0) }];
const mockGetGenerations = async () => [{ deviceId: 'g1', volume: 100, timestamp: new Date(0) }];
const mockGetPreferences = async () => ({ groupPriority: [[{ id: 'c1', groupPriority: [[{ id: 'g1' }]]}]]});

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
        getConsumptions: mockGetConsumptions,
        getGenerations: mockGetGenerations,
        getPreferences: mockGetPreferences,
        processData: async (query, match) => {
          const consumptions = await mockGetConsumptions();
          const generations = await mockGetGenerations();
          const preferences = await mockGetPreferences();

          await match(consumptions, generations, preferences);
        },
      })
      .setResultSource({
        receiveMatchingResult,
      })
      .setVotingModule({rpcHost: 'http://localhost:8545', contractAddress: '0x5fbdb2315678afecb367f032d93f642f64180aa3', workerPrivateKey: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba'})
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