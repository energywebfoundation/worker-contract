import type { ProportionalMatcher } from '@energyweb/greenproof-algorithms';
import { visualizeProportionalMatcher } from '@energyweb/greenproof-algorithms';

const makeColor = (color: string) => (content: any) => `<span style="color: ${color}">${content}</span>`;

export const matchIntoTable = (input: ProportionalMatcher.Input) => {
  return visualizeProportionalMatcher(input, makeColor);
}

