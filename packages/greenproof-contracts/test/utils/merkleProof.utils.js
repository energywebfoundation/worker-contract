const {
  createMerkleTree,
  createPreciseProof,
} = require("@energyweb/greenproof-merkle-tree");

const getStringLeaves = (dataObject) => {
  const stringLeaves = [];
  
  Object.keys(dataObject).map((_key, i) => {
    stringLeaves.push(`${_key}: ${Object.values(dataObject)[ i ]}`);
  });

  return stringLeaves;
}

const arr = [
  {
    id: 1,
    generatorID: 2,
    volume: 10,
    consumerID: 500
  },
  {
    id: 2,
    generatorID: 3,
    volume: 10,
    consumerID: 522
  },
  {
    id: 3,
    generatorID: 4,
    volume: 10,
    consumerID: 52
  },
  {
    id: 4,
    generatorID: 5,
    volume: 42,
    consumerID: 53
  },
  {
    id: 5,
    generatorID: 5,
    volume: 10,
    consumerID: 51
  },
]
const leaves = arr.map(item => createPreciseProof(item).getHexRoot())
const tree = createMerkleTree(leaves);

const leaf = leaves[1];
const proof = tree.getHexProof(leaf);
const root = tree.getHexRoot()

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
