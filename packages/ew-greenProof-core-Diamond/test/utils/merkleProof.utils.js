const {
  createMerkleTree,
  createPreciseProof,
} = require("@energyweb/greenproof-merkle-tree");

const {createHash} = require('crypto');

const hash = (...data) => createHash('SHA256').update(data.join('')).digest('hex');

const getStringLeaves = (dataObject) => {
  const stringLeaves = [];
  
  Object.keys(dataObject).map((_key, i) => {
    stringLeaves.push(`${_key}: ${Object.values(dataObject)[ i ]}`);
  });

  return stringLeaves;
}

const getMerkleProof = (dataObject) => {
  const merkle = createPreciseProof(dataObject, hash);
  const hexLeaves = merkle.getHexLeaves()
  const merkleRoot = merkle.getHexRoot();

  const proofs = [];

  hexLeaves.map((hexleaf, i) => {

    proofs.push({
      leaf: getStringLeaves(dataObject)[i], //human readable piece of data
      hexLeaf: hexleaf,
      leafProof: merkle.getHexProof(hexleaf),
    });
  });

  console.log("Data : ", dataObject);
  console.log("RootHash ==> ", merkleRoot);
  console.log("Data proofs ==> ", proofs);

  const merkleProof = {
    merkle,
    proofs,
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
