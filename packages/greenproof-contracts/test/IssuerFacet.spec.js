const chai = require("chai");
const { expect } = require("chai");
const { parseEther } = require("ethers").utils;
const {
  deployDiamond,
  DEFAULT_REVOCABLE_PERIOD,
} = require("../scripts/deploy/deployContracts");
const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const {
  createMerkleTree,
  createPreciseProof,
  hash,
  stringify,
} = require("@energyweb/greenproof-merkle-tree");
const { roles } = require("./utils/roles.utils");
const { timeTravel } = require("./utils/time.utils");
const { initMockClaimManager } = require("./utils/claimManager.utils");
const { initMockClaimRevoker } = require("./utils/claimRevocation.utils");
const { getMerkleProof } = require("./utils/merkleProof.utils");
chai.use(solidity);

const { issuerRole, revokerRole, workerRole } = roles;

let VC;
let leaves;
let leaves2;
let leaves3;
let leaves4;
let dataTree;
let generator;
let provider;
let dataTree2;
let dataTree3;
let dataTree4;
let grantRole;
let revokeRole;
let issuerFacet;
let merkleInfos;
let votingFacet;
let diamondAddress;
let generatorAddress;
let testCounter = 0;
let lastTokenID = 0;
let proofManagerFacet;

const volume = 42;
const certificateID1 = 1;
const certificateID2 = 2;
const certificateID3 = 3;
const tokenURI = "bafkreihzks3jsrfqn4wm6jtc3hbfsikq52eutvkvrhd454jztna73cpaaq";

const data = [
  {
    id: 1,
    generatorID: 2,
    volume,
    consumerID: 500,
  },
  {
    id: 2,
    generatorID: 3,
    volume: 21,
    consumerID: 522,
  },
];

const data2 = [
  {
    id: 3,
    generatorID: 4,
    volume: 10,
    consumerID: 52,
  },
  {
    id: 4,
    generatorID: 5,
    volume: 10,
    consumerID: 53,
  },
  {
    id: 5,
    generatorID: 5,
    volume: 10,
    consumerID: 51,
  },
];

const data3 = [
  {
    id: 3,
    generatorID: 4,
    volume: 10,
    consumerID: 52,
  },
  {
    id: 4,
    generatorID: 5,
    volume,
    consumerID: 53,
  },
  {
    id: 5,
    generatorID: 5,
    volume: 10,
    consumerID: 51,
  },
];

