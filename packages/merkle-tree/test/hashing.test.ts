import { createPreciseProof, createMerkleTree, verify, hash } from '../src';

type Match = Record<string, string | number>

describe('#createMerkleTree', () => {
  const hashMatch = (match: Match) =>
    createPreciseProof(match).getHexRoot();
  const hashGeneration = (generation: Match) =>
    createPreciseProof(generation).getHexRoot();
  const hashConsumption = (consumption: Match) =>
    createPreciseProof(consumption).getHexRoot();

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
    const [matchLeaf] = createLeavesFromMatchingResult({
      matches: [{ id: 1, generationId: 1, volume: 10 }],
    });

    const tree = createMerkleTree([matchLeaf]);

    const proof = tree.getHexProof(matchLeaf);

    expect(typeof tree.getHexRoot()).toEqual('string');
    expect(
      verify({ proof, leaf: matchLeaf, root: tree.getHexRoot()}),
    ).toEqual(true);
    expect('0x' + tree.getLeaf(0).toString('hex')).toEqual(matchLeaf);
  });

  it('should have the same roots for the same matching result', () => {
    const leaves = createLeavesFromMatchingResult({
      matches: [{ id: 1, generationId: 1, volume: 10 }],
    });

    const firstTree = createMerkleTree(leaves);
    const secondTree = createMerkleTree(leaves);

    expect(firstTree.getHexRoot()).toEqual(secondTree.getHexRoot());
  });

  describe('Match verifications', () => {
    it('should be able to verify if match is in the tree', () => {
      const [matchLeaf] = createLeavesFromMatchingResult({
        matches: [
          { id: 1, generationId: 1, volume: 10 },
          { id: 10, generationId: 10, volume: 100 },
        ],
      });

      const tree = createMerkleTree([matchLeaf]);

      expect(
        verify({
          proof: tree.getHexProof(matchLeaf),
          leaf: matchLeaf,
          root: tree.getHexRoot(),
        }),
      ).toEqual(true);
    });

    it('should be able to verify if match is not in the tree', () => {
      const [matchLeaf] = createLeavesFromMatchingResult({
        matches: [{ id: 1, generationId: 1, volume: 10 }],
      });
      const [otherMatchLeaf] = createLeavesFromMatchingResult({
        matches: [{ id: 2, generationId: 2, volume: 20 }],
      });

      const tree = createMerkleTree([matchLeaf]);

      expect(
        verify({
          proof: tree.getHexProof(otherMatchLeaf),
          leaf: otherMatchLeaf,
          root: tree.getHexRoot(),
        }),
      ).toEqual(false);
    });
  });

  describe('Leftover consumption verifications', () => {
    it('should be able to verify if leftover consumption is in the tree', () => {
      const [leaf] = createLeavesFromMatchingResult({
        consumptions: [{ volume: '1' }, { volume: '2' }],
      });

      const tree = createMerkleTree([leaf]);

      expect(
        verify({
          proof: tree.getHexProof(leaf),
          leaf,
          root: tree.getHexRoot(),
        }),
      ).toEqual(true);
    });

    it('should be able to verify if leftover consumption is not in the tree', () => {
      const leaves = createLeavesFromMatchingResult({
        consumptions: [{ volume: '1' }, { volume: '2' }],
      });
      const [otherLeaf] = createLeavesFromMatchingResult({
        consumptions: [{ volume: '3' }],
      });

      const tree = createMerkleTree(leaves);

      expect(
        verify({
          proof: tree.getHexProof(otherLeaf),
          leaf: otherLeaf,
          root: tree.getHexRoot(),
        }),
      ).toEqual(false);
    });
  });

  describe('Excess generation verifications', () => {
    it('should be able to verify if excess generation is in the tree', () => {
      const [leaf] = createLeavesFromMatchingResult({
        generations: [{ volume: '1' }, { volume: '2' }],
      });

      const tree = createMerkleTree([leaf]);

      expect(
        verify({
          proof: tree.getHexProof(leaf),
          leaf,
          root: tree.getHexRoot(),
        }),
      ).toEqual(true);
    });

    it('should be able to verify if excess generation is not in the tree', () => {
      const leaves = createLeavesFromMatchingResult({
        generations: [{ volume: '1' }, { volume: '2' }],
      });
      const [otherLeaf] = createLeavesFromMatchingResult({
        generations: [{ volume: '3' }],
      });

      const tree = createMerkleTree(leaves);

      expect(
        verify({
          proof: tree.getHexProof(otherLeaf),
          leaf: otherLeaf,
          root: tree.getHexRoot(),
        }),
      ).toEqual(false);
    });
  });

  it('should work for larger trees', () => {
    const leaves = createLeavesFromMatchingResult({
      matches: new Array(100)
        .fill(null)
        .map((_, index) => ({ match: index, volume: index * 2 })),
      consumptions: new Array(100)
        .fill(null)
        .map((_, index) => ({ consumption: index, volume: index * 2 })),
      generations: new Array(100)
        .fill(null)
        .map((_, index) => ({ generation: index, volume: index * 2 })),
    });

    const tree = createMerkleTree(leaves);

    const correctGenerationLeaf = hashGeneration({
      generation: 50,
      volume: 100,
    });
    const correctConsumptionLeaf = hashConsumption({
      consumption: 50,
      volume: 100,
    });
    const correctHashLeaf = hashMatch({ match: 50, volume: 100 });

    const fakeGenerationLeaf = hashGeneration({ generation: 500, volume: 1000 });
    const fakeConsumptionLeaf = hashConsumption({
      consumption: 500,
      volume: 1000,
    });
    const fakeMatchLeaf = hashMatch({ match: 500, volume: 1000 });

    expect(
      verify({
        proof: tree.getHexProof(correctGenerationLeaf),
        leaf: correctGenerationLeaf,
        root: tree.getHexRoot(),
      }),
    ).toEqual(true);
    expect(
      verify({
        proof: tree.getHexProof(correctConsumptionLeaf),
        leaf: correctConsumptionLeaf,
        root: tree.getHexRoot(),
      }),
    ).toEqual(true);
    expect(
      verify({
        proof: tree.getHexProof(correctHashLeaf),
        leaf: correctHashLeaf,
        root: tree.getHexRoot(),
      }),
    ).toEqual(true);
    expect(
      verify({
        proof: tree.getHexProof(fakeGenerationLeaf),
        leaf: fakeGenerationLeaf,
        root: tree.getHexRoot(),
      }),
    ).toEqual(false);
    expect(
      verify({
        proof: tree.getHexProof(fakeConsumptionLeaf),
        leaf: fakeConsumptionLeaf,
        root: tree.getHexRoot(),
      }),
    ).toEqual(false);
    expect(
      verify({
        proof: tree.getHexProof(fakeMatchLeaf),
        leaf: fakeMatchLeaf,
        root: tree.getHexRoot(),
      }),
    ).toEqual(false);
  });
});

describe('Precise Proof', () => {
  it('should generate valid precise proof', () => {
    const target = {
      generationId: 1,
      volume: 10,
    };
    const pp = createPreciseProof(target);

    const rootHash = pp.getHexRoot();

    for (const [key, value] of Object.entries(target)) {
      const leaf = hash(key + JSON.stringify(value));
      const proof = pp.getHexProof(leaf);
      expect(verify({ leaf, proof, root: rootHash })).toBe(
        true,
      );
    }

  });
});
