const {
  createMerkleTree,
  hash,
  HASHING_FUNCTION,
} = require("@energyweb/greenproof-merkle-tree");

const getStringLeaves = (dataObject) => {
  const stringLeaves = [];
  
  Object.keys(dataObject).map((_key, i) => {
    stringLeaves.push(`${_key}: ${Object.values(dataObject)[ i ]}`);
  });

  return stringLeaves;
}

const getMerkleProof = (dataObject) => {
  const dataLeaves = getStringLeaves(dataObject);
  const merkle = createMerkleTree(dataLeaves);
  const hexLeaves = merkle.tree.getHexLeaves();
  const merkleRoot = merkle.tree.getHexRoot();

  const proofs = [];

  dataLeaves.map((leaf, i) => {
    const leafProof = merkle.tree.getHexProof(leaf);

    proofs.push({
      leaf,
      hexLeaf: hexLeaves[i],
      leafProof
    });
  });

  console.log("Data : ", dataObject);
  console.log("Data proofs ==> ", proofs);

  const merkleProof = {
    merkle,
    proofs,
    dataLeaves,
    hexLeaves,
    merkleRoot
  }

  return merkleProof;
}

const checkProof = () => {
  const values = ["value1", "value2", "value3", "value4", "value5"];
  const merkelTree = createMerkleTree(values, hash);

  const leaves = merkelTree.tree.getHexLeaves();

  const proof = merkelTree.tree.getHexProof(leaves[0]);


  console.log("Merkle Root of ", leaves, "==> ", merkelTree.tree.getHexRoot());
  console.log("Checking proof --> ", proof);
};

module.exports = {
  checkProof,
  getMerkleProof,
};
