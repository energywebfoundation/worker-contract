import {getConsumptionHash, getGenerationHash, getMatchHash, hashMatchingResult} from '../src';
import type {MatchingResult} from '../src/interfaces';

describe('#hashMatchingResult', () => {
  it('should create merkle tree for matching result', () => {
    const matchingResult: MatchingResult = {
      matches: [{id: 1}],
      leftoverEntities: [[], []],
    };

    const {root} = hashMatchingResult(matchingResult);

    expect(typeof root).toEqual('string');
  });

  it('should have the same roots for the same matching result', () => {
    const matchingResult: MatchingResult = {
      matches: [{id: 1}],
      leftoverEntities: [[], []],
    };

    const {root: firstRoot} = hashMatchingResult(matchingResult);
    const {root: secondRoot} = hashMatchingResult(matchingResult);

    expect(firstRoot).toEqual(secondRoot);
  });

  describe('Match verifications', () => {
    it('should be able to verify if match is in the tree', () => {
      const someMatch = {id: 1};
      const matchingResult: MatchingResult = {
        matches: [someMatch],
        leftoverEntities: [[], []],
      };

      const {verify} = hashMatchingResult(matchingResult);

      expect(verify(getMatchHash(someMatch))).toEqual(true);
    });

    it('should be able to verify if match is not in the tree', () => {
      const someMatch = {id: 1};
      const otherMatch = {id: 2};
      const matchingResult: MatchingResult = {
        matches: [someMatch],
        leftoverEntities: [[], []],
      };

      const {verify} = hashMatchingResult(matchingResult);

      expect(verify(getMatchHash(otherMatch))).toEqual(false);
    });
  });

  describe('Leftover consumption verifications', () => {
    it('should be able to verify if leftover consumption is in the tree', () => {
      const someConsumption = {id: 1};
      const matchingResult: MatchingResult = {
        matches: [],
        leftoverEntities: [[someConsumption], []],
      };

      const {verify} = hashMatchingResult(matchingResult);

      expect(verify(getConsumptionHash(someConsumption))).toEqual(true);
    });

    it('should be able to verify if leftover consumption is not in the tree', () => {
      const someConsumption = {id: 1};
      const otherConsumption = {id: 2};
      const matchingResult: MatchingResult = {
        matches: [],
        leftoverEntities: [[someConsumption], []],
      };

      const {verify} = hashMatchingResult(matchingResult);

      expect(verify(getMatchHash(otherConsumption))).toEqual(false);
    });
  });

  describe('Excess generation verifications', () => {
    it('should be able to verify if excess generation is in the tree', () => {
      const someGeneration = {id: 1};
      const matchingResult: MatchingResult = {
        matches: [],
        leftoverEntities: [[], [someGeneration]],
      };

      const {verify} = hashMatchingResult(matchingResult);

      expect(verify(getGenerationHash(someGeneration))).toEqual(true);
    });

    it('should be able to verify if excess generation is not in the tree', () => {
      const someGeneration = {id: 1};
      const otherGeneration = {id: 2};
      const matchingResult: MatchingResult = {
        matches: [],
        leftoverEntities: [[], [someGeneration]],
      };

      const {verify} = hashMatchingResult(matchingResult);

      expect(verify(getMatchHash(otherGeneration))).toEqual(false);
    });
  });

  it('should work for larger trees', () => {
    const matches = new Array(100).fill(null).map((_, index) => ({match: index}));
    const consumption = new Array(100).fill(null).map((_, index) => ({consumption: index}));
    const generation = new Array(100).fill(null).map((_, index) => ({generation: index}));


    const {verify} = hashMatchingResult({matches, leftoverEntities: [consumption, generation]});

    expect(verify(getGenerationHash({generation: 50}))).toEqual(true);
    expect(verify(getConsumptionHash({consumption: 50}))).toEqual(true);
    expect(verify(getMatchHash({match: 50}))).toEqual(true);
    expect(verify(getGenerationHash({generation: 500}))).toEqual(false);
    expect(verify(getConsumptionHash({consumption: 500}))).toEqual(false);
    expect(verify(getMatchHash({match: 500}))).toEqual(false);
  });
});