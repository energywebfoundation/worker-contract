import { Injectable } from '@nestjs/common';
import type { DatabaseTransactionConnection} from 'slonik';
import { DatabasePool, sql } from 'slonik';
import { InjectPool } from '../../database';
import type { LeftoverConsumption } from '../../types';
import type { LeftoverConsumptionRepository } from './types';

@Injectable()
export class LeftoverConsumptionPostgresRepository implements LeftoverConsumptionRepository {
  constructor(
    @InjectPool()
    private pool: DatabasePool,
  ) {}

  public async find(): Promise<LeftoverConsumption[]> {
    const query = sql`SELECT * FROM leftover_consumption`;
    const found = await this.pool.query(query);

    return found.rows.map(this.mapEntity);
  }

  public async save(consumptions: LeftoverConsumption[], tx: DatabaseTransactionConnection | null): Promise<void> {
    if (consumptions.length === 0) {
      return;
    }

    const data = sql.unnest(
      consumptions.map(c => [
        c.consumerId,
        c.volume,
        c.timestamp.toISOString(),
        JSON.stringify(c.consumerMetadata ?? {}),
      ]),
      [
        'text',
        'int4',
        'timestamptz',
        'json',
      ],
    );

    await (tx ?? this.pool).query(sql`
      INSERT INTO leftover_consumption (
        consumer_id,
        volume,
        timestamp,
        consumer_metadata
      )
      SELECT *
      FROM ${data}
    `);
  }

  private mapEntity(consumption: any): LeftoverConsumption {
    return {
      consumerId: consumption.consumer_id,
      consumerMetadata: consumption.consumer_metadata,
      timestamp: new Date(consumption.timestamp),
      volume: consumption.volume,
    };
  }
}
