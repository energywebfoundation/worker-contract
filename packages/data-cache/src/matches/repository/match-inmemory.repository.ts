import { Injectable } from '@nestjs/common';
import type { Match } from '../../types';
import type { MatchRepository } from './types';

@Injectable()
export class MatchInMemoryRepository implements MatchRepository {
  private db: Match[] = [];

  public async find(): Promise<Match[]> {
    return this.db;
  }

  public async save(matches: Match[]): Promise<void> {
    this.db.push(...matches);
  }
}
