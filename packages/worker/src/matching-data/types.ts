export interface Reading {
  deviceId: string;
  volume: number;
}

export interface Preferences {
  groupPriority: {
    id: string;
    groupPriority: { id: string }[][];
  }[][];
}

export interface MatchingInput {
  generations: Reading[];
  consumptions: Reading[];
  preferences: Preferences;
  timestamp: Date;
}

export type MatchCallback = (input: MatchingInput) => Promise<void>;