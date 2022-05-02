import { LeftoverConsumptionPostgresRepository } from '../../src/matches/repository/leftover-consumption-postgres.repository';
import { bootstrapPostgresRepositoryTest } from '../bootstrap';

describe('LeftoverConsumptionPostgresRepository', () => {
  let repository: LeftoverConsumptionPostgresRepository;

  beforeEach(async () => {
    repository = await bootstrapPostgresRepositoryTest(LeftoverConsumptionPostgresRepository);
  });

  it('should save empty matches', async () => {
    await repository.save([], null);

    expect(await repository.find()).toHaveLength(0);
  });

  it('should save multiple leftover consumption entry', async () => {
    const input = [
      consumption,
      consumption,
      consumption,
    ];

    await repository.save(input, null);

    const results = await repository.find();
    expect(results).toEqual(input);
  });
});

const consumption = {
  consumerId: '1',
  consumerMetadata: {},
  timestamp: new Date(),
  volume: 1,
};
