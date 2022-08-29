interface Target {
  [k: string]: string | number | boolean | null | undefined | Target | Target[] | string[] | number[] | boolean[]
}

const sortArray = (target: string[] | number[] | boolean[] | Target[]) => {
  const preparedArray = target.map(item => {
    if (typeof item === 'object') {
      return stringify(sortObject(item));
    }
    return String(item);
  }).sort();
  return preparedArray.map(item => {
    try {
      return JSON.parse(item) as Target;
    } catch {
      return item;
    }
  }) as string[] | Target[];
};

const sortObject = (target: Target) => {
  const keys = Object.keys(target);
  if (keys.length < 1) return target;

  keys.sort();

  return keys
    .reduce((acc, key) => {
      const value = target[key];
      if (value || typeof value === 'boolean') {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          acc[key] = value;
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
          acc[key] = sortObject(value);
        }

        if (Array.isArray(value)) {
          acc[key] = sortArray(value);
        }
      }
      return acc;
    }, {} as Target);
};

/**
 *
 * @param {object} target object containing string, number, boolean or other object containing those values.
 * @remember Other values like functions or arrays will be omitted.
 * @remember Function compatible with JSON.parse
 * @returns {string} sorted and stringified object
 */
export const stringify = (
  target: Target,
): string => {
  const sorted = sortObject(target);
  return JSON.stringify(sorted);
};
