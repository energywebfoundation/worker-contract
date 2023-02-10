import { ProportionalMatcher } from './ProportionalMatcher';
import { sumBy } from 'lodash';

type ColorFunction = (color: string) => (content: string | number) => string;

/**
 * Replaces values in the table using `state` values added onto last `previous state`
 * Multiple calls will accumulate values
 * @param previousState - initial state
 * @returns
 */
const makeReplaceData = (previousState: number[][], makeColor: ColorFunction) => {
  return (template: string[][], state: number[][]) => {
    return template.map((row, rowIndex) => {
      return row.map((column, columnIndex) => {
        previousState[rowIndex] ||= [];
        previousState[rowIndex][columnIndex] ||= 0;

        const currentStateValue = state[rowIndex][columnIndex];
        const previousStateValue = previousState[rowIndex][columnIndex];

        let fieldValue: string;

        if (currentStateValue === 0) {
          fieldValue = previousStateValue.toString();
        } else {
          const sign = currentStateValue < 0 ? '-' : '+';
          const color = currentStateValue < 0 ? makeColor('red') : makeColor('green');

          const differenceText = `${color(sign)}${color(Math.abs(currentStateValue))}`;
          fieldValue = `${previousStateValue + currentStateValue} (${differenceText})`;
        }

        previousState[rowIndex][columnIndex] += currentStateValue;

        return column.replace('%%', fieldValue);
      });
    });
  };
};

const findMatchesVolume = (result: ProportionalMatcher.StrategyResult, id: string) => {
  const matches = result.matches.filter(m => m.consumptionId === id || m.generationId === id);

  return matches ? sumBy(matches, m => m.volume) : 0;
};

export const visualizeProportionalMatcher = (
  input: ProportionalMatcher.Input,
  makeColor: ColorFunction,
) => {
  const results = ProportionalMatcher.match(input);

  // Generic table template, with %% being replaced by actual values during render
  const tableTemplate = [
    [
      '',
      ...input.consumptions.map(c => `${c.id} (%%)`),
    ],
    ...input.generations.map(g => [
      `${g.id} (%%)`,
      ...input.consumptions.map(_ => '%%'),
    ]),
  ];

  const replaceData = makeReplaceData([
    [0, ...input.consumptions.map(c => c.volume)],
    ...input.generations.map((g) => [
      g.volume,
      ...input.consumptions.map(_ => 0),
    ]),
  ], makeColor);

  const tables = results.strategyResults.map((result) => {
    const data: number[][] = [];

    data.push([0, ...input.consumptions.map(c => -findMatchesVolume(result, c.id))]);

    input.generations.forEach(g => {
      data.push([-findMatchesVolume(result, g.id), ...input.consumptions.map(c => {
        const match = result.matches.find(m => m.consumptionId === c.id && m.generationId === g.id);

        const volume = match ? match.volume : 0;

        return volume;
      })]);
    });

    return {
      strategy: result.strategyName,
      data: replaceData(tableTemplate, data),
    };
  });

  return tables;
};
