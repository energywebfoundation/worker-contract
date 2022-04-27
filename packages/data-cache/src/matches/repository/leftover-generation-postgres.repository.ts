import { Injectable } from '@nestjs/common';
import { DatabasePool, sql } from 'slonik';
import { InjectPool } from '../../database';
import type { LeftoverGeneration } from '../../types';
import type { LeftoverGenerationRepository } from './types';

@Injectable()
export class LeftoverGenerationPostgresRepository implements LeftoverGenerationRepository {
  constructor(
    @InjectPool()
    private pool: DatabasePool,
  ) {}

  public async find(): Promise<LeftoverGeneration[]> {
    const query = sql`SELECT * FROM leftover_generation`;
    const found = await this.pool.query<LeftoverGeneration>(query);

    return found.rows.map(this.mapEntity);
  }

  public async save(generations: LeftoverGeneration[]): Promise<void> {
    if (generations.length === 0) {
      return;
    }

    const data = sql.unnest(
      generations.map(g => [
        g.generatorId,
        g.volume,
        g.timestamp.toISOString(),
        JSON.stringify(g.generatorMetadata ?? {}),
      ]),
      [
        'text',
        'int4',
        'timestamptz',
        'json',
      ],
    );

    await this.pool.query(sql`
      INSERT INTO leftover_generation (
        generator_id,
        volume,
        timestamp,
        generator_metadata
      )
      SELECT *
      FROM ${data}
    `);
  }

  private mapEntity(match: LeftoverGeneration): LeftoverGeneration {
    return match;
  }
}
