const {
  getSelector,
  FacetCutAction,
  removeSelectors,
  findAddressPositionInFacets,
} = require("../scripts/libraries/diamond");

const chai = require("chai");
const { assert, expect } = require("chai");
const { parseEther } = require("ethers").utils;
const { ethers, network } = require("hardhat");
const { deployDiamond } = require("../scripts/deploy");
const {
  deployMockContract,
  MockContract,
  solidity,
} = require("ethereum-waffle");
const { claimManagerInterface, toBytes32 } = require("./utils");
chai.use(solidity);

const timeTravel = async (seconds) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine", []);
};

describe("IssuerFacet", function () {
  let diamondAddress;
  let diamondCutFacet;
  let diamondLoupeFacet;
  let ownershipFacet;
  let issuerFacet;
  let claimManagerMocked;
  let tx;
  let owner;
  let receipt;
  let result;
  const addresses = [];
  const rewardAmount = parseEther("1");
  const IS_SETTLEMENT = true;
  const timeLimit = 15 * 60;

  before(async () => {
    [
      owner,
      faucet,
      worker1,
      worker2,
      worker3,
      worker4,
      worker5,
      worker6,
      notEnrolledWorker,
      toRemoveWorker,
    ] = await ethers.getSigners();
    console.log(`\n`);
    //  Mocking claimManager
    claimManagerMocked = await deployMockContract(owner, claimManagerInterface);
    console.log("mock Contract :: ", claimManagerMocked);
    diamondAddress = await deployDiamond(
      timeLimit,
      rewardAmount,
      claimManagerMocked.address
    );
    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondAddress
    );
    diamondLoupeFacet = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddress
    );
    ownershipFacet = await ethers.getContractAt(
      "OwnershipFacet",
      diamondAddress
    );
    issuerFacet = await ethers.getContractAt("IssuerFacet", diamondAddress);
  });

  beforeEach(async () => {});

  afterEach(async () => {
    console.log("\t----------");
  });

  describe("\n** Proof issuance tests **\n", async () => {
    it("Authorized issuer can issue proofs", async () => {
      // TO-DO: check that authorized issuer can issue proof
    });

    it("Non authorized issuer cannot issue proofs", async () => {
      //TO-DO: check that non authorized issuer cannot issue proof
    });
  });

  describe("\n** Proof revocation tests **\n", () => {
    it("should allow an authorized entity to revoke non retired proof", async () => {
      //TODO: check that a non retired proof can be revoked
    });
    it("should revert if the proof is already retired", async () => {
      //TODO: check that a non retired proof can be revoked
    });

    it("should prevent a non authorized entity from revoking non retired proof", async () => {
      //TODO: check that not authorized user cannot revoke a non retired proof
    });

    it("should prevent authorized revoker from revoking a retired proof", async () => {
      //TODO: check thata retired proof cannot be revoked
    });
  });
});
