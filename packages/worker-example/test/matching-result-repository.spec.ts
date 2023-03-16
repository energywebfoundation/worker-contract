import { MatchingResultRepository } from '../src/matching/matching/matching-result-sqlite.repository';
import type { MatchingResult } from 'types';
import { Kysely, SqliteDialect } from 'kysely';
import sql from 'better-sqlite3';
import { createMigrator } from '../db/migrator';
import type { DatabaseMatchingResult } from '../src/matching/matching/types';
import { randomUUID } from 'crypto';

describe('Matching result repository', () => {
  let repository: MatchingResultRepository;

  beforeEach(async () => {
    const db = new Kysely<DatabaseMatchingResult>({
      dialect: new SqliteDialect({
        database: sql(':memory:'),
      }),
    });
    const migrator = createMigrator(db);
    await migrator.migrateToLatest();
    repository = new MatchingResultRepository(db as unknown as DatabaseMatchingResult);
  });

  it('should work with cursor implementation', async () => {
    for (const entry of matchingResults) {
      await repository.save(entry);
    }

    const cursor = await repository.getCursorForUntil(new Date());

    let i = 1;
    for await (const entry of cursor) {
      expect(entry).toEqual(matchingResults[matchingResults.length - i]);
      i += 1;
    }
  });
  it('should update matching result on timestamp conflict', async () => {
    const firstMatch = { ...createMatchingResult('2022-02-02T11:00'), resultHash: randomUUID() };
    const secondMatch = { ...createMatchingResult('2022-02-02T11:00'), resultHash: randomUUID() };
    await repository.save(firstMatch);
    await repository.save(firstMatch);
    await repository.save(secondMatch);

    const results = [];
    for await (const match of repository.getCursorForUntil(new Date())) {
      results.push(match);
    }

    expect(results.length).toEqual(1);

    const [resultMatch] = results;
    expect(secondMatch.resultHash).toEqual(resultMatch.resultHash);
  });
});

const createMatchingResult = (date: string): MatchingResult => ({
  batteryStore: {
    leaf: '',
    proof: '',
    states: {},
  },
  inputData: {
    batteryDischarges: [],
    generations: [],
  },
  inputHash: '',
  resultData: {
    leftoverConsumptions: [],
    leftoverGenerations: [],
    matches: [],
  },
  resultHash: '',
  timestamp: new Date(date),
});


const matchingResults: MatchingResult[] = [
  createMatchingResult('2022-02-02T11:00'),
  createMatchingResult('2022-02-02T11:15'),
  createMatchingResult('2022-02-02T11:30'),
  createMatchingResult('2022-02-02T11:45'),
];

