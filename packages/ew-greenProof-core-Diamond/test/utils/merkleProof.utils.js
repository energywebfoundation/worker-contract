const {
  createMerkleTree,
  hash,
  HASHING_FUNCTION,
} = require("@energyweb/greenproof-merkle-tree");

const checkProof = () => {
  const leaves = ["value1", "value2", "value3"];
  const merkelTree = createMerkleTree(leaves);
};

module.exports = {
  checkProof,
};
