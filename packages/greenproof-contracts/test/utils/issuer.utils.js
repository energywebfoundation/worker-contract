const {
  hash,
  stringify,
  createPreciseProof,
  createMerkleTree,
} = require("@energyweb/greenproof-merkle-tree");

const generateRandomInt = () => Math.floor(Math.random() * 1_000_000);

const generateProofData = ({
  id = undefined,
  generatorID = generateRandomInt(),
  volume = generateRandomInt(),
  consumerID = generateRandomInt(),
} = {}) => {
  const inputData = [
    {
      id: id !== undefined ? id : 1,
      generatorID: generatorID,
      volume,
      consumerID,
    },
  ];

  const inputHash = "0x" + hash(stringify(inputData)).toString("hex");

  const leaves = inputData.map((i) => createPreciseProof(i).getHexRoot());
  const dataTree = createMerkleTree(leaves);
  const matchResultProof = dataTree.getHexProof(leaves[0]);
  const matchResult = dataTree.getHexRoot();

  const volumeTree = createPreciseProof(inputData[0]);
  const volumeLeaf = hash("volume" + JSON.stringify(volume));
  const volumeProof = volumeTree.getHexProof(volumeLeaf);
  const volumeRootHash = volumeTree.getHexRoot();

  return {
    inputHash,
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
