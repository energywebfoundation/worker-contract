export interface Reading {
  deviceId: string;
  timestamp: Date;
  volume: number;
}

export interface ReadingQuery {
  deviceIds?: string[];
  from?: Date;
  to?: Date;
}

export interface Preferences { }
