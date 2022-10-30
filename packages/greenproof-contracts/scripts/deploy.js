/* global ethers */
/* eslint prefer-const: "off" */

const { ethers } = require('hardhat');
const { config } = require("dotenv");
const { getSelectors, FacetCutAction } = require('./libraries/diamond.js');

config();

const ROLES = {
  issuerRole: ethers.utils.namehash("issuer"),
  revokerRole: ethers.utils.namehash("revoker"),
  workerRole: ethers.utils.namehash("worker"),
};
const defaultRevocablePeriod = 60 * 60 * 24 * 7 * 4 * 12; // aprox. 12 months

const getRoles = () => {
  const issuerRole = process.env.ISSUER_ROLE !== "" ? ethers.utils.namehash(process.env.ISSUER_ROLE) : ethers.utils.namehash(process.env.DEFAULT_ROLE)
  const revokerRole = process.env.REVOKER_ROLE !== "" ? ethers.utils.namehash(process.env.REVOKER_ROLE) : ethers.utils.namehash(process.env.DEFAULT_ROLE)
  const workerRole = process.env.WORKER_ROLE !== "" ? ethers.utils.namehash(process.env.WORKER_ROLE) : ethers.utils.namehash(process.env.DEFAULT_ROLE)

  return {
    issuerRole,
    revokerRole,
    workerRole
  };
}

const runningFromCLI = () => require.main === module
let FacetNames;

async function deployDiamond(
  votingTimeLimit,
  rewardAmount,
  claimManagerAddress,
  claimRevocationRegistryAddress,
  roles,
  isDiamondTest = false,
  contractOwner,
  revocablePeriod = defaultRevocablePeriod
) {
  const accounts = await ethers.getSigners();
  if (contractOwner === undefined)
  {
    contractOwner = accounts[ 0 ].address;
  }

  // deploy DiamondCutFacet
  const diamondCutFacet = await (
    await ethers.getContractFactory("DiamondCutFacet")
  ).deploy();
  await diamondCutFacet.deployed();
  console.log("DiamondCutFacet deployed:", diamondCutFacet.address);

  // deploy Diamond
  const { issuerRole, revokerRole, workerRole } = roles;
  const DiamondContract = await ethers.getContractFactory("Diamond");
  const diamond = await DiamondContract.deploy(
    contractOwner,
    diamondCutFacet.address,
    votingTimeLimit,
    rewardAmount,
    claimManagerAddress,
    issuerRole,
    revokerRole,
    workerRole,
    revocablePeriod,
    claimRevocationRegistryAddress
  );
  await diamond.deployed();
  console.log("Diamond deployed:", diamond.address);

  // deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const DiamondInit = await ethers.getContractFactory("DiamondInit");
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.deployed();
  console.log("DiamondInit deployed:", diamondInit.address);

  // deploy facets
  console.log('--------------')
  console.log('Deploying facets')
  if (isDiamondTest) {

    FacetNames = [ "DiamondLoupeFacet", "OwnershipFacet", "IssuerFacet" ];
  } else {

    FacetNames = [
      "DiamondLoupeFacet",
      "OwnershipFacet",
      "IssuerFacet",
      "VotingFacet",
      "ProofManagerFacet",
    ];
  }
    
  console.log("Facets to add to the diamond :: ", FacetNames);
  const cut = [];
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    console.log(`${FacetName} deployed: ${facet.address}`);
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
    });
  }

  // upgrade diamond with facets
  console.log('\n **** [DiamondCut] : Adding facets to Diamond\n')
  console.log('List of Cuts to execute :', cut)
  const diamondCut = await ethers.getContractAt('IDiamondCut', diamond.address)
  let tx
  let receipt
  // call to init function
  let functionCall = diamondInit.interface.encodeFunctionData('init')
  tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall)
  console.log('Diamond cut tx: ', tx.hash)
  receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  console.log("Completed diamond cut");
  return diamond.address;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (runningFromCLI()) {
  const rewardAmount = (
    process.env.REWARD_AMOUNT_IN_ETHER !== "" ?
      ethers.utils.parseEther(process.env.REWARD_AMOUNT_IN_ETHER) :
      ethers.utils.parseEther("1")
    );
  deployDiamond(
    15 * 60,
    rewardAmount,
    process.env.VOLTA_CLAIM_MANAGER,
    process.env.VOLTA_CLAIMS_REVOCATION_REGISTRY,
    getRoles(),
    false
  )
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.deployDiamond = deployDiamond;
