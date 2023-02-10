import { sum } from 'lodash';

/**
 * @NOTE the best result may be achevied if `expected` is sorted
 * desceding by the value - this way, expected with the highest volume
 * will receive fractions, that could not be distributed evenly.
 * @param limit - if we don't want to distribute more than `expected` volume set to true
 * @returns
 */
export const distributeVolume = (toDistribute: number, expected: number[], limit: boolean): number[] => {
  const expectedSum = sum(expected);

  // Compute integer distribution
  const distributedVolumes = expected.map(e => {
    const volume = (e / expectedSum) * toDistribute;
    const roundedVolume = Math.floor(volume);

    return roundedVolume;
  });

  // Because of flooring some volume may be not distributed
  // so distribute it one by one
  // This will be (expected.length - 1) max iterations
  let divisionRest = toDistribute - sum(distributedVolumes);
  let i = 0;
  while (divisionRest > 0 && expected.length > 0) {
    divisionRest -= 1;
    distributedVolumes[i] += 1;
    i = (i + 1) % (distributedVolumes.length - 1);
  }

  if (limit) {
    return distributedVolumes.map((v, i) => Math.min(v, expected[i]));
  } else {
    return distributedVolumes;
  }
};
