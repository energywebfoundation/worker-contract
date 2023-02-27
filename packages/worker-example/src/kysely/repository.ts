import { Inject } from '@nestjs/common';
import type { Generated, Kysely } from 'kysely';

export const KYSELY_POOL = Symbol.for('KYSELY_POOL');

export const InjectKysely = (): ParameterDecorator => Inject(KYSELY_POOL);

/**
 * Table definition usually contains "Generated" field,
 * but the result from query is stripped of that.
 * So to not create new type just use Entity<TableMatch> or something,
 * that will strip that as well.
 */
export type Entity<T extends Record<string, any>> = { [K in keyof T]: T[K] extends Generated<infer R> ? R : T[K] }

export class Repository<T extends Kysely<any>> {
  constructor(
    @InjectKysely()
    protected db: T,
  ) {}
}
