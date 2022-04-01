import { Preferences, Reading, ReadingQuery } from "./types";

export abstract class MatchingDataService {
  public abstract getPreferences(): Promise<Preferences>;

  public abstract getConsumptions(query: ReadingQuery): Promise<Reading[]>;

  public abstract getGenerations(query: ReadingQuery): Promise<Reading[]>;
}
