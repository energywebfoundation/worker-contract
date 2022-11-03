const chai = require("chai");
const { expect } = require("chai");
const { parseEther } = require("ethers").utils;
const { ethers, network } = require("hardhat");
const { deployDiamond, DEFAULT_REVOCABLE_PERIOD } = require("../scripts/deploy");
const {
  deployMockContract,
  solidity,
} = require("ethereum-waffle");
const { claimManagerInterface, getMerkleProof } = require("./utils");
const { createMerkleTree, createPreciseProof, hash, stringify } = require('@energyweb/greenproof-merkle-tree')
chai.use(solidity);

const timeTravel = async (seconds) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine", []);
};

let VC;
let owner;
let leaves;
let leaves2;
let worker1;
let worker2;
let leaves3;
let dataTree;
let receiver;
let provider;
let dataTree2;
let dataTree3;
let grantRole;
let revokeRole;
let issuerFacet;
let merkleInfos;
let votingFacet;
let diamondAddress;
let receiverAddress;
let testCounter = 0;
let lastTokenID = 0;
let proofManagerFacet;
let nonAuthorizedOperator;

const IS_SETTLEMENT = true;

const issuerRole = ethers.utils.namehash(
  "minter.roles.greenproof.apps.iam.ewc"
);
const revokerRole = ethers.utils.namehash(
  "revoker.roles.greenproof.apps.iam.ewc"
);
const workerRole = ethers.utils.namehash(
  "workerRole.roles.greenproof.apps.iam.ewc"
);
const volume = 42;
const proofID1 = 1;
const proofID2 = 2;
const defaultVersion = 1;

const data = [
  {
    id: 1,
    generatorID: 2,
    volume,
    consumerID: 500
  },
  {
    id: 2,
    generatorID: 3,
    volume: 21,
    consumerID: 522
  }
];

const data2 = [
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
];

const data3 = [
    {
      id: 3,
      generatorID: 4,
      volume: 10,
      consumerID: 52
    },
    {
      id: 4,
      generatorID: 5,
      volume,
      consumerID: 53
    },
    {
      id: 5,
      generatorID: 5,
      volume: 10,
      consumerID: 51
    },
];

