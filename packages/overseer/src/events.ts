export enum ContractEvent {
  WinningMatch = 'WinningMatch',
}

export interface WinningMatchEventPayload {
  transactionHash: string;
  matchInput: string;
  matchResult: string;
  voteCount: number;
}

export const parseEventArgs = (eventArguments: Record<string, string>) =>
  Object.fromEntries(Object.entries(eventArguments).filter(
    ([k]) => !Number.isInteger(Number.parseInt(k, 10)),
  ));

export class WinningMatchEvent {
  constructor(public payload: WinningMatchEventPayload) {}
}
