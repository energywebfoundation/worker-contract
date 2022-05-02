import { Injectable } from '@nestjs/common';
import type { LeftoverGeneration } from '../../types';
import type { LeftoverGenerationRepository } from './types';

@Injectable()
export class LeftoverGenerationInMemoryRepository implements LeftoverGenerationRepository {
  private db: LeftoverGeneration[] = [];

  public async find(): Promise<LeftoverGeneration[]> {
    return this.db;
  }

  public async save(generations: LeftoverGeneration[]): Promise<void> {
    this.db.push(...generations);
  }
}
