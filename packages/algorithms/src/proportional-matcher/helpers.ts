import type { Entity } from './types';

export const groupByUnique = <T extends Record<string, any>, P extends keyof T>(entities: T[], prop: P): Record<string, T> => {
  const grouped = {} as Record<string, T>;

  entities.forEach(e => grouped[e[prop]] = e);

  return grouped;
};

export const groupBy = <T extends Record<string, any>, P extends keyof T>(entities: T[], prop: P): Record<string, T[]> => {
  const grouped = {} as Record<string, T[]>;

  entities.forEach(e => {
    grouped[e[prop]] ||= [];
    grouped[e[prop]].push(e);
  });

  return grouped;
};

export const filterRecord = <T extends Entity>(record: Record<string, T>, cb: (e: T) => boolean) => {
  const filteredRecord = {} as Record<string, T>;

  for (const key in record) {
    const value = record[key];

    if (cb(value)) {
      filteredRecord[key] = value;
    }
  }

  return filteredRecord;
};

export const loopUntil = <T>(cb: () => T, condition: (result: T) => boolean, maxIterations = 50_000): T[] => {
  const results: T[] = [];

  let i = 0;

  while (true) {
    if (i >= maxIterations) {
      throw new Error(`Matching loop exceeded maximum number of ${maxIterations} max iterations`);
    }

    const result = cb();
    results.push(result);

    if (condition(result)) {
      break;
    }

    ++i;
  }

  return results;
};
