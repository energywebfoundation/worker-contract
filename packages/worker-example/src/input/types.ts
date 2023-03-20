import type { Kysely } from 'kysely';
import type { InputDTO } from 'types';

export type DatabaseInput = Kysely<{
  input: Input
  input_source_cursor: InputCursor
}>

export interface Input {
  timestamp: number
  matched: number
  input: string
}

export interface InputCursor {
  cursor: number
}

export abstract class InputSource {
  /**
   * @NOTE we might consider using generator or callback API
   * to ack messages after they are parsed on the service client side
   */
  public abstract getInputMessages(): AsyncGenerator<InputDTO[]>
}

export interface StoredInput {
  timestamp: Date
  matched: boolean

  /** Stringified InputDTO */
  input: string
}
