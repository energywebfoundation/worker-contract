import { Test } from '@nestjs/testing';
import { SlonikModule } from '../../src/database';
import { DatabaseService } from '../../src/database/database.service';
import { getConnectionOptions } from '../../src/database/database.utils';
import { MatchPostgresRepository } from '../../src/matches/repository/match-postgres.repository';

describe('MatchPostgresRepository', () => {
  let repository: MatchPostgresRepository;

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      imports: [SlonikModule.forRoot({ connectionUri: getConnectionOptions().uri })],
      providers: [MatchPostgresRepository],
    }).compile();

    repository = app.get(MatchPostgresRepository);
    const database = app.get(DatabaseService);

    await database.clean();
  });

  it('should save empty matches', async () => {
    await repository.save([]);

    expect(await repository.find()).toHaveLength(0);
  });

  it('should save multiple match entry', async () => {
    await repository.save([
      match,
      match,
      match,
    ]);

    expect(await repository.find()).toHaveLength(3);
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
