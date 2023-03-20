import type { ProportionalMatcher } from '@energyweb/algorithms';
import { visualizeProportionalMatcher } from '@energyweb/algorithms';

const makeColor = (color: string) => (content: any) => `<span style="color: ${color}">${content}</span>`;

export const matchIntoTable = (input: ProportionalMatcher.Input) => {
  return visualizeProportionalMatcher(input, makeColor);
}

