import type { MatchingResult } from 'types';
import { toTime } from '../../sqlite';
import { Repository } from '../../kysely/repository';
import type { DatabaseMatchingResult } from './types';

export class MatchingResultRepository extends Repository<DatabaseMatchingResult> {

  /** Save should overwrite by timestamp */
  public async save(matchingResult: MatchingResult): Promise<void> {
    await this.db.insertInto('matching_result')
      .values({
        result: JSON.stringify(matchingResult),
        timestamp: toTime(matchingResult.timestamp),
      })
      .onConflict(oc => oc.column('timestamp').doUpdateSet({ result: JSON.stringify(matchingResult) }))
      .executeTakeFirstOrThrow();
  }

  /** It's crucial that this generator will return matching results from latest to oldest (desc by timestamp) */
  public async* getCursorForUntil(until: Date): AsyncGenerator<MatchingResult> {
    const rows = await this.db.selectFrom('matching_result')
      .selectAll()
      .where('timestamp', '<', toTime(until))
      .orderBy('timestamp', 'desc')
      .execute();

    const results = rows.map(row => {
      const parsed = JSON.parse(row.result) as MatchingResult;
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
      };
    });
    for (const result of results) {
      yield result;
    }
  }
}
