import { LeftoverGenerationPostgresRepository } from '../../src/matches/repository/leftover-generation-postgres.repository';
import { bootstrapPostgresRepositoryTest } from '../bootstrap';

describe('LeftoverGenerationPostgresRepository', () => {
  let repository: LeftoverGenerationPostgresRepository;

  beforeEach(async () => {
    repository = await bootstrapPostgresRepositoryTest(LeftoverGenerationPostgresRepository);
  });

  it('should save empty matches', async () => {
    await repository.save([], null);

    expect(await repository.find()).toHaveLength(0);
  });

  it('should save multiple leftover generation entry', async () => {
    const input = [
      generation,
      generation,
      generation,
    ];

    await repository.save(input, null);

    const results = await repository.find();
    expect(results).toEqual(input);
  });
});

const generation = {
  generatorId: '1',
  generatorMetadata: {},
  timestamp: new Date(),
  volume: 1,
};
