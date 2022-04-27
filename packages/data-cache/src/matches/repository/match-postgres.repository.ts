import { Injectable } from '@nestjs/common';
import { DatabasePool, sql } from 'slonik';
import { InjectPool } from '../../database';
import type { Match } from '../../types';
import type { MatchRepository } from './types';

@Injectable()
export class MatchPostgresRepository implements MatchRepository {
  constructor(
    @InjectPool()
    private pool: DatabasePool,
  ) {}

  public async save(matches: Match[]): Promise<void> {
    if (matches.length === 0) {
      return;
    }

    const data = sql.unnest(
      matches.map(m => [
        m.consumerId,
        m.generatorId,
        m.volume,
        m.timestamp.toISOString(),
        JSON.stringify(m.consumerMetadata ?? {}),
        JSON.stringify(m.generatorMetadata ?? {}),
      ]),
      [
        'text',
        'text',
        'int4',
        'timestamptz',
        'json',
        'json',
      ],
    );

    await this.pool.query(sql`
      INSERT INTO match (
        consumer_id,
        generator_id,
        volume,
        timestamp,
        consumer_metadata,
        generator_metadata
      )
      SELECT *
      FROM ${data}
    `);
  }
}
