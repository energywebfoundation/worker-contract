const { createPreciseProof } = require("@energyweb/greenproof-merkle-tree");

const getStringLeaves = (dataObject) => {
  const stringLeaves = [];
  
  Object.keys(dataObject).map((_key, i) => {
    stringLeaves.push(`${_key}: ${Object.values(dataObject)[ i ]}`);
  });

  return stringLeaves;
}

const getMerkleProof = (dataObject) => {
  const merkle = createPreciseProof(dataObject);
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

module.exports = {
  getMerkleProof,
};
