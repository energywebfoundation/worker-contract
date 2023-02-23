import type { Kysely } from 'kysely';

export type DatabaseMatchingResult = Kysely<{
  matching_result: Result
}>

export interface Result {
  timestamp: number,
  result: string,
}
