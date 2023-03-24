const { hash, stringify, createPreciseProof, createMerkleTree } = require('@energyweb/merkle-tree');
const { randomUUID } = require('crypto');

const generateRandomInt = () => Math.floor(Math.random() * 1_000_000);

const generateJunkLeaf = () => ({ id: generateRandomInt(), generatorID: randomUUID(), volume: generateRandomInt(), consumerID: randomUUID() })

const generateProofData = (
  {
    id = undefined,
    generatorID = generateRandomInt(),
    volume = generateRandomInt(),
    consumerID = generateRandomInt(),
  } = {}) => {
  const junkLeaves = new Array(50).fill(null).map(() => generateJunkLeaf())
  const inputData = [{
    id: id !== undefined ? id : 1,
    generatorID: generatorID,
    volume,
    consumerID,
  }, ...junkLeaves ];
  
  const simpleInputData = [{
    id: id !== undefined ? id : 1,
    generatorID: generatorID,
    volume,
    consumerID,
  }]

  const inputHash = '0x' + hash(stringify(inputData)).toString('hex');
  const simpleInputHash = '0x' + hash(stringify(simpleInputData)).toString('hex');


  const leaves = inputData.map(i => createPreciseProof(i).getHexRoot());
  const oneLevelLeaves = simpleInputData.map(i => createPreciseProof(i).getHexRoot());

  const dataTree = createMerkleTree(leaves);
  const oneLevelDataTree = createMerkleTree(oneLevelLeaves);
  const matchResultProof = dataTree.getHexProof(leaves[0]);
  const matchResult = dataTree.getHexRoot();
  const simpleMatchResult = oneLevelDataTree.getHexRoot();

  const volumeTree = createPreciseProof(inputData[0]);
  const volumeLeaf = hash('volume' + JSON.stringify(volume));
  const volumeProof = volumeTree.getHexProof(volumeLeaf);
  const volumeRootHash = volumeTree.getHexRoot();

  return {
    inputHash,
    simpleInputHash,
    simpleMatchResult,
    volumeRootHash,
    matchResultProof,
    volume,
    volumeProof,
    volumeTree,
    consumerID,
    matchResult,
  };
};

module.exports = { generateProofData };
