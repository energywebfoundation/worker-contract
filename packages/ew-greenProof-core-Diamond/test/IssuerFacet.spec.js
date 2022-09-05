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

let diamondAddress;
let diamondCutFacet;
let diamondLoupeFacet;
let ownershipFacet;
let issuerFacet;
let tx;
let owner;
let receiver;
let minter;
let validator;
let receipt;
let result;
let receiverAddress;
let amount;
let productType;
let start;
let end;
let winninMatch;
let producerRef;
let grantRole;
let revokeRole;

const addresses = [];
const rewardAmount = parseEther("1");
const IS_SETTLEMENT = true;
const timeLimit = 15 * 60;
const issuerRole = ethers.utils.namehash(
  "minter.roles.greenproof.apps.iam.ewc"
);
const validatorRole = ethers.utils.namehash(
  "validator.roles.greenproof.apps.iam.ewc"
);
const revokerRole = ethers.utils.namehash(
  "revoker.roles.greenproof.apps.iam.ewc"
);
const workerRole = ethers.utils.namehash(
  "workerRole.roles.greenproof.apps.iam.ewc"
);
const defaultVersion = 1;
const VC = ethers.utils.namehash("data to validate");

describe("IssuerFacet", function () {
  before(async () => {
    [
      owner,
      validator,
      minter,
      receiver,
      worker3,
      worker4,
      worker5,
      worker6,
      notEnrolledWorker,
      toRemoveWorker,
    ] = await ethers.getSigners();

    console.log(`\n`);

    //  Mocking claimManager
    const claimManagerMocked = await deployMockContract(
      owner,
      claimManagerInterface
    );

    grantRole = async (operatorWallet, role) => {
      await claimManagerMocked.mock.hasRole
        .withArgs(operatorWallet.address, role, defaultVersion)
        .returns(true);
    };

    revokeRole = async (operatorWallet, role) => {
      await claimManagerMocked.mock.hasRole
        .withArgs(operatorWallet.address, role, defaultVersion)
        .returns(false);
    };

    const roles = {
      issuerRole,
      revokerRole,
      validatorRole,
      workerRole,
    };

    diamondAddress = await deployDiamond(
      timeLimit,
      rewardAmount,
      claimManagerMocked.address,
      roles
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

  beforeEach(async () => {
    receiverAddress = receiver.address;
    amount = 42;
    productType = 1;
    start = 1234567890;
    end = 9876543210;
    winninMatch = "MATCH_RESULT_1";
    secondMatch = "MATCH_RESULT_2";
    producerRef = ethers.utils.namehash("energyWeb");
  });

  afterEach(async () => {
    console.log("\t----------");
  });

  describe("\n** Proof issuance tests **\n", () => {
    it("reverts when we try to validate request before request issuance", async () => {
      const VC = ethers.utils.namehash("data to validate");
      await grantRole(validator, validatorRole);
      expect(
        issuerFacet
          .connect(validator)
          ["validateIssuanceRequest(string,bytes32)"](winninMatch, VC)
      ).to.be.revertedWith("Validation not requested");
    });

    it("Can send proof issuance requests", async () => {
      expect(
        await issuerFacet
          .connect(owner)
          .requestProofIssuance(winninMatch, receiverAddress)
      ).to.emit(issuerFacet, "IssuanceRequested");
    });

    it("Reverts when one re-sends an already requested issuance", async () => {
      expect(
        issuerFacet
          .connect(owner)
          .requestProofIssuance(winninMatch, receiverAddress)
      ).to.be.revertedWith("Request: Already requested proof");
    });

    it("Non Authorized validator cannot validate issuance requests", async () => {
      await revokeRole(validator, validatorRole);
      expect(
        issuerFacet
          .connect(validator)
          ["validateIssuanceRequest(string,bytes32)"](winninMatch, VC)
      ).to.be.revertedWith("Access: Not a validator");
    });

    it("Non authorized issuer cannot issue proofs", async () => {
      await revokeRole(validator, validatorRole);
      await expect(
        issuerFacet
          .connect(validator)
          [
            "validateIssuanceRequest(string,bytes32,address,uint256,uint256,uint256,uint256,bytes32)"
          ](
            winninMatch,
            VC,
            receiverAddress,
            amount,
            productType,
            start,
            end,
            producerRef
          )
      ).to.be.revertedWith("Access: Not a validator");
    });

    it("Authorized validator can validate issuance requests", async () => {
      await grantRole(validator, validatorRole);
      expect(
        await issuerFacet
          .connect(validator)
          ["validateIssuanceRequest(string,bytes32)"](winninMatch, VC)
      ).to.emit(issuerFacet, "RequestAccepted");
    });

    it("Authorized issuer can issue proofs", async () => {
      await grantRole(validator, validatorRole);
      let id;
      let tx;
      //step 1: request issuance
      expect(
        await issuerFacet
          .connect(owner)
          .requestProofIssuance(secondMatch, receiverAddress)
      ).to.emit(issuerFacet, "IssuanceRequested");

      //step 2: validate issuance
      tx = await issuerFacet
        .connect(validator)
        [
          "validateIssuanceRequest(string,bytes32,address,uint256,uint256,uint256,uint256,bytes32)"
        ](
          secondMatch,
          VC,
          receiverAddress,
          amount,
          productType,
          start,
          end,
          producerRef
        );
      await tx.wait();
      expect(tx).to.emit(issuerFacet, "ProofMinted").withArgs(2, amount);
      //TO-DO: verify that the NFT has been correctly issued
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
