import type { Reading, Preferences, ReadingQuery } from './types';

export abstract class MatchingDataFacade {
  public abstract getPreferences(): Promise<Preferences>;

  public abstract getConsumptions(query: ReadingQuery): Promise<Reading[]>;

  public abstract getGenerations(query: ReadingQuery): Promise<Reading[]>;

  public abstract processData(query: ReadingQuery, match: (consumptions: Reading[], generations: Reading[], preferences: Preferences) => Promise<void>): Promise<void>;
}
