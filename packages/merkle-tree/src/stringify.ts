interface Target {
  [k: string]: string | number | boolean | null | undefined | Target
}

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
        if (typeof value === 'object') {
          acc[key] = sortObject(value);
        }
      }
      return acc;
    }, {} as Target);
};

/**
 *
 * @param {object} target object containing string, number, boolean or other object containing this values.
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
