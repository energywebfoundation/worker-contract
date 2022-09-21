const chai = require("chai");
const { expect } = require("chai");
const { parseEther } = require("ethers").utils;
const { ethers, network } = require("hardhat");
const { deployDiamond } = require("../scripts/deploy");
const {
  deployMockContract,
  solidity,
} = require("ethereum-waffle");
const { claimManagerInterface, getMerkleProof } = require("./utils");
const { createMerkleTree, createPreciseProof, hash } = require('@energyweb/greenproof-merkle-tree')
chai.use(solidity);

const timeTravel = async (seconds) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine", []);
};

let issuerFacet;
let diamondAddress;
let proofManagerFacet;
let owner;
let receiver;
let validator;
let receiverAddress;
let amount;
let productType;
let start;
let end;
let winninMatch;
let producerRef;
let grantRole;
let revokeRole;
let VC;
let merkleInfos;
let testCounter = 0;
let lastTokenID = 0;
let provider;

const rewardAmount = parseEther("1");
const timeLimit = 15 * 60;
const revocablePeriod = 60 * 60 * 24 * 7 * 4 * 12; // aprox. 12 months
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
const proofID1 = 1;
const proofID2 = 2;

describe("IssuerFacet", function () {
  before(async () => {
    [
      owner,
      validator,
      minter,
      receiver,
      revoker,
      nonAuthorizedOperator,
      worker5,
      worker6,
      notEnrolledWorker,
      toRemoveWorker,
    ] = await ethers.getSigners();
    console.log(`\n`);

    provider = ethers.provider;

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
    proofManagerFacet = await ethers.getContractAt(
      "ProofManagerFacet",
      diamondAddress
    );

    receiverAddress = receiver.address;
    amount = 42;
    productType = 1;
    start = 1234567890;
    end = 9876543210;
    winninMatch = "MATCH_RESULT_1";
    secondMatch = "MATCH_RESULT_2";
    rejectedMatch = "MATCH_RESULT_TO_BE_REJECTED";
    producerRef = ethers.utils.namehash("energyWeb");

    const data = {
      receiverAddress,
      amount,
      productType,
      timeFrame: {   
        start,
        end,
      },
      winninMatch,
      producerRef,
      type: "solar",
      generatorID: 4221
    }
    merkleInfos = getMerkleProof(data);
    VC = merkleInfos.merkleRoot;
  });

  beforeEach(async () => {
    console.log(`Test ${++testCounter} :`);
  });

  afterEach(async () => {
    console.log("\t----------");
  });

  describe("\n** Proof issuance tests **\n", () => {
    it("reverts when we try to validate request before request issuance", async () => {
      await grantRole(validator, validatorRole);
      await expect(
        issuerFacet
          .connect(validator)
          ["validateIssuanceRequest(string,bytes32,address)"](winninMatch, VC, receiverAddress)
      ).to.be.revertedWith("Validation not requested");
    });

    it("Can send proof issuance requests", async () => {
      expect(
        await issuerFacet
          .connect(owner)
          .requestProofIssuance(winninMatch, receiverAddress)
      ).to.emit(issuerFacet, "IssuanceRequested");
      lastTokenID++;
    });

    it("Reverts when one re-sends an already requested issuance", async () => {
      await expect(
        issuerFacet
          .connect(owner)
          .requestProofIssuance(winninMatch, receiverAddress)
      ).to.be.revertedWith("Request: Already requested proof");
    });

    it("Non Authorized validator cannot validate issuance requests", async () => {
      await revokeRole(validator, validatorRole);
      await expect(
        issuerFacet
          .connect(validator)
          ["validateIssuanceRequest(string,bytes32,address)"](winninMatch, VC, receiverAddress)
      ).to.be.revertedWith("Access: Not a validator");
    });

    it("Non authorized validator cannot validate nor mint proofs", async () => {
      
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

    it("validator can reject issuance requests", async () => {
      await grantRole(validator, validatorRole);
      
      //Request issuance
      tx = await issuerFacet.connect(owner).requestProofIssuance(rejectedMatch, receiverAddress);
      expect(tx).to.emit(issuerFacet, "IssuanceRequested");
      lastTokenID++;

      //Rejection
      expect(
        await issuerFacet
          .connect(validator)
          .rejectIssuanceRequest(rejectedMatch)
      ).to.emit(issuerFacet, "RequestRejected").withArgs(lastTokenID);
      lastTokenID--;

    });

    it("Should revert when we try to reject an already rejected request", async () => {
      await grantRole(validator, validatorRole);
      
      //Rejection
      await expect(
        issuerFacet
          .connect(validator)
          .rejectIssuanceRequest(rejectedMatch)
      ).to.be.revertedWith("Rejection: Already rejected")
    });

    it("Should allow a new request issuance of rejected requests", async () => {
      //Request previously rejected request
      tx = await issuerFacet.connect(owner).requestProofIssuance(rejectedMatch, receiverAddress);
      expect(tx).to.emit(issuerFacet, "IssuanceRequested");
      lastTokenID++;
    });

    it("Should revert when non authorized user tries to reject a request", async () => {
      await revokeRole(validator, validatorRole);
      
      //Rejection
      await expect(
        issuerFacet
          .connect(validator)
          .rejectIssuanceRequest(rejectedMatch)
      ).to.be.revertedWith("Access: Not a validator")
    });

    it("Should revert when we try to reject a non existing request", async () => {
      await grantRole(validator, validatorRole);
      
      await expect(
        issuerFacet
          .connect(validator)
          .rejectIssuanceRequest("Non existing Request")
      ).to.be.revertedWith("Rejection: Not a valid match");
    });

    it("Authorized validator can validate issuance requests", async () => {
      // lastTokenID++;
      await grantRole(validator, validatorRole);
      expect(
        await issuerFacet
          .connect(validator)
          ["validateIssuanceRequest(string,bytes32,address)"](winninMatch, VC, receiverAddress)
      ).to.emit(issuerFacet, "RequestAccepted");
    });

    it("Should revert when we try to reject an already validated request", async () => {
      await grantRole(validator, validatorRole);

      await expect(
        issuerFacet
          .connect(validator)
          .rejectIssuanceRequest(winninMatch)
      ).to.be.revertedWith("Rejection: Already validated");
    })

    it("checks that the certified generation volume is zero before minting", async () => {
      lastTokenID++;
      const amountBeforMint = await issuerFacet.balanceOf(receiverAddress, lastTokenID);
      expect(amountBeforMint).to.equal(0);
      lastTokenID--;
    });

    it("Authorized validator can validate and mint proofs", async () => {
      await grantRole(validator, validatorRole);
      let id;
      let tx;
      //step 1: request issuance
      expect(
        await issuerFacet
          .connect(owner)
          .requestProofIssuance(secondMatch, receiverAddress)
      ).to.emit(issuerFacet, "IssuanceRequested");
      lastTokenID++;

      //step 2: validate issuance request
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
      expect(tx).to.emit(issuerFacet, "ProofMinted").withArgs(lastTokenID, amount);
    });

    it("checks that the certified generation volume is correct after minting", async () => {
      const amountMinted = await issuerFacet.balanceOf(receiverAddress, lastTokenID);
      expect(amountMinted).to.equal(amount);
    });
  });

  describe("\n** Proof revocation tests **\n", () => {

    it("should verify all kinds of proofs", async () => {
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
          volume: 10,
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
      expect(await proofManagerFacet.connect(owner).verifyProof(root, leaf, proof)).to.be.true;

      const leafTree = createPreciseProof(arr[1])
      const leafRoot = leafTree.getHexRoot()
      const leafLeaf = hash('consumerID' + JSON.stringify(522))
      const leafProof = leafTree.getHexProof(leafLeaf)
      expect(await proofManagerFacet.connect(owner).verifyProof(leafRoot, leafLeaf, leafProof)).to.be.true;
    })

    it("should successfully verify a proof", async () => {
      expect(
        await proofManagerFacet.connect(owner).verifyProof(VC, merkleInfos.proofs[ 0 ].hexLeaf, merkleInfos.proofs[ 0 ].leafProof)
      ).to.be.true;
    });

    it("should prevent a non authorized entity from revoking non retired proof", async () => {
      await revokeRole(nonAuthorizedOperator, revokerRole);
      await expect(
        proofManagerFacet.connect(nonAuthorizedOperator).revokeProof(proofID1)
      ).to.be.revertedWith("Access: Not enrolled as revoker");
    });

    it("should prevent revocation of non existing certificates", async () => {
      await grantRole(revoker, revokerRole);

      const nonExistingCertificateID = 100;
      await expect(
        proofManagerFacet.connect(revoker).revokeProof(nonExistingCertificateID)
      ).to.be.revertedWith(`NonExistingProof(${nonExistingCertificateID})`);
    });

    it("should allow an authorized entity to revoke non retired proof", async () => {
      await grantRole(revoker, revokerRole);
      await expect(
        proofManagerFacet.connect(revoker).revokeProof(proofID1)
      ).to.emit(proofManagerFacet, "ProofRevoked");
    });

    it("should prevent dupplicate revocation", async () => {
      await grantRole(revoker, revokerRole);
      await expect(
        proofManagerFacet.connect(revoker).revokeProof(proofID1)
      ).to.be.revertedWith("already revoked proof");
    });

    it("should revert if one tries to retire a revoked proof", async () => {
      await expect(
        proofManagerFacet.connect(owner).retireProof(owner.address, proofID1, 1)
      ).to.be.revertedWith("proof revoked");
    });

    it("should allow proof retirement", async () => {
      await grantRole(validator, validatorRole);
      let id;
      let tx;
      //step 1: request issuance
      expect(
        await issuerFacet
          .connect(owner)
          .requestProofIssuance("WinningMatch 3", receiverAddress)
      ).to.emit(issuerFacet, "IssuanceRequested");
      lastTokenID++;

      //step 2: validate issuance request
      tx = await issuerFacet
        .connect(validator)
      [
        "validateIssuanceRequest(string,bytes32,address,uint256,uint256,uint256,uint256,bytes32)"
      ](
        "WinningMatch 3",
        VC,
        receiverAddress,
        amount,
        productType,
        start,
        end,
        producerRef
      );
      await tx.wait();
      expect(tx).to.emit(issuerFacet, "ProofMinted").withArgs(lastTokenID, amount);

      //step3: retire proof
      tx = await proofManagerFacet.connect(receiver).retireProof(receiverAddress, lastTokenID, 42);
      await tx.wait();

      const { timestamp } = await provider.getBlock(tx.blockNumber);
      await expect(tx).to.emit(proofManagerFacet, "ProofRetired").withArgs(lastTokenID, receiverAddress, timestamp, 42);
    });

    it("should revert when retirement amount exceeds owned volume", async () => {
      await expect(
        proofManagerFacet.connect(receiver).retireProof(receiverAddress, lastTokenID, 20)
      ).to.be.revertedWith("Insufficient volume owned");
      
    });

    it("should prevent authorized revoker from revoking a retired proof after the revocable Period", async () => {
      const proof = await proofManagerFacet.connect(owner).getProof(proofID2);
      const issuanceDate = Number(proof.issuanceDate.toString());
      
      //forward time to reach end of revocable period
      await timeTravel(revocablePeriod);
      await grantRole(revoker, revokerRole);
        
      tx = proofManagerFacet.connect(revoker).revokeProof(proofID2)

      //The certificate should not be revocable anymore
      await expect(tx).to.be.revertedWith(`NonRevokableProof(${proofID2}, ${issuanceDate}, ${issuanceDate + revocablePeriod})`) //emit(proofManagerFacet, "ProofRevoked");
    });
  });
});
