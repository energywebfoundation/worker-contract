import { Injectable } from '@nestjs/common';
import type { MatchingResult } from 'types';
import { Repository } from '../kysely/repository';
import type { DatabaseExternalResult, ExternalResult } from './types';
import { fromTime, toTime } from '../sqlite';

@Injectable()
export class ExternalResultRepository extends Repository<DatabaseExternalResult> {
  public async save(result: MatchingResult, tx?: DatabaseExternalResult | null) {
    await (tx ?? this.db).insertInto('external_result')
      .values(this.mapToExternalResult(result))
      .execute();
  }

  public async saveMany(results: MatchingResult[], tx?: DatabaseExternalResult | null) {
    await (tx ?? this.db).insertInto('external_result')
      .values(results.map(this.mapToExternalResult))
      .execute();
  }

  public async getByInputHash(inputHash: string): Promise<MatchingResult[]> {
    const rows = await this.db.selectFrom('external_result')
      .selectAll()
      .where('input_hash', '=', inputHash)
      .execute();

    return rows.map(this.mapToMatchingResult);
  }

  public async getResultCursor(): Promise<Date> {
    const rows = await this.db.selectFrom('external_result_cursor')
      .selectAll()
      .execute();

    if (rows.length === 0) {
      const from = toTime(new Date(0));
      await this.db.insertInto('external_result_cursor')
        .values({
          cursor: from,
        })
        .executeTakeFirstOrThrow();

      return fromTime(from);
    } else {
      return fromTime(rows[0].cursor);
    }
  }

  public async updateResultCursor(tx?: DatabaseExternalResult | null): Promise<void> {
    const from = new Date();

    await (tx ?? this.db).updateTable('external_result_cursor')
      .set({ cursor: toTime(from) })
      .executeTakeFirstOrThrow();
  }

  private mapToExternalResult(result: MatchingResult): Omit<ExternalResult, 'id'> {
    return {
      input_hash: result.inputHash,
      result: JSON.stringify(result),
      result_hash: result.resultHash,
      timestamp: toTime(new Date(result.timestamp)),
    };
  }

  private mapToMatchingResult({ result }: Omit<ExternalResult, 'id'>): MatchingResult {
    const parsed = JSON.parse(result) as MatchingResult;
    return {
      ...parsed,
      timestamp: new Date(parsed.timestamp),
    };
  }
}
