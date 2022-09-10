/* global ethers */
/* eslint prefer-const: "off" */

const { ethers } = require('hardhat')
const { getSelectors, FacetCutAction } = require('./libraries/diamond.js')

const VOLTA_CLAIM_MANAGER = "0x5339adE9332A604A1c957B9bC1C6eee0Bcf7a031";
const ROLES = {
  issuer: ethers.utils.namehash("issuer"),
  revoker: ethers.utils.namehash("revoker"),
  validator: ethers.utils.namehash("validator"),
  worker: ethers.utils.namehash("worker"),
};
const revocablePeriod = 60 * 60 * 24 * 7 * 4 * 12; // aprox. 12 months

async function deployDiamond(
  votingTimeLimit,
  rewardAmount,
  claimManagerAddress,
  roles
) {
  const accounts = await ethers.getSigners();
  const contractOwner = accounts[0];

  // deploy DiamondCutFacet
  const diamondCutFacet = await (
    await ethers.getContractFactory("DiamondCutFacet")
  ).deploy();
  await diamondCutFacet.deployed();
  console.log("DiamondCutFacet deployed:", diamondCutFacet.address);

  // deploy Diamond
  const { issuerRole, revokerRole, validatorRole, workerRole } = roles;
  console.log("\nRegistered Roles :: ", roles, "\n");
  const DiamondContract = await ethers.getContractFactory("Diamond");
  const diamond = await DiamondContract.deploy(
    contractOwner.address,
    diamondCutFacet.address,
    votingTimeLimit,
    rewardAmount,
    claimManagerAddress,
    issuerRole,
    revokerRole,
    validatorRole,
    workerRole,
    revocablePeriod
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
  console.log('')
  console.log('Deploying facets')
  const FacetNames = [
    "DiamondLoupeFacet",
    "OwnershipFacet",
    "IssuerFacet",
    "VotingFacet",
    "ProofManagerFacet",
  ];
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
  // let functionCall = diamondInit.interface.encodeFunctionData('init', rewardAmount)
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
if (require.main === module) {
  deployDiamond(
    15 * 60,
    ethers.utils.parseEther("1"),
    VOLTA_CLAIM_MANAGER,
    ROLES,
    revocablePeriod
  )
    // deployDiamond()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.deployDiamond = deployDiamond;
