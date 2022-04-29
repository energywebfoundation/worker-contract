import { Injectable } from '@nestjs/common';
import type { LeftoverConsumption } from '../../types';
import type { LeftoverConsumptionRepository } from './types';

@Injectable()
export class LeftoverConsumptionInMemoryRepository implements LeftoverConsumptionRepository {
  private db: LeftoverConsumption[] = [];

  public async find(): Promise<LeftoverConsumption[]> {
    return this.db;
  }

  public async save(consumptions: LeftoverConsumption[]): Promise<void> {
    this.db.push(...consumptions);
  }
}
