import { createMerkleTree, hash, defaultTransformFn, MerkleTree } from '../src';

type Match = Record<string, string | number>

describe('#createMerkleTree', () => {
  const hashMatch = (match: Match) => hash(JSON.stringify(match));
  const hashGeneration = (generation: Match) => hash(JSON.stringify(generation));
  const hashConsumption = (consumption: Match) =>
    hash(JSON.stringify(consumption));

  const createLeavesFromMatchingResult = ({
    matches = [],
    generations = [],
    consumptions = [],
  }: {
    matches?: Match[]
    consumptions?: Match[]
    generations?: Match[]
  }) => [
    ...matches.flatMap((match) => hashMatch(match)),
    ...generations.flatMap((generation) => hashGeneration(generation)),
    ...consumptions.flatMap((consumption) => hashConsumption(consumption)),
  ];

  it('should create merkle tree for matching result', () => {
    const [matchLeaf] = createLeavesFromMatchingResult({ matches: [{ id: 1 }] });

    const { verify, tree } = createMerkleTree([matchLeaf]);

    expect(typeof tree.getHexRoot()).toEqual('string');
    expect(verify(matchLeaf)).toEqual(true);
    expect(tree.getLeaf(0).toString('hex')).toEqual(matchLeaf);
  });

  it('should have the same roots for the same matching result', () => {
    const leaves = createLeavesFromMatchingResult({ matches: [{ id: 1 }] });

    const { tree: firstTree } = createMerkleTree(leaves);
    const { tree: secondTree } = createMerkleTree(leaves);

    expect(firstTree.getHexRoot()).toEqual(secondTree.getHexRoot());
  });

  describe('Match verifications', () => {
    it('should be able to verify if match is in the tree', () => {
      const [matchLeaf] = createLeavesFromMatchingResult({
        matches: [{ id: 1 }],
      });

      const { verify } = createMerkleTree([matchLeaf]);

      expect(verify(matchLeaf)).toEqual(true);
    });

    it('should be able to verify if match is not in the tree', () => {
      const [matchLeaf] = createLeavesFromMatchingResult({
        matches: [{ id: 1 }],
      });
      const [otherMatchLeaf] = createLeavesFromMatchingResult({
        matches: [{ id: 2 }],
      });

      const { verify } = createMerkleTree([matchLeaf]);

      expect(verify(otherMatchLeaf)).toEqual(false);
    });
  });

  describe('Leftover consumption verifications', () => {
    it('should be able to verify if leftover consumption is in the tree', () => {
      const leaves = createLeavesFromMatchingResult({
        consumptions: [{ volume: '1' }, { volume: '2' }],
      });

      const { verify } = createMerkleTree(leaves);

      expect(verify(leaves[0])).toEqual(true);
    });

    it('should be able to verify if leftover consumption is not in the tree', () => {
      const leaves = createLeavesFromMatchingResult({
        consumptions: [{ volume: '1' }, { volume: '2' }],
      });
      const [otherLeaf] = createLeavesFromMatchingResult({
        consumptions: [{ volume: '3' }],
      });

      const { verify } = createMerkleTree(leaves);

      expect(verify(otherLeaf)).toEqual(false);
    });
  });

  describe('Excess generation verifications', () => {
    it('should be able to verify if excess generation is in the tree', () => {
      const leaves = createLeavesFromMatchingResult({
        generations: [{ volume: '1' }, { volume: '2' }],
      });

      const { verify } = createMerkleTree(leaves);

      expect(verify(leaves[0])).toEqual(true);
    });

    it('should be able to verify if excess generation is not in the tree', () => {
      const leaves = createLeavesFromMatchingResult({
        generations: [{ volume: '1' }, { volume: '2' }],
      });
      const [otherLeaf] = createLeavesFromMatchingResult({
        generations: [{ volume: '3' }],
      });

      const { verify } = createMerkleTree(leaves);

      expect(verify(otherLeaf)).toEqual(false);
    });
  });

  it('should work for larger trees', () => {
    const leaves = createLeavesFromMatchingResult({
      matches: new Array(100).fill(null).map((_, index) => ({ match: index })),
      consumptions: new Array(100)
        .fill(null)
        .map((_, index) => ({ consumption: index })),
      generations: new Array(100)
        .fill(null)
        .map((_, index) => ({ generation: index })),
    });

    const { verify } = createMerkleTree(leaves);

    expect(verify(hashGeneration({ generation: 50 }))).toEqual(true);
    expect(verify(hashConsumption({ consumption: 50 }))).toEqual(true);
    expect(verify(hashMatch({ match: 50 }))).toEqual(true);
    expect(verify(hashGeneration({ generation: 500 }))).toEqual(false);
    expect(verify(hashConsumption({ consumption: 500 }))).toEqual(false);
    expect(verify(hashMatch({ match: 500 }))).toEqual(false);
  });

  describe('Verifiable objects', () => {
    it('should verify', () => {
      const {
        transformObjectToHashedLeaves,
        createVerifiableObjectHash,
        createMerkleTree,
      } = new MerkleTree({
        keyPairs: [
          ['volume', 'generationId'],
          ['volume', 'consumptionId'],
        ],
      });
      const leaves = [
        {
          volume: 10,
          generationId: 1,
        },
        {
          volume: 20,
          consumptionId: 1,
        },
      ].flatMap(transformObjectToHashedLeaves);
      console.log(leaves);
      const { verify } = createMerkleTree(leaves);

      expect(
        verify(
          createVerifiableObjectHash({
            volume: 10,
            generationId: 1,
          })!,
        ),
      ).toBe(true);
      expect(
        verify(
          hash(
            createVerifiableObjectHash({
              generationId: 1,
              volume: 10,
            })!,
          ),
        ),
      ).toBe(true);
    });
  });
});
