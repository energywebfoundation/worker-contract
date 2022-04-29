import { Injectable } from '@nestjs/common';
import type { DatabaseTransactionConnection} from 'slonik';
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

  public async find(): Promise<Match[]> {
    const query = sql`SELECT * FROM match`;
    const found = await this.pool.query(query);

    return found.rows.map(this.mapEntity);
  }

  public async save(matches: Match[], tx: DatabaseTransactionConnection | null): Promise<void> {
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

    await (tx ?? this.pool).query(sql`
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

  private mapEntity(match: any): Match {
    return {
      consumerId: match.consumer_id,
      consumerMetadata: match.consumer_metadata,
      generatorId: match.generator_id,
      generatorMetadata: match.generator_metadata,
      volume: match.volume,
      timestamp: new Date(match.timestamp),
    };
  }
}