describe("IssuerFacet", function () {
  before(async () => {
    [
      owner,
      issuer,
      minter,
      receiver,
      revoker,
      nonAuthorizedOperator,
      worker1,
      worker2,
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
      workerRole,
    };

    ({ diamondAddress } = await deployDiamond({
      claimManagerAddress: claimManagerMocked.address,
      roles
    }));

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
    votingFacet = await ethers.getContractAt("VotingFacet", diamondAddress);
    proofManagerFacet = await ethers.getContractAt(
      "ProofManagerFacet",
      diamondAddress
    );

    receiverAddress = receiver.address;

    leaves = data.map(item => createPreciseProof(item).getHexRoot());
    leaves2 = data2.map(item => createPreciseProof(item).getHexRoot());
    leaves3 = data3.map(item => createPreciseProof(item).getHexRoot());

    dataTree = createMerkleTree(leaves);
    dataTree2 = createMerkleTree(leaves2);
    dataTree3 = createMerkleTree(leaves3);
  });

  beforeEach(async () => {
    console.log(`Test ${++testCounter} :`);
  });

  afterEach(async () => {
    console.log("\t----------");
  });

  describe("\n** Proof issuance tests **\n", () => {

    it("checks that the certified generation volume is zero before minting", async () => {
      const nextTokenID = lastTokenID + 1;
      const amountBeforeMint = await issuerFacet.balanceOf(receiverAddress, nextTokenID);

      expect(amountBeforeMint).to.equal(0);
    });

    it("Authorized issuers can send proof issuance requests", async () => {
      await grantRole(issuer, issuerRole);
      
      //1 - Run the voting process with a consensus
      await grantRole(worker1, workerRole);
      await grantRole(worker2, workerRole);

      await votingFacet.connect(owner).addWorker(worker1.address);
      await votingFacet.connect(owner).addWorker(worker2.address);

      const inputHash = '0x' + hash(stringify(data)).toString('hex');
  
      const matchResult = dataTree.getHexRoot();
      const matchResultProof = dataTree.getHexProof(leaves[0]);

      await votingFacet.connect(worker1).vote(inputHash, matchResult, IS_SETTLEMENT);
      await votingFacet.connect(worker2).vote(inputHash, matchResult, IS_SETTLEMENT);
      
      //2 - request proof issuance for the vote ID (inputHash)

      console.log("stringifyed volume :: ", JSON.stringify(volume))
      const volumeTree = createPreciseProof(data[0]);
      const volumeLeaf = hash('volume' + JSON.stringify(volume));
      const volumeProof = volumeTree.getHexProof(volumeLeaf);
      const volumeRootHash = volumeTree.getHexRoot();

      lastTokenID++;
      await expect(
          issuerFacet
            .connect(issuer)
            .requestProofIssuance(inputHash, receiverAddress, volumeRootHash, matchResultProof, data[0].volume, volumeProof)
        ).to.emit(issuerFacet, "ProofMinted").withArgs(lastTokenID, volume);
    });

    it("reverts when issuers send dupplicate proof issuance requests", async () => {

      const inputHash = '0x' + hash(stringify(data)).toString('hex');
  
      const matchResultProof = dataTree.getHexProof(leaves[0]);
      
      const volumeTree = createPreciseProof(data[0]);
      const volumeLeaf = hash('volume' + JSON.stringify(volume));
      const volumeProof = volumeTree.getHexProof(volumeLeaf);
      const volumeRootHash = volumeTree.getHexRoot();

     await expect(
         issuerFacet
          .connect(issuer)
          .requestProofIssuance(inputHash, receiverAddress, volumeRootHash, matchResultProof, data[0].volume, volumeProof)
     ).to.be.revertedWith(`AlreadyCertifiedData("${volumeRootHash}")`)
    });

    it("checks that the certified generation volume is correct after minting", async () => {
      const amountMinted = await issuerFacet.balanceOf(receiverAddress, lastTokenID);

      expect(amountMinted).to.equal(parseEther(volume.toString()));
    });

    it("should correctly transfer certificates", async () => {
      const data = ethers.utils.formatBytes32String("");
      await expect(
        issuerFacet.connect(receiver).safeTransferFrom(receiverAddress, owner.address, lastTokenID, parseEther("2"), data)
      ).to.emit(issuerFacet, "TransferSingle").withArgs(receiverAddress, receiverAddress, owner.address, lastTokenID, parseEther("2"));

      const generatorCertificateAmount = await issuerFacet.balanceOf(receiverAddress, lastTokenID);

      expect(generatorCertificateAmount).to.equal(parseEther((volume - 2).toString()));

      const ownerCertificateAmount = await issuerFacet.balanceOf(owner.address, lastTokenID);

      expect(ownerCertificateAmount).to.equal(parseEther(("2")));
    })

    it("should get the list of all certificate owners", async () => {
      
      const certificateOwners = await issuerFacet.getCertificateOwners(lastTokenID);
       console.log(`Owners of certificate ID ${lastTokenID} : `, certificateOwners);
       
       expect(certificateOwners).to.be.deep.equal([ receiverAddress, owner.address ]);
    });

    it("Should reject issuance requests for wrongs voteIDs", async () => {

      //1 - Run the voting process with a consensus

      const wrongInputHash = '0x' + hash("dummmy wrong data").toString('hex');
      const inputHash = '0x' + hash(stringify(data2)).toString('hex');

      const matchResult = dataTree2.getHexRoot();
      const matchResultProof = dataTree2.getHexProof(leaves2[0]);

      await votingFacet.connect(worker1).vote(inputHash, matchResult, IS_SETTLEMENT);
      await votingFacet.connect(worker2).vote(inputHash, matchResult, IS_SETTLEMENT);
      
      //2 - request proof issuance for the vote ID (inputHash)

      const volumeTree = createPreciseProof(data2[0]);
      const volumeLeaf = hash('volume' + JSON.stringify(data2[0].volume));
      const volumeProof = volumeTree.getHexProof(volumeLeaf);
      const volumeRootHash = volumeTree.getHexRoot();

      await expect(
        issuerFacet.connect(issuer).requestProofIssuance(wrongInputHash, receiverAddress, volumeRootHash, matchResultProof, data2[ 0 ].volume, volumeProof)
      ).to.be.revertedWith(wrongInputHash);
    });
  });

  describe("\n** Proof revocation tests **\n", () => {

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

    it("should reverts if a non authorized entity tries to revoke a non retired proof", async () => {
      await revokeRole(revoker, revokerRole);
      await expect(
        proofManagerFacet.connect(revoker).revokeProof(proofID1)
      ).to.be.revertedWith("Access: Not enrolled as revoker");
    });

    it("should allow an authorized entity to revoke a non retired proof", async () => {
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
        proofManagerFacet.connect(owner).retireProof(proofID1, 1)
      ).to.be.revertedWith("proof revoked");
    });

    it("should allow proof retirement", async () => {
      let tx;

      await grantRole(issuer, issuerRole);
      
      //1 - Run the voting process with a consensus
      await grantRole(worker1, workerRole);
      await grantRole(worker2, workerRole);

      const inputHash = '0x' + hash(stringify(data3)).toString('hex');
  
      const matchResult = dataTree3.getHexRoot();
      const matchResultProof = dataTree3.getHexProof(leaves3[1]);

      await votingFacet.connect(worker1).vote(inputHash, matchResult, IS_SETTLEMENT);
      await votingFacet.connect(worker2).vote(inputHash, matchResult, IS_SETTLEMENT);
      
      //2 - request proof issuance for the vote ID (inputHash)

      const volumeTree = createPreciseProof(data3[1]);
      const volumeLeaf = hash('volume' + JSON.stringify(volume));
      const volumeProof = volumeTree.getHexProof(volumeLeaf);
      const volumeRootHash = volumeTree.getHexRoot();

      lastTokenID++;
      await expect(
         issuerFacet
          .connect(issuer)
          .requestProofIssuance(inputHash, receiverAddress, volumeRootHash, matchResultProof, data3[1].volume, volumeProof)
      ).to.emit(issuerFacet, "ProofMinted").withArgs(lastTokenID, volume);

      //step3: retire proof
      tx = await proofManagerFacet.connect(receiver).retireProof(lastTokenID, volume);
      await tx.wait();

      const { timestamp } = await provider.getBlock(tx.blockNumber);
      await expect(tx).to.emit(proofManagerFacet, "ProofRetired").withArgs(lastTokenID, receiverAddress, timestamp, 42);
    });

    it("should revert when retirement amount exceeds owned volume", async () => {
      await expect(
        proofManagerFacet.connect(receiver).retireProof(lastTokenID, parseEther("100"))
      ).to.be.revertedWith("Insufficient volume owned");
      
    });

    it("should prevent authorized revoker from revoking a retired proof after the revocable Period", async () => {
      const proof = await proofManagerFacet.connect(owner).getProof(proofID2);
      const issuanceDate = Number(proof.issuanceDate.toString());
      
      //forward time to reach end of revocable period
      await timeTravel(DEFAULT_REVOCABLE_PERIOD);
      await grantRole(revoker, revokerRole);
        
      tx = proofManagerFacet.connect(revoker).revokeProof(proofID2)

      //The certificate should not be revocable anymore
      await expect(tx).to.be.revertedWith(`NonRevokableProof(${proofID2}, ${issuanceDate}, ${issuanceDate + DEFAULT_REVOCABLE_PERIOD})`) //emit(proofManagerFacet, "ProofRevoked");
    });
  });

  describe("\n** Proof verification tests **\n", () => {
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

      const leaf = leaves[ 1 ];
      const proof = tree.getHexProof(leaf);
      const root = tree.getHexRoot()
      expect(await proofManagerFacet.connect(owner).verifyProof(root, leaf, proof)).to.be.true;

      const leafTree = createPreciseProof(arr[ 1 ])
      const leafRoot = leafTree.getHexRoot()
      const leafLeaf = hash('consumerID' + JSON.stringify(522))
      const leafProof = leafTree.getHexProof(leafLeaf)
      expect(await proofManagerFacet.connect(owner).verifyProof(leafRoot, leafLeaf, leafProof)).to.be.true;
    })

    it("should successfully verify a proof", async () => {
      merkleInfos = getMerkleProof(data3);
      VC = merkleInfos.merkleRoot;
      expect(
        await proofManagerFacet.connect(owner).verifyProof(VC, merkleInfos.proofs[ 0 ].hexLeaf, merkleInfos.proofs[ 0 ].leafProof)
      ).to.be.true;
    });

  });

  describe("\n** Data disclosure tests **\n", () => {

    it("should revert when non authorized user tries to disclose data", async () => {
      await revokeRole(nonAuthorizedOperator, issuerRole);

      const key = "consumerID";
      const value = "500";

      const disclosedDataTree = createPreciseProof(data[0]);
      const dataLeaf = hash(key + value);
      const dataProof = disclosedDataTree.getHexProof(dataLeaf);
      const dataRootHash = disclosedDataTree.getHexRoot();

      await expect(
        issuerFacet.connect(nonAuthorizedOperator).discloseData(key, value, dataProof, dataRootHash)
      ).to.be.revertedWith("Access: Not an issuer");
    });
    
    it("should allow authorized user to disclose data", async () => {
      await grantRole(issuer, issuerRole);

      const key = "consumerID";
      const value = "500";

      const disclosedDataTree = createPreciseProof(data[0]);
      const dataLeaf = hash(key + value);
      const dataProof = disclosedDataTree.getHexProof(dataLeaf);
      const dataRootHash = disclosedDataTree.getHexRoot();

      await issuerFacet.connect(issuer).discloseData(key, value, dataProof, dataRootHash);

    });

    it("should revert when one tries to disclose not verified data", async () => {
      await grantRole(issuer, issuerRole);

      const wrongKey = "NotExistingKey";
      const value = "500";

      const disclosedDataTree = createPreciseProof(data[0]);
      const dataLeaf = hash(wrongKey + value);
      const dataProof = disclosedDataTree.getHexProof(dataLeaf);
      const dataRootHash = disclosedDataTree.getHexRoot();

      await expect(
        issuerFacet.connect(issuer).discloseData(wrongKey, value, dataProof, dataRootHash)
      ).to.be.revertedWith("Disclose : data not verified");

    });

    it("should revert when one tries to disclose already disclosed data", async () => {

      const key = "consumerID";
      const value = "500";

      const disclosedDataTree = createPreciseProof(data[0]);
      const dataLeaf = hash(key + value);
      const dataProof = disclosedDataTree.getHexProof(dataLeaf);
      const dataRootHash = disclosedDataTree.getHexRoot();

      await expect(
        issuerFacet.connect(issuer).discloseData(key, value, dataProof, dataRootHash)
      ).to.be.revertedWith("Disclose: data already disclosed");
    })
  });
}); 
