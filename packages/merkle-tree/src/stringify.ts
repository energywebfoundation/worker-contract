import type { Target } from './types';
import { sortObject } from './utils';

/**
 *
 * @param {object} target object containing string, number, boolean, arrays or other object containing those values.
 * @remember Other values like functions will be omitted.
 * @remember Function compatible with JSON.parse
 * @returns {string} sorted and stringified object
 */
export const stringify = (
  target: Target,
): string => {
  const sorted = sortObject(target);
  return JSON.stringify(sorted);
};
