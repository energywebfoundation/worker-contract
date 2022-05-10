import { MatchPostgresRepository } from '../../src/matches/repository/match-postgres.repository';
import { bootstrapPostgresRepositoryTest } from '../bootstrap';

describe('MatchPostgresRepository', () => {
  let repository: MatchPostgresRepository;

  beforeEach(async () => {
    repository = await bootstrapPostgresRepositoryTest(MatchPostgresRepository);
  });

  it('should save empty matches', async () => {
    await repository.save([], null);

    expect(await repository.find()).toHaveLength(0);
  });

  it('should save multiple match entry', async () => {
    const input = [
      match,
      match,
      match,
    ];

    await repository.save(input, null);

    const results = await repository.find();
    expect(results).toEqual(input);
  });
});

const match = {
  generatorId: '1',
  consumerId: '1',
  consumerMetadata: {},
  generatorMetadata: {},
  timestamp: new Date(),
  volume: 1,
};
