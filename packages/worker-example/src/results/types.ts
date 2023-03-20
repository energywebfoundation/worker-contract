import type { Generated, Kysely } from 'kysely';
import type { MatchingResult } from 'types';

export abstract class ResultSource {
  public abstract getNewResults(): AsyncGenerator<MatchingResult[]>
}

export type DatabaseExternalResult = Kysely<{
  external_result: ExternalResult,
  external_result_cursor: ExternalResultCursor
}>


export interface ExternalResult {
  id: Generated<number>
  input_hash: string
  result_hash: string
  result: string
  timestamp: number
}

export interface ExternalResultCursor {
  cursor: number;
}