const data4 = [
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

describe("IssuerFacet", function() {
  let owner;
  let issuer;
  let minter;
  let revoker;
  let nonAuthorizedOperator;
  let worker1;
  let worker2;
  let notEnrolledWorker;
  let toRemoveWorker;

  before(async () => {
    [
      owner,
      issuer,
      minter,
      generator,
      revoker,
      nonAuthorizedOperator,
      worker1,
      worker2,
      notEnrolledWorker,
      toRemoveWorker,
    ] = await ethers.getSigners();
    console.log(`\n`);

    provider = ethers.provider;

    const claimManagerMocked = await initMockClaimManager(owner);
    const claimsRevocationRegistryMocked = await initMockClaimRevoker(owner);

    grantRole = async (operatorWallet, role) => {
      await claimManagerMocked.grantRole(operatorWallet.address, role);
      await claimsRevocationRegistryMocked.isRevoked(
        role,
        operatorWallet.address,
        false
      );
    };

    revokeRole = async (operatorWallet, role) => {
      await claimManagerMocked.grantRole(operatorWallet.address, role);
      await claimsRevocationRegistryMocked.isRevoked(
        role,
        operatorWallet.address,
        true
      );
    };

    const roles = {
      issuerRole,
      revokerRole,
      workerRole,
    };

    ({ diamondAddress } = await deployDiamond({
      claimManagerAddress: claimManagerMocked.address,
      claimRevokerAddress: claimsRevocationRegistryMocked.address,
      roles,
    }));

    issuerFacet = await ethers.getContractAt("IssuerFacet", diamondAddress);
    votingFacet = await ethers.getContractAt("VotingFacet", diamondAddress);
    proofManagerFacet = await ethers.getContractAt(
      "ProofManagerFacet",
      diamondAddress
    );

    generatorAddress = generator.address;

    leaves = data.map(item => createPreciseProof(item).getHexRoot());
    leaves2 = data2.map(item => createPreciseProof(item).getHexRoot());
    leaves3 = data3.map(item => createPreciseProof(item).getHexRoot());
    leaves4 = data4.map(item => createPreciseProof(item).getHexRoot());

    dataTree = createMerkleTree(leaves);
    dataTree2 = createMerkleTree(leaves2);
    dataTree3 = createMerkleTree(leaves3);
    dataTree4 = createMerkleTree(leaves4);
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
      const amountBeforeMint = await issuerFacet.balanceOf(
        generatorAddress,
        nextTokenID
      );

      expect(amountBeforeMint).to.equal(0);
    });

    it("shoudl reject proof issuance requests if generator is the zero address", async () => {
      await grantRole(issuer, issuerRole);

      //1 - Run the voting process with a consensus
      await grantRole(worker1, workerRole);
      await grantRole(worker2, workerRole);

      await votingFacet.connect(owner).addWorker(worker1.address);
      await votingFacet.connect(owner).addWorker(worker2.address);

      const inputHash = "0x" + hash(stringify(data)).toString("hex");

      const matchResult = dataTree.getHexRoot();
      const matchResultProof = dataTree.getHexProof(leaves[0]);

      await votingFacet.connect(worker1).vote(inputHash, matchResult);
      await votingFacet.connect(worker2).vote(inputHash, matchResult);

      //2 - request proof issuance for the vote ID (inputHash)

      console.log("stringifyed volume :: ", JSON.stringify(volume));
      const volumeTree = createPreciseProof(data[0]);
      const volumeLeaf = hash("volume" + JSON.stringify(volume));
      const volumeProof = volumeTree.getHexProof(volumeLeaf);
      const volumeRootHash = volumeTree.getHexRoot();

      await expect(
        issuerFacet
          .connect(issuer)
          .requestProofIssuance(
            inputHash,
            ethers.constants.AddressZero,
            volumeRootHash,
            matchResultProof,
            data[0].volume,
            volumeProof,
            tokenURI
          )
      ).to.be.revertedWith("issuance must be non-zero");
    });

    it("Authorized issuers can send proof issuance requests", async () => {
      await grantRole(issuer, issuerRole);

      //1 - Run the voting process with a consensus
      // await grantRole(worker1, workerRole);
      // await grantRole(worker2, workerRole);

      // await votingFacet.connect(owner).addWorker(worker1.address);
      // await votingFacet.connect(owner).addWorker(worker2.address);

      const inputHash = "0x" + hash(stringify(data)).toString("hex");

      const matchResult = dataTree.getHexRoot();
      const matchResultProof = dataTree.getHexProof(leaves[0]);

      await votingFacet.connect(worker1).vote(inputHash, matchResult);
      await votingFacet.connect(worker2).vote(inputHash, matchResult);

      //2 - request proof issuance for the vote ID (inputHash)

      console.log("stringifyed volume :: ", JSON.stringify(volume));
      const volumeTree = createPreciseProof(data[0]);
      const volumeLeaf = hash("volume" + JSON.stringify(volume));
      const volumeProof = volumeTree.getHexProof(volumeLeaf);
      const volumeRootHash = volumeTree.getHexRoot();
      const volumeInWei = parseEther(volume.toString());

      lastTokenID++;
      await expect(
        issuerFacet
          .connect(issuer)
          .requestProofIssuance(
            inputHash,
            generatorAddress,
            volumeRootHash,
            matchResultProof,
            data[0].volume,
            volumeProof,
            tokenURI
          )
      )
        .to.emit(issuerFacet, "ProofMinted")
        .withArgs(lastTokenID, volumeInWei, generatorAddress);
    });

    it("reverts when issuers send dupplicate proof issuance requests", async () => {
      const inputHash = "0x" + hash(stringify(data)).toString("hex");

      const matchResultProof = dataTree.getHexProof(leaves[0]);

      const volumeTree = createPreciseProof(data[0]);
      const volumeLeaf = hash("volume" + JSON.stringify(volume));
      const volumeProof = volumeTree.getHexProof(volumeLeaf);
      const volumeRootHash = volumeTree.getHexRoot();

      await expect(
        issuerFacet
          .connect(issuer)
          .requestProofIssuance(
            inputHash,
            generatorAddress,
            volumeRootHash,
            matchResultProof,
            data[0].volume,
            volumeProof,
            tokenURI
          )
      ).to.be.revertedWith(`AlreadyCertifiedData("${volumeRootHash}")`);
    });

    it("checks that the certified generation volume is correct after minting", async () => {
      const amountMinted = await issuerFacet.balanceOf(
        generatorAddress,
        lastTokenID
      );

      expect(amountMinted).to.equal(parseEther(volume.toString()));
    });

    it("should revert when one tries to transfer token ID = 0", async () => {
      const transferBytesData = ethers.utils.formatBytes32String("");

      //transferring token ID == 0
      await expect(
        issuerFacet
          .connect(generator)
          .safeTransferFrom(
            generatorAddress,
            owner.address,
            0,
            parseEther("2"),
            transferBytesData
          )
      ).to.be.revertedWith("transfer: invalid zero token ID");
    });

    it("should revert when one tries to transfer token ID > lastTokenIndex", async () => {
      const transferBytesData = ethers.utils.formatBytes32String("");
      const invalidTokenIndex = 42;

      //transferring token ID == 42
      await expect(
        issuerFacet
          .connect(generator)
          .safeTransferFrom(
            generatorAddress,
            owner.address,
            invalidTokenIndex,
            parseEther("2"),
            transferBytesData
          )
      ).to.be.revertedWith(
        "transfer: tokenId greater than issuer.latestCertificateId"
      );
    });

    it("should correctly transfer certificates", async () => {
      const data = ethers.utils.formatBytes32String("");
      await expect(
        issuerFacet
          .connect(generator)
          .safeTransferFrom(
            generatorAddress,
            owner.address,
            lastTokenID,
            parseEther("2"),
            data
          )
      )
        .to.emit(issuerFacet, "TransferSingle")
        .withArgs(
          generatorAddress,
          generatorAddress,
          owner.address,
          lastTokenID,
          parseEther("2")
        );

      const generatorCertificateAmount = await issuerFacet.balanceOf(
        generatorAddress,
        lastTokenID
      );

      expect(generatorCertificateAmount).to.equal(
        parseEther((volume - 2).toString())
      );

      const ownerCertificateAmount = await issuerFacet.balanceOf(
        owner.address,
        lastTokenID
      );

      expect(ownerCertificateAmount).to.equal(parseEther("2"));
    });

    it("should get the list of all certificate owners", async () => {
      const certificateOwners = await issuerFacet.getCertificateOwners(
        lastTokenID
      );
      console.log(
        `Owners of certificate ID ${lastTokenID} : `,
        certificateOwners
      );

      expect(certificateOwners).to.be.deep.equal([
        generatorAddress,
        owner.address,
      ]);
    });

    it("should get all certificates of one owner", async () => {
      const ownersCertificates = await proofManagerFacet.getProofsOf(
        owner.address
      );
      const generatorCertificates = await proofManagerFacet.getProofsOf(
        generator.address
      );
      console.log(`${owner.address}' certificates : `, ownersCertificates);
      console.log(
        `${generator.address}' certificates : `,
        generatorCertificates
      );
    });

    it("Should reject issuance requests for wrongs voteIDs", async () => {
      //1 - Run the voting process with a consensus

      const wrongInputHash = "0x" + hash("dummmy wrong data").toString("hex");
      const inputHash = "0x" + hash(stringify(data2)).toString("hex");

      const matchResult = dataTree2.getHexRoot();
      const matchResultProof = dataTree2.getHexProof(leaves2[0]);

      await votingFacet.connect(worker1).vote(inputHash, matchResult);
      await votingFacet.connect(worker2).vote(inputHash, matchResult);

      //2 - request proof issuance for the vote ID (inputHash)

      const volumeTree = createPreciseProof(data2[0]);
      const volumeLeaf = hash("volume" + JSON.stringify(data2[0].volume));
      const volumeProof = volumeTree.getHexProof(volumeLeaf);
      const volumeRootHash = volumeTree.getHexRoot();

      await expect(
        issuerFacet
          .connect(issuer)
          .requestProofIssuance(
            wrongInputHash,
            generatorAddress,
            volumeRootHash,
            matchResultProof,
            data2[0].volume,
            volumeProof,
            tokenURI
          )
      ).to.be.revertedWith(wrongInputHash);
    });
  });

  describe("\n** Proof revocation tests **\n", () => {
    it("should prevent a non authorized entity from revoking non retired proof", async () => {
      await revokeRole(nonAuthorizedOperator, revokerRole);
      await expect(
        proofManagerFacet
          .connect(nonAuthorizedOperator)
          .revokeProof(certificateID1)
      ).to.be.revertedWith("Access: Not enrolled as revoker");
    });

    it("should prevent revocation of non existing certificates", async () => {
      await grantRole(revoker, revokerRole);

      const nonExistingCertificateID = 100;
      await expect(
        proofManagerFacet.connect(revoker).revokeProof(nonExistingCertificateID)
      ).to.be.revertedWith(
        `NonExistingCertificate(${nonExistingCertificateID})`
      );
    });

    it("should reverts if a non authorized entity tries to revoke a non retired proof", async () => {
      await revokeRole(revoker, revokerRole);
      await expect(
        proofManagerFacet.connect(revoker).revokeProof(certificateID1)
      ).to.be.revertedWith("Access: Not enrolled as revoker");
    });

    it("should allow an authorized entity to revoke a non retired proof", async () => {
      await grantRole(revoker, revokerRole);
      await expect(
        proofManagerFacet.connect(revoker).revokeProof(certificateID1)
      ).to.emit(proofManagerFacet, "ProofRevoked");
    });

    it("it should revert when transfering reevoked proof to another wallet than generator", async () => {
      const data = ethers.utils.formatBytes32String("");

      await expect(
        issuerFacet
          .connect(generator)
          .safeTransferFrom(
            generatorAddress,
            owner.address,
            certificateID1,
            parseEther("1"),
            data
          )
      ).to.be.revertedWith("non tradable revoked proof");
    });

    it("it should allow transfer of revoked proof to generator", async () => {
      const data = ethers.utils.formatBytes32String("");
      let customerRevokedAmount = await issuerFacet.balanceOf(
        owner.address,
        lastTokenID
      );

      await expect(
        issuerFacet
          .connect(owner)
          .safeTransferFrom(
            owner.address,
            generatorAddress,
            lastTokenID,
            customerRevokedAmount,
            data
          )
      )
        .to.emit(issuerFacet, "TransferSingle")
        .withArgs(
          owner.address,
          owner.address,
          generatorAddress,
          lastTokenID,
          customerRevokedAmount
        );
    });

    it("should prevent dupplicate revocation", async () => {
      await grantRole(revoker, revokerRole);
      await expect(
        proofManagerFacet.connect(revoker).revokeProof(certificateID1)
      ).to.be.revertedWith("already revoked proof");
    });

    it("should revert if one tries to retire a revoked proof", async () => {
      await expect(
        proofManagerFacet.connect(owner).claimProof(certificateID1, 1)
      ).to.be.revertedWith("proof revoked");
    });

    it("should allow claiming proofs", async () => {
      let tx;

      await grantRole(issuer, issuerRole);

      //1 - Run the voting process with a consensus
      await grantRole(worker1, workerRole);
      await grantRole(worker2, workerRole);

      const inputHash = "0x" + hash(stringify(data3)).toString("hex");

      const matchResult = dataTree3.getHexRoot();
      const matchResultProof = dataTree3.getHexProof(leaves3[1]);

      await votingFacet.connect(worker1).vote(inputHash, matchResult);
      await votingFacet.connect(worker2).vote(inputHash, matchResult);

      //2 - request proof issuance for the vote ID (inputHash)

      const volumeTree = createPreciseProof(data3[1]);
      const volumeLeaf = hash("volume" + JSON.stringify(volume));
      const volumeProof = volumeTree.getHexProof(volumeLeaf);
      const volumeRootHash = volumeTree.getHexRoot();
      const volumeInWei = parseEther(volume.toString());

      lastTokenID++;
      await expect(
        issuerFacet
          .connect(issuer)
          .requestProofIssuance(
            inputHash,
            generatorAddress,
            volumeRootHash,
            matchResultProof,
            data3[1].volume,
            volumeProof,
            tokenURI
          )
      )
        .to.emit(issuerFacet, "ProofMinted")
        .withArgs(lastTokenID, volumeInWei, generatorAddress);

      let claimedProofsAmount = await proofManagerFacet.claimedBalanceOf(
        generatorAddress,
        lastTokenID
      );
      expect(claimedProofsAmount).to.equal(0);
      //step3: retire proof
      console.log(
        "BEFORE CLAIM: Remaining Tokens balance : ",
        await proofManagerFacet.getProofsOf(generatorAddress)
      );

      tx = await proofManagerFacet
        .connect(generator)
        .claimProof(lastTokenID, parseEther((volume - 2).toString()));
      await tx.wait();

      const { timestamp } = await provider.getBlock(tx.blockNumber);
      await expect(tx)
        .to.emit(proofManagerFacet, "ProofClaimed")
        .withArgs(
          lastTokenID,
          generatorAddress,
          timestamp,
          parseEther((volume - 2).toString())
        );

      claimedProofsAmount = await proofManagerFacet.claimedBalanceOf(
        generatorAddress,
        lastTokenID
      );
      expect(claimedProofsAmount).to.equal(parseEther((volume - 2).toString()));
      console.log(
        "AFTER CLAIM: Remaining Tokens balance : ",
        await proofManagerFacet.getProofsOf(generatorAddress)
      );
    });

    it("should revert when retirement amount exceeds owned volume", async () => {
      await expect(
        proofManagerFacet
          .connect(generator)
          .claimProof(lastTokenID, parseEther("100"))
      ).to.be.revertedWith("Insufficient volume owned");
    });

    it("should prevent authorized revoker from revoking a retired proof after the revocable Period", async () => {
      const proof = await proofManagerFacet
        .connect(owner)
        .getProof(certificateID2);
      const issuanceDate = Number(proof.issuanceDate.toString());

      //forward time to reach end of revocable period
      await timeTravel(DEFAULT_REVOCABLE_PERIOD);
      await grantRole(revoker, revokerRole);

      tx = proofManagerFacet.connect(revoker).revokeProof(certificateID2);

      //The certificate should not be revocable anymore
      await expect(tx).to.be.revertedWith(
        `NonRevokableCertificate(${certificateID2}, ${issuanceDate}, ${
          issuanceDate + DEFAULT_REVOCABLE_PERIOD
        })`
      ); //emit(proofManagerFacet, "ProofRevoked");
    });

    it('allows to reissue revoked certificate', async () => {
      await grantRole(revoker, revokerRole);

      const inputHash = '0x' + hash(stringify(data4)).toString('hex');

      const matchResultProof = dataTree.getHexProof(leaves4[0]);

      const volumeTree = createPreciseProof(data4[0]);
      const volumeLeaf = hash('volume' + JSON.stringify(volume));
      const volumeProof = volumeTree.getHexProof(volumeLeaf);
      const volumeRootHash = volumeTree.getHexRoot();

      await expect(
        issuerFacet
          .connect(issuer)
          .requestProofIssuance(inputHash, generatorAddress, volumeRootHash, matchResultProof, data4[0].volume, volumeProof, tokenURI),
      )

      await expect(
        issuerFacet
          .connect(issuer)
          .requestProofIssuance(inputHash, generatorAddress, volumeRootHash, matchResultProof, data4[0].volume, volumeProof, tokenURI),
      ).to.be.revertedWith(`AlreadyCertifiedData("${volumeRootHash}")`);

      await proofManagerFacet.connect(revoker).revokeProof(certificateID3);

      await issuerFacet
        .connect(issuer)
        .requestProofIssuance(inputHash, generatorAddress, volumeRootHash, matchResultProof, data4[0].volume, volumeProof, tokenURI);
    });
  });

  describe("\n** Proof verification tests **\n", () => {
    it("should verify all kinds of proofs", async () => {
      const arr = [
        {
          id: 1,
          generatorID: 2,
          volume: 10,
          consumerID: 500,
        },
        {
          id: 2,
          generatorID: 3,
          volume: 10,
          consumerID: 522,
        },
        {
          id: 3,
          generatorID: 4,
          volume: 10,
          consumerID: 52,
        },
        {
          id: 4,
          generatorID: 5,
          volume: 10,
          consumerID: 53,
        },
        {
          id: 5,
          generatorID: 5,
          volume: 10,
          consumerID: 51,
        },
      ];
      const leaves = arr.map((item) => createPreciseProof(item).getHexRoot());
      const tree = createMerkleTree(leaves);

      const leaf = leaves[1];
      const proof = tree.getHexProof(leaf);
      const root = tree.getHexRoot();
      expect(
        await proofManagerFacet.connect(owner).verifyProof(root, leaf, proof)
      ).to.be.true;

      const leafTree = createPreciseProof(arr[1]);
      const leafRoot = leafTree.getHexRoot();
      const leafLeaf = hash("consumerID" + JSON.stringify(522));
      const leafProof = leafTree.getHexProof(leafLeaf);
      expect(
        await proofManagerFacet
          .connect(owner)
          .verifyProof(leafRoot, leafLeaf, leafProof)
      ).to.be.true;
    });

    it("should successfully verify a proof", async () => {
      merkleInfos = getMerkleProof(data3);
      VC = merkleInfos.merkleRoot;
      expect(
        await proofManagerFacet
          .connect(owner)
          .verifyProof(
            VC,
            merkleInfos.proofs[0].hexLeaf,
            merkleInfos.proofs[0].leafProof
          )
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
        issuerFacet
          .connect(nonAuthorizedOperator)
          .discloseData(key, value, dataProof, dataRootHash)
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

      await issuerFacet
        .connect(issuer)
        .discloseData(key, value, dataProof, dataRootHash);
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
        issuerFacet
          .connect(issuer)
          .discloseData(wrongKey, value, dataProof, dataRootHash)
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
        issuerFacet
          .connect(issuer)
          .discloseData(key, value, dataProof, dataRootHash)
      ).to.be.revertedWith("Disclose: data already disclosed");
    });
  });
});
