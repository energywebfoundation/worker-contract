import type { ProportionalMatcher } from 'algorithms';
import { visualizeProportionalMatcher } from 'algorithms';

const makeColor = (color: string) => (content: any) => `<span style="color: ${color}">${content}</span>`;

export const matchIntoTable = (input: ProportionalMatcher.Input) => {
  return visualizeProportionalMatcher(input, makeColor);
}

