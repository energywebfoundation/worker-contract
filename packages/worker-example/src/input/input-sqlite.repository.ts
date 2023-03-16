import { fromTime, toTime } from '../sqlite';
import type { DatabaseInput, StoredInput } from './types';
import { Repository } from '../kysely/repository';

export class InputRepository extends Repository<DatabaseInput> {
  /** Save should overwrite by timestamp */
  public async save(i: StoredInput, tx?: DatabaseInput | null): Promise<void> {
    await (tx ?? this.db).insertInto('input')
      .values({
        input: i.input,
        matched: Number(i.matched),
        timestamp: toTime(new Date(i.timestamp)),
      })
      .onConflict(oc => oc.column('timestamp').doUpdateSet({ input: i.input, matched: Number(i.matched) }))
      .executeTakeFirstOrThrow();

  }

  public async markAsMatched(date: Date, tx?: DatabaseInput | null): Promise<void> {
    await (tx ?? this.db).updateTable('input')
      .set({ matched: 1 })
      .where('timestamp', '=', toTime(new Date(date)))
      .executeTakeFirstOrThrow();
  }

  public async markAsUnmatchedNewerThan(date: Date, tx?: DatabaseInput | null): Promise<void> {
    await (tx ?? this.db).updateTable('input')
      .set({ matched: 0 })
      .where('timestamp', '>', toTime(new Date(date)))
      .executeTakeFirstOrThrow();
  }

  public async getOldestUnmatched(): Promise<StoredInput | null> {
    const [result] = await this.db.selectFrom('input')
      .selectAll()
      .where('matched', '=', 0)
      .orderBy('timestamp', 'asc')
      .limit(1)
      .execute();

    if (!result) {
      return null;
    }

    return {
      input: result.input,
      matched: Boolean(result.matched),
      timestamp: fromTime(result.timestamp),
    };
  }

  public async getInputCursor(): Promise<Date> {
    const rows = await this.db.selectFrom('input_source_cursor')
      .selectAll()
      .execute();

    if (rows.length === 0) {
      const from = toTime(new Date(0));
      await this.db.insertInto('input_source_cursor')
        .values({
          cursor: from,
        })
        .executeTakeFirstOrThrow();

      return fromTime(from);
    } else {
      return fromTime(rows[0].cursor);
    }
  }

  public async updateCursor(tx?: DatabaseInput | null): Promise<void> {
    const from = new Date();

    await (tx ?? this.db).updateTable('input_source_cursor')
      .set({ cursor: toTime(from) })
      .executeTakeFirstOrThrow();
  }
}
