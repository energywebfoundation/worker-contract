const chai = require("chai");
const { utils, BigNumber } = require("ethers");
const { expect } = require("chai");
const { deployGreenproof } = require("../deploy/deployContracts");
const { solidity } = require("ethereum-waffle");
const { roles } = require("./utils/roles.utils");
const { initMockClaimManager } = require("./utils/claimManager.utils");
const { initMockClaimRevoker } = require("./utils/claimRevocation.utils");
const { generateProofData } = require("./utils/issuer.utils");
const { timeTravel, getTimeStamp } = require("./utils/time.utils");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  createPreciseProof,
  createMerkleTree,
  hash,
} = require("@energyweb/merkle-tree");
const { getMerkleProof } = require("./utils/merkleProof.utils");

chai.use(solidity);
const { parseEther, formatEther } = utils;

const tokenURI = "bafkreihzks3jsrfqn4wm6jtc3hbfsikq52eutvkvrhd454jztna73cpaaq";
const transferBytesData = ethers.utils.formatBytes32String("");
const revokablePeriod = 60 * 60 * 24;

describe("IssuerFacet", function () {
  let owner;
  let issuer;
  let worker;
  let revoker;
  let claimer;
  let approver;
  let wallets;

  let grantRole;
  let revokeRole;

  const issuanceFixture = async () => {
    const {
      owner,
      worker,
      issuer,
      claimer,
      revoker,
      wallets,
      receiver,
      votingContract,
      issuerContract,
      metatokenContract,
      proofManagerContract
    } = await loadFixture(initFixture);

    const certificateID = 1;
    const tokenAmount = 42;
    const proofData = generateProofData({ volume: tokenAmount });  

    await reachConsensus(
      proofData.inputHash,
      proofData.matchResult,
      votingContract,
      worker
    );

    const mintTx = await mintProof(
      issuerContract,
      certificateID,
      proofData,
      receiver,
      issuer
    );

    return {
      owner,
      worker,
      mintTx,
      issuer,
      claimer,
      wallets,
      revoker,
      receiver,
      proofData,
      tokenAmount,
      certificateID,
      votingContract,
      issuerContract,
      metatokenContract,
      proofManagerContract,
    }
  }

  const initMetaTokenFixture = async () => {

    const {
      issuer,
      claimer,
      receiver,
      tokenAmount,
      certificateID,
      issuerContract,
      metatokenContract,
    } = await loadFixture(issuanceFixture);

    const metaTokenURI = "";

      const tx = await metatokenContract
        .connect(issuer)
        .issueMetaToken(
          certificateID,
          tokenAmount,
          receiver.address,
          metaTokenURI
        );

      const timestamp = (await ethers.provider.getBlock(tx.blockNumber))
        .timestamp;

      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(certificateID, receiver.address, timestamp, parseEther(tokenAmount.toString()));
    
    return {
      claimer,
      receiver,
      certificateID,
      volume: parseEther(tokenAmount.toString()),
      metatokenContract,
      issuerContract
    }
  };

  const initFixture = async () => {
    [
      owner,
      issuer,
      worker,
      revoker,
      claimer,
      minter,
      receiver,
      approver,
      ...wallets
    ] = await ethers.getSigners();

    const claimManagerMocked = await initMockClaimManager(owner);
    const claimsRevocationRegistryMocked = await initMockClaimRevoker(owner);

    grantRole = async (wallet, role) => {
      await claimManagerMocked.grantRole(wallet.address, role);
      await claimsRevocationRegistryMocked.isRevoked(
        role,
        wallet.address,
        false
      );
    };

    revokeRole = async (wallet, role) => {
      await claimManagerMocked.grantRole(wallet.address, role);
      await claimsRevocationRegistryMocked.isRevoked(
        role,
        wallet.address,
        true
      );
    };

    ({ greenproofAddress } = await deployGreenproof({
      claimManagerAddress: claimManagerMocked.address,
      claimRevokerAddress: claimsRevocationRegistryMocked.address,
      contractOwner: owner.address,
      roles,
      majorityPercentage: 0,
      revocablePeriod: revokablePeriod,
      isMetaCertificateEnabled: true,
    }));

    const issuerContract = await ethers.getContractAt(
      "IssuerFacet",
      greenproofAddress
    );
    const votingContract = await ethers.getContractAt(
      "VotingFacet",
      greenproofAddress
    );
    const proofManagerContract = await ethers.getContractAt(
      "ProofManagerFacet",
      greenproofAddress
    );
    const metatokenContract = await ethers.getContractAt(
      "MetaTokenFacet",
      greenproofAddress
    );

    const greenproofContract = await ethers.getContractAt(
      "Greenproof",
      greenproofAddress
    );

    const proofData = generateProofData();

    await resetRoles();
    await grantRole(worker, roles.workerRole);
    await votingContract.addWorker(worker.address);
    await grantRole(issuer, roles.issuerRole);
    await grantRole(revoker, roles.revokerRole);
    await grantRole(claimer, roles.claimerRole);
    await grantRole(approver, roles.approverRole);

    return {
      owner,
      issuer,
      worker,
      minter,
      revoker,
      claimer,
      receiver,
      approver,
      wallets,
      proofData,
      issuerContract,
      votingContract,
      metatokenContract,
      proofManagerContract,
      greenproofContract,
      greenproofAddress,
      claimManagerMocked,
      claimsRevocationRegistryMocked,
    };
  };

  const initWithoutMetaTokenFixture = async () => {
    [
      owner,
      issuer,
      worker,
      revoker,
      claimer,
      minter,
      receiver,
      approver,
      ...wallets
    ] = await ethers.getSigners();

    const claimManagerMocked = await initMockClaimManager(owner);
    const claimsRevocationRegistryMocked = await initMockClaimRevoker(owner);

    grantRole = async (wallet, role) => {
      await claimManagerMocked.grantRole(wallet.address, role);
      await claimsRevocationRegistryMocked.isRevoked(
        role,
        wallet.address,
        false
      );
    };

    revokeRole = async (wallet, role) => {
      await claimManagerMocked.grantRole(wallet.address, role);
      await claimsRevocationRegistryMocked.isRevoked(
        role,
        wallet.address,
        true
      );
    };

    ({ greenproofAddress } = await deployGreenproof({
      claimManagerAddress: claimManagerMocked.address,
      claimRevokerAddress: claimsRevocationRegistryMocked.address,
      contractOwner: owner.address,
      roles,
      majorityPercentage: 0,
      revocablePeriod: revokablePeriod,
      isMetaCertificateEnabled: false,
    }));

    issuerContract = await ethers.getContractAt(
      "IssuerFacet",
      greenproofAddress
    );
    votingContract = await ethers.getContractAt(
      "VotingFacet",
      greenproofAddress
    );

    metatokenContract = await ethers.getContractAt(
      "MetaTokenFacet",
      greenproofAddress
    );

    const proofData = generateProofData();

    await resetRoles();
    await grantRole(worker, roles.workerRole);
    await votingContract.addWorker(worker.address);
    await grantRole(issuer, roles.issuerRole);

    return {
      issuer,
      worker,
      receiver,
      proofData,
      issuerContract,
      votingContract,
      metatokenContract,
    };
  };

  describe("Proof issuance tests", () => {
    it("should correctly read the main token name", async () => {
      const { issuerContract } = await loadFixture(initFixture);

      const tokenName = await issuerContract.name();
      const tokenSymbol = await issuerContract.symbol();

      expect(tokenName).to.equal("SAF Certificate");
      expect(tokenSymbol).to.equal("SAFC");
    });

    it("checks that every one has 0 balance initially", async () => {
      const { issuerContract } = await loadFixture(initFixture);

      for (const wallet of await ethers.getSigners()) {
        const first20TokenIds = new Array(20).fill(0).map((_, i) => i);
        for (const tokenId of first20TokenIds) {
          const balance = await issuerContract.balanceOf(
            wallet.address,
            tokenId
          );

          expect(balance).to.equal(0);
        }
      }
    });

    it("should reject proof issuance requests if generator is the zero address", async () => {
      const { issuerContract, issuer, proofData } = await loadFixture(
        initFixture
      );

      await expect(
        issuerContract.connect(issuer).requestProofIssuance({
          voteID: proofData.inputHash,
          generator: ethers.constants.AddressZero,
          dataHash: proofData.volumeRootHash,
          dataProof: proofData.matchResultProof,
          volume: proofData.volume.toString(10),
          amountProof: proofData.volumeProof,
          tokenUri: tokenURI,
        })
      ).to.be.revertedWith("ForbiddenZeroAddressReceiver()");
    });

    it("should reject proof issuance requests for data not in consensus", async () => {
      const {
        issuer,
        worker,
        receiver,
        proofData,
        issuerContract,
        votingContract,
      } = await loadFixture(initFixture);

      await reachConsensus(
        proofData.inputHash,
        proofData.matchResult,
        votingContract,
        worker
      );

      const wrongVolumeRootHash = ethers.utils.formatBytes32String(
        "wrongVolumeRootHash"
      );

      await expect(
        issuerContract.connect(issuer).requestProofIssuance({
          voteID: proofData.inputHash,
          generator: receiver.address,
          dataHash: wrongVolumeRootHash,
          dataProof: proofData.matchResultProof,
          volume: proofData.volume.toString(10),
          amountProof: proofData.volumeProof,
          tokenUri: tokenURI,
        })
      ).to.be.revertedWith(`NotInConsensus("${proofData.inputHash}")`);
    });

    it("should reject proof issuance requests for volume not in consensus", async () => {
      const { worker, receiver, issuerContract, issuer, votingContract } =
        await loadFixture(initFixture);

      const {
        inputHash,
        volumeRootHash,
        matchResultProof,
        volumeProof,
        matchResult,
      } = generateProofData({ volume: 42 });

      await reachConsensus(inputHash, matchResult, votingContract, worker);

      const wrongVolume = 21;

      await expect(
        issuerContract.connect(issuer).requestProofIssuance({
          voteID: inputHash,
          generator: receiver.address,
          dataHash: volumeRootHash,
          dataProof: matchResultProof,
          volume: wrongVolume,
          amountProof: volumeProof,
          tokenUri: tokenURI,
        })
      ).to.be.revertedWith(
        `VolumeNotInConsensus(${wrongVolume}, "${volumeRootHash}"`
      );
    });

    it("should revert proof issuance when contract is paused", async () => {
      const {
        worker,
        greenproofContract,
        issuer,
        proofData,
        votingContract,
        issuerContract,
      } = await loadFixture(initFixture);

      await reachConsensus(
        proofData.inputHash,
        proofData.matchResult,
        votingContract,
        worker
      );

      await greenproofContract.pause();

      await expect(
        requestMinting(issuerContract, proofData, wallets[1], issuer)
      ).to.be.revertedWith("PausedContract()");
    });

    it("should reject proof issuance requests by non issuers", async () => {
      const { worker, issuerContract, votingContract, proofData } =
        await loadFixture(initFixture);

      await reachConsensus(
        proofData.inputHash,
        proofData.matchResult,
        votingContract,
        worker
      );

      await expect(
        issuerContract.requestProofIssuance({
          voteID: proofData.inputHash,
          generator: wallets[1].address,
          dataHash: proofData.volumeRootHash,
          dataProof: proofData.matchResultProof,
          volume: 10,
          amountProof: proofData.volumeProof,
          tokenUri: tokenURI,
        })
      ).to.be.revertedWith(`NotEnrolledIssuer("${owner.address}")`);
    });

    it("Authorized issuers can send proof issuance requests", async () => {
     await loadFixture(issuanceFixture);
    });

    it("Authorized issuers can send simple proof issuance requests", async () => {
      const {
        issuer,
        worker,
        receiver,
        proofData,
        issuerContract,
        votingContract,
      } = await loadFixture(initFixture);

      const certificateID = 1;

      await reachConsensus(
        proofData.simpleInputHash,
        proofData.simpleMatchResult,
        votingContract,
        worker
      );

      await expect(
        issuerContract.connect(issuer).requestProofIssuance({
          voteID: proofData.simpleMatchResult,
          generator: receiver.address,
          dataHash: proofData.simpleMatchResult,
          dataProof: proofData.matchResultProof,
          volume: proofData.volume,
          amountProof: proofData.volumeProof,
          tokenUri: tokenURI,
        })
      )
        .to.emit(issuerContract, "ProofMinted")
        .withArgs(
          certificateID,
          parseEther(proofData.volume.toString()).toString(),
          receiver.address
        );
    });

    it("should allow proof issuance after contract is unpaused", async () => {
      const {
        worker,
        issuer,
        receiver,
        votingContract,
        issuerContract,
        greenproofContract,
      } = await loadFixture(initFixture);

      const proofData = generateProofData();
      await reachConsensus(
        proofData.inputHash,
        proofData.matchResult,
        votingContract,
        worker
      );

      //Pausing contract
      tx = await greenproofContract.pause();
      let timestamp = await getTimeStamp(tx);

      await expect(tx)
        .to.emit(greenproofContract, "ContractPaused")
        .withArgs(timestamp, owner.address);

      await expect(
        requestMinting(issuerContract, proofData, receiver, issuer)
      ).to.be.revertedWith("PausedContract()");

      //Unpausing contract
      tx = await greenproofContract.unPause();
      timestamp = await getTimeStamp(tx);

      await expect(tx)
        .to.emit(greenproofContract, "ContractUnPaused")
        .withArgs(timestamp, owner.address);

      const certificateID = 1;
      await mintProof(
        issuerContract,
        certificateID,
        proofData,
        receiver,
        issuer
      );
    });

    it("reverts when issuers send duplicate proof issuance requests", async () => {
      const {
        issuer,
        receiver,
        proofData,
        issuerContract,
      } = await loadFixture(issuanceFixture);

      await expect(
        requestMinting(issuerContract, proofData, receiver, issuer)
      ).to.be.revertedWith(`AlreadyCertifiedData("${proofData.volumeRootHash}")`);
    });

    it("checks that the certified generation volume is correct after minting", async () => {
      const {
        receiver,
        proofData,
        certificateID,
        issuerContract,
      } = await loadFixture(issuanceFixture);

      const amountMinted = parseInt(
        formatEther(await issuerContract.balanceOf(receiver.address, certificateID))
      );

      expect(amountMinted).to.equal(proofData.volume);
    });

    it("should get the list of all certificate owners", async () => {
      const {
        owner,
        receiver,
        issuerContract,
      } = await loadFixture(issuanceFixture);

      const transferVolume = parseEther("2");

      await transfer(issuerContract, receiver, owner, transferVolume);

      const certificateOwners = await issuerContract.getCertificateOwners(1);
      expect(certificateOwners).to.be.deep.equal([
        receiver.address,
        owner.address,
      ]);
    });

    it("should get details of a minted certificate", async () => {

      const {
        mintTx,
        receiver,
        proofData,
        tokenAmount,
        certificateID,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const proof = await proofManagerContract.getProof(certificateID);

      const timestamp = await getTimeStamp(mintTx);

      expect(proof.issuanceDate).to.equal(timestamp);
      expect(proof.certificateID).to.equal(certificateID);
      expect(proof.generator).to.equal(receiver.address);
      expect(parseInt(formatEther(proof.volume))).to.equal(tokenAmount);
      expect(proof.merkleRootHash).to.be.deep.equal(proofData.volumeRootHash);
    });

    it("should revert when asking details for an invalid certificateID", async () => {
      const { owner, proofManagerContract } = await loadFixture(issuanceFixture);

      const invalidCertificateID = 42;

      await expect(
        proofManagerContract.connect(owner).getProof(invalidCertificateID)
      ).to.be.revertedWith("NonExistingCertificate");

      await expect(
        proofManagerContract.connect(owner).getProof(0)
      ).to.be.revertedWith("NonExistingCertificate");
    });

    it("should get all certificates of one owner", async () => {
      const {
        issuer,
        worker,
        proofData,
        issuerContract,
        votingContract,
        proofManagerContract,
      } = await loadFixture(initFixture);

      await votingContract
        .connect(worker)
        .vote(proofData.inputHash, proofData.matchResult);
      
      const certificateID1 = 1;
      const certificateID2 = 2;

      await mintProof(issuerContract, certificateID1, proofData, wallets[0], issuer);

      const secondProofData = generateProofData();
      await votingContract
        .connect(worker)
        .vote(secondProofData.inputHash, secondProofData.matchResult);

      await mintProof(issuerContract, certificateID2, secondProofData, wallets[0], issuer);

      const certs = await proofManagerContract.getProofsOf(wallets[0].address);

      expect(certs).to.have.length(2);
      const cert = certs[0];
      expect(cert.isRevoked).to.eql(false);
      expect(cert.certificateID).to.eql(BigNumber.from(1));
      expect(parseInt(formatEther(cert.volume))).to.eql(proofData.volume);
      expect(cert.merkleRootHash).to.eql(proofData.volumeRootHash);
      expect(cert.generator).to.eql(wallets[0].address);

      const secondCert = certs[1];
      expect(secondCert.isRevoked).to.eql(false);
      expect(secondCert.certificateID).to.eql(BigNumber.from(2));
      expect(parseInt(formatEther(secondCert.volume))).to.eql(
        secondProofData.volume
      );
      expect(secondCert.merkleRootHash).to.eql(secondProofData.volumeRootHash);
      expect(secondCert.generator).to.eql(wallets[0].address);
    });

    it("should revert when trying to fetch all certificates of non owner", async () => {
      const { proofManagerContract } = await loadFixture(issuanceFixture);

      await expect(
        proofManagerContract.getProofsOf(wallets[0].address)
      ).to.be.revertedWith(`NoProofsOwned`);
    });

    it("Should reject issuance requests for wrongs voteIDs", async () => {
      const { issuer, worker, proofData, issuerContract, votingContract } =
        await loadFixture(initFixture);

      const { inputHash: someOtherHash } = generateProofData();
      const receiver = wallets[0];

      await reachConsensus(
        proofData.inputHash,
        proofData.matchResult,
        votingContract,
        worker
      );

      const wrongData = { ...proofData, inputHash: someOtherHash };

      await expect(
        requestMinting(issuerContract, wrongData, receiver, issuer)
      ).to.be.revertedWith(someOtherHash);
    });
  });

  describe("Proof transfers tests", () => {
    it("should revert when one tries to transfer token ID = 0", async () => {
      const { issuerContract } = await loadFixture(initFixture);

      const certificateID = 0;
      const toTransferAmount = parseEther("2");
      const transferBytesData = ethers.utils.formatBytes32String("");


      await expect(
        issuerContract
          .connect(wallets[0])
          .safeTransferFrom(
            wallets[0].address,
            owner.address,
            certificateID,
            toTransferAmount,
            transferBytesData
          )
      ).to.be.revertedWith("ERC1155Base__TransferExceedsBalance");
    });

    it("should revert when one tries to transfer Batch certificates containing token ID = 0", async () => {
      const {
        owner,
        certificateID,
        issuerContract,
      } = await loadFixture(issuanceFixture);

      const nonExistingCertificateID = 0;
      const transferBytesData = ethers.utils.formatBytes32String("");

      await expect(
        issuerContract
          .connect(wallets[0])
          .safeBatchTransferFrom(
            wallets[0].address,
            owner.address,
            [certificateID, nonExistingCertificateID],
            [parseEther("2"), parseEther("2")],
            transferBytesData
          )
      ).to.be.revertedWith("ERC1155Base__TransferExceedsBalance");
    });

    it("should revert Batch certificates transfer when caller is not approved", async () => {
      const {
        receiver,
        certificateID,
        issuerContract,
      } = await loadFixture(issuanceFixture);

      const transferVolume = 2;

      const transferBytesData = ethers.utils.formatBytes32String("");
      const expectedRevertMessage = `NotOwnerOrApproved("${receiver.address}", "${minter.address}")`;

      await expect(
        issuerContract
          .connect(receiver)
          .safeBatchTransferFrom(
            minter.address,
            owner.address,
            [certificateID, certificateID],
            [transferVolume, transferVolume],
            transferBytesData
          )
      ).to.be.revertedWith(expectedRevertMessage);
    });

    it("should allow Batch certificates transfer when caller is approved", async () => {
      const {
        issuer,
        receiver,
        certificateID,
        issuerContract,
      } = await loadFixture(issuanceFixture);

      const toTransferVolume = parseEther("2");

      const transferBytesData = ethers.utils.formatBytes32String("");
      await issuerContract
        .connect(receiver)
        .setApprovalForAll(issuer.address, true);
      await expect(
        issuerContract
          .connect(issuer)
          .safeBatchTransferFrom(
            receiver.address,
            owner.address,
            [certificateID, certificateID],
            [toTransferVolume, toTransferVolume.sub(1)],
            transferBytesData
          )
      ).to.not.be.reverted;
    });

    it("should revert when one tries to transfer Batch certificates containing token ID > lastTokenIndex", async () => {
      const { certificateID, issuerContract } = await loadFixture(issuanceFixture);

      const nonExistingCertificateID = 42;
      const transferBytesData = ethers.utils.formatBytes32String("");

      await expect(
        issuerContract
          .connect(wallets[0])
          .safeBatchTransferFrom(
            wallets[0].address,
            owner.address,
            [certificateID, nonExistingCertificateID],
            [parseEther("2"), parseEther("2")],
            transferBytesData
          )
      ).to.be.revertedWith("'ERC1155Base__TransferExceedsBalance");
    });

    it("should revert Batch certificates transfers to a non generator wallet containing revoked certificate", async () => {
      const {
        owner,
        issuer,
        worker,
        receiver,
        certificateID,
        issuerContract,
        votingContract,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const certificateID2 = 2;
      const mintedVolume2 = 42;
      const certificateID1 = certificateID;
      const transferVolume = parseEther("2");

      const proofData2 = generateProofData({
        id: certificateID2,
        volume: mintedVolume2,
      });

      await reachConsensus(
        proofData2.inputHash,
        proofData2.matchResult,
        votingContract,
        worker
      );

      await mintProof(
        issuerContract,
        certificateID2,
        proofData2,
        receiver,
        issuer
      );

      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID2)
      ).to.emit(proofManagerContract, "ProofRevoked");

      const transferBytesData = ethers.utils.formatBytes32String("");
      const expectedRevertMessage = `NotAllowedTransfer(2, "${issuer.address}", "${owner.address}")`;

      await expect(
        issuerContract
          .connect(issuer)
          .safeBatchTransferFrom(
            issuer.address,
            owner.address,
            [certificateID1, certificateID2],
            [transferVolume, transferVolume],
            transferBytesData
          )
      ).to.be.revertedWith(expectedRevertMessage);
    });

    it("should allow Batch certificates transfers of revoked certificate to the generator wallet", async () => {
      const {
        owner,
        issuer,
        worker,
        revoker,
        receiver,
        issuerContract,
        votingContract,
        proofManagerContract,
      } = await loadFixture(initFixture);

      const mintedVolume1 = 21;
      const mintedVolume2 = 42;
      const certificateID1 = 1;
      const certificateID2 = 2;
      const transferVolume = parseEther("2");

      const proofData1 = generateProofData({
        id: certificateID1,
        volume: mintedVolume1,
      });

      const proofData2 = generateProofData({
        id: certificateID2,
        volume: mintedVolume2,
      });

      await reachConsensus(
        proofData1.inputHash,
        proofData1.matchResult,
        votingContract,
        worker
      );

      await reachConsensus(
        proofData2.inputHash,
        proofData2.matchResult,
        votingContract,
        worker
      );

      await mintProof(
        issuerContract,
        certificateID1,
        proofData1,
        receiver,
        issuer
      );

      await mintProof(
        issuerContract,
        certificateID2,
        proofData2,
        receiver,
        issuer
      );

      await transfer(
        issuerContract,
        receiver,
        owner,
        transferVolume,
        certificateID2
      );

      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID2)
      ).to.emit(proofManagerContract, "ProofRevoked");

      const transferBytesData = ethers.utils.formatBytes32String("");

      await expect(
        issuerContract
          .connect(receiver)
          .safeBatchTransferFrom(
            receiver.address,
            receiver.address,
            [certificateID1, certificateID2],
            [transferVolume, transferVolume],
            transferBytesData
          )
      ).to.emit(issuerContract, "TransferBatch");
    });

    it("should revert when one tries to transfer token ID > lastTokenIndex", async () => {
      const { issuerContract, minter } = await loadFixture(initFixture);

      const invalidTokenIndex = 1;

      await expect(
        issuerContract
          .connect(minter)
          .safeTransferFrom(
            minter.address,
            owner.address,
            invalidTokenIndex,
            parseEther("2"),
            transferBytesData
          )
      ).to.be.revertedWith("ERC1155Base__TransferExceedsBalance");
    });

    it("should correctly transfer certificates", async () => {
      const {
        owner,
        receiver,
        tokenAmount,
        certificateID,
        issuerContract,
      } = await loadFixture(issuanceFixture);

      const transferVolume = parseEther("2");

      await transfer(issuerContract, receiver, owner, transferVolume);

      const senderBalance = await issuerContract.balanceOf(
        receiver.address,
        certificateID
      );

      const ownerBalance = await issuerContract.balanceOf(
        owner.address,
        certificateID
      );

      expect(senderBalance).to.equal(
        parseEther(tokenAmount.toString()).sub(transferVolume)
      );
      expect(ownerBalance).to.equal(transferVolume);
    });

    it("should revert when non approvers tries to approve operators", async () => {
      const { issuerContract, owner, wallets } = await loadFixture(initFixture);
      const approvedSender = wallets[6];

      const expectedErrorMessage = `NotEnrolledApprover("${owner.address}")`;

      await expect(
        issuerContract.approveOperator(approvedSender.address, owner.address)
      ).to.be.revertedWith(expectedErrorMessage);
    });

    it("should revert when non approvers tries to remove operators' approval", async () => {
      const { issuerContract, owner } = await loadFixture(initFixture);
      const approvedSender = wallets[6];

      const expectedErrorMessage = `NotEnrolledApprover("${owner.address}")`;

      // 1 - checks that operator is correctly approved
      await expect(
        issuerContract
          .connect(approver)
          .approveOperator(approvedSender.address, owner.address)
      )
        .to.emit(issuerContract, "OperatorApproved")
        .withArgs(approvedSender.address, owner.address, approver.address);

      // 2 - Non approver tries to remove operator
      await expect(
        issuerContract.removeApprovedOperator(
          approvedSender.address,
          owner.address
        )
      ).to.be.revertedWith(expectedErrorMessage);
    });

    it("should revert when approver tries to self approve as operators", async () => {
      const { issuerContract, owner } = await loadFixture(initFixture);

      const expectedErrorMessage = `ForbiddenSelfApproval("${approver.address}", "${owner.address}")`;

      await expect(
        issuerContract
          .connect(approver)
          .approveOperator(approver.address, owner.address)
      ).to.be.revertedWith(expectedErrorMessage);
    });

    it("should not revert when approver self removes from operators", async () => {
      const { issuerContract, owner } = await loadFixture(initFixture);

      const secondApprover = wallets[6];
      await grantRole(secondApprover, roles.approverRole);

      // Since an approver cannot self approve, another approver has to do it first
      await expect(
        issuerContract
          .connect(approver)
          .approveOperator(secondApprover.address, owner.address)
      )
        .to.emit(issuerContract, "OperatorApproved")
        .withArgs(secondApprover.address, owner.address, approver.address);

      // the approver should be allowed to self remove approval rights
      await expect(
        issuerContract
          .connect(secondApprover)
          .removeApprovedOperator(secondApprover.address, owner.address)
      )
        .to.emit(issuerContract, "OperatorRemoved")
        .withArgs(
          secondApprover.address,
          owner.address,
          secondApprover.address
        );
    });

    it("should correctly approve operators for certificate owners", async () => {
      const { issuerContract, owner } = await loadFixture(initFixture);

      const approvedSender = wallets[6];

      await expect(
        issuerContract
          .connect(approver)
          .approveOperator(approvedSender.address, owner.address)
      )
        .to.emit(issuerContract, "OperatorApproved")
        .withArgs(approvedSender.address, owner.address, approver.address);
    });

    it("should correctly remove operators approval's for transferring other certificates", async () => {
      const { issuerContract, owner } = await loadFixture(initFixture);

      const approvedSender = wallets[6];
      const maxIterations = 100;

      //checking that we can add/ remove transfer rights several times
      for (i = 0; i < maxIterations; i++) {
        // 1 - We first grant transfer rights to the operator for the owner
        await expect(
          issuerContract
            .connect(approver)
            .approveOperator(approvedSender.address, owner.address)
        )
          .to.emit(issuerContract, "OperatorApproved")
          .withArgs(approvedSender.address, owner.address, approver.address);

        // 2 - We later remove the approval of the operator
        await expect(
          issuerContract
            .connect(approver)
            .removeApprovedOperator(approvedSender.address, owner.address)
        )
          .to.emit(issuerContract, "OperatorRemoved")
          .withArgs(approvedSender.address, owner.address, approver.address);
      }
    });

    it("should prevent already approved operators from being approved again", async () => {
      const { issuerContract, owner } = await loadFixture(initFixture);

      const approvedSender = wallets[6];
      const expectedErrorMessage = `AlreadyApprovedOperator("${approvedSender.address}", "${owner.address}")`;

      await expect(
        issuerContract
          .connect(approver)
          .approveOperator(approvedSender.address, owner.address)
      )
        .to.emit(issuerContract, "OperatorApproved")
        .withArgs(approvedSender.address, owner.address, approver.address);

      await expect(
        issuerContract
          .connect(approver)
          .approveOperator(approvedSender.address, owner.address)
      ).to.be.revertedWith(expectedErrorMessage);
    });

    it("should prevent already removed operators from being removed again", async () => {
      const { issuerContract, owner } = await loadFixture(initFixture);

      const approvedSender = wallets[6];
      const expectedRevertMessage = `AlreadyRemovedOperator("${approvedSender.address}", "${owner.address}")`;

      // 1 - We first grant transfer rights to the operator for the owner
      await expect(
        issuerContract
          .connect(approver)
          .approveOperator(approvedSender.address, owner.address)
      )
        .to.emit(issuerContract, "OperatorApproved")
        .withArgs(approvedSender.address, owner.address, approver.address);

      // 2 - We later remove the approval of the operator
      await expect(
        issuerContract
          .connect(approver)
          .removeApprovedOperator(approvedSender.address, owner.address)
      )
        .to.emit(issuerContract, "OperatorRemoved")
        .withArgs(approvedSender.address, owner.address, approver.address);

      // 2 - We should be able to call `removeApprovedOperator`function again
      await expect(
        issuerContract
          .connect(approver)
          .removeApprovedOperator(approvedSender.address, owner.address)
      ).to.be.revertedWith(expectedRevertMessage);
    });

    it("should allow approved parties to transfer certificates on behalf of certificate owner", async () => {
      const { owner, receiver, certificateID, issuerContract, tokenAmount } = await loadFixture(issuanceFixture);

      const approvedSender = wallets[6];
      const transferVolume = parseEther("2");

      // 1 - The authorized appover approves the new sender
      await expect(
        issuerContract
          .connect(approver)
          .approveOperator(approvedSender.address, receiver.address)
      )
        .to.emit(issuerContract, "OperatorApproved")
        .withArgs(approvedSender.address, receiver.address, approver.address);

      // 2 - The approved sender transfers the certificate to the receiver on behalf of the generator
      await expect(
        transferFor(
          issuerContract,
          approvedSender,
          receiver,
          owner,
          certificateID,
          transferVolume
        )
      )
        .to.emit(issuerContract, "TransferSingle")
        .withArgs(
          approvedSender.address,
          receiver.address,
          owner.address,
          certificateID,
          transferVolume
        );

      // 3 - We verify that the transfer has been correctly made
      const generatorBalance = await issuerContract.balanceOf(
        receiver.address,
        certificateID
      );
      const ownerBalance = await issuerContract.balanceOf(
        owner.address,
        certificateID
      );

      expect(generatorBalance).to.equal(
        parseEther(tokenAmount.toString()).sub(transferVolume)
      );
      expect(ownerBalance).to.equal(transferVolume);
    });
  });

  describe("Proof revocation tests", () => {
    it("should prevent a non authorized entity from revoking non retired proof", async () => {
      const {
        worker,
        issuer,
        receiver,
        proofManagerContract,
        proofData,
        votingContract,
        issuerContract,
      } = await loadFixture(initFixture);

      const certificateID = 1;

      await reachConsensus(
        proofData.inputHash,
        proofData.matchResult,
        votingContract,
        worker
      );
      const unauthorizedOperator = issuer;
      await mintProof(
        issuerContract,
        certificateID,
        proofData,
        receiver,
        unauthorizedOperator
      );
      await revokeRole(unauthorizedOperator, roles.revokerRole);

      await expect(
        proofManagerContract.connect(unauthorizedOperator).revokeProof(certificateID)
      ).to.be.revertedWith(
        `NotEnrolledRevoker("${unauthorizedOperator.address}")`
      );
    });

    it("should prevent revocation of non existing certificates", async () => {
      const { proofManagerContract, revoker } = await loadFixture(initFixture);

      const nonExistingCertificateID = 1;

      await expect(
        proofManagerContract
          .connect(revoker)
          .revokeProof(nonExistingCertificateID)
      ).to.be.revertedWith(
        `NonExistingCertificate(${nonExistingCertificateID})`
      );
    });

    it("should allow an authorized entity to revoke a non retired proof", async () => {
      const {
        revoker,
        certificateID,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.emit(proofManagerContract, "ProofRevoked");
    });

    it("should revert when transfering revoked proof", async () => {
      const {
        revoker,
        certificateID,
        issuerContract,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.emit(proofManagerContract, "ProofRevoked");

      const expectedRevertMessage = `NotAllowedTransfer(${certificateID}, "${owner.address}", "${revoker.address}")`;

      await expect(
        issuerContract.safeTransferFrom(
          owner.address,
          revoker.address,
          certificateID,
          parseEther("1"),
          transferBytesData
        )
      ).to.be.revertedWith(expectedRevertMessage);
    });

    it("should allow transfer of revoked proof only to generator", async () => {
      const {
        owner,
        receiver,
        revoker,
        certificateID,
        issuerContract,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const volumeToTransfer = parseEther("21");

      //transfert the certificate to the owner
      await issuerContract
        .connect(receiver)
        .safeTransferFrom(
          receiver.address,
          owner.address,
          certificateID,
          volumeToTransfer,
          transferBytesData
        );

      //Certificate revocation
      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.emit(proofManagerContract, "ProofRevoked");

      const expectedRevertMessage = `NotAllowedTransfer(${certificateID}, "${owner.address}", "${revoker.address}")`;

      await expect(
        issuerContract.safeTransferFrom(
          owner.address,
          revoker.address,
          certificateID,
          parseEther("1"),
          transferBytesData
        )
      ).to.be.revertedWith(expectedRevertMessage);

      //only generator can receive back revoked proofs
      await expect(
        issuerContract.safeTransferFrom(
          owner.address,
          receiver.address,
          certificateID,
          volumeToTransfer,
          transferBytesData
        )
      ).to.be.not.reverted;
    });

    it("should prevent duplicate revocation", async () => {
      const {
        revoker,
        certificateID,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.emit(proofManagerContract, "ProofRevoked");

      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.be.revertedWith(`ProofRevoked(${certificateID})`);
    });

    it("should revert if claimer tries to retire a revoked proof", async () => {
      const {
        claimer,
        revoker,
        certificateID,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const amountToClaim = 42;

      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.emit(proofManagerContract, "ProofRevoked");

      await expect(
        proofManagerContract
          .connect(claimer)
          .claimProofFor(certificateID, owner.address, amountToClaim)
      ).to.be.revertedWith(`ProofRevoked(${certificateID})`);
    });

    it("should revert if non claimer tries to claim proof", async () => {
      const {
        wallets,
        certificateID,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const amountToClaim = 42;
      const notClaimer = wallets[ 6 ];

      await expect(
        proofManagerContract
          .connect(notClaimer)
          .claimProofFor(certificateID, receiver.address, amountToClaim)
      ).to.be.revertedWith(`NotEnrolledClaimer("${notClaimer.address}")`);
    });

    it("should revert if owner tries to retire a revoked proof", async () => {
      const {
        receiver,
        revoker,
        certificateID,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const claimedVolume = 1;

      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.emit(proofManagerContract, "ProofRevoked");

      await expect(
        proofManagerContract
          .connect(receiver)
          .claimProof(certificateID, claimedVolume)
      ).to.be.revertedWith(`ProofRevoked(${certificateID})`);
    });

    it("should allow claiming proofs for others", async () => {
      const {
        receiver,
        proofData,
        tokenAmount,
        certificateID,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const claimedVolume = parseEther((proofData.volume - 2).toString());

      const initialClaimedAmount = await proofManagerContract.claimedBalanceOf(
        receiver.address,
        certificateID
      );

      expect(initialClaimedAmount).to.equal(0);

      await claimVolumeFor(proofManagerContract, receiver, claimedVolume);

      const claimedProofsAmount = await proofManagerContract.claimedBalanceOf(
        receiver.address,
        certificateID
      );

      expect(claimedProofsAmount).to.equal(claimedVolume);

      const remainingVolume = await proofManagerContract.getProofsOf(
        receiver.address
      );

      expect(remainingVolume[0].volume).to.equal(
        parseEther(tokenAmount.toString()).sub(claimedVolume)
      );
    });

    it("should allow claiming proofs", async () => {
      const {
        receiver,
        proofData,
        tokenAmount,
        certificateID,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const claimedVolume = parseEther((proofData.volume - 2).toString());

      const initialClaimedAmount = await proofManagerContract.claimedBalanceOf(
        receiver.address,
        certificateID
      );

      expect(initialClaimedAmount).to.equal(0);

      await claimVolume(proofManagerContract, receiver, claimedVolume);

      const claimedProofsAmount = await proofManagerContract.claimedBalanceOf(
        receiver.address,
        certificateID
      );

      expect(claimedProofsAmount).to.equal(claimedVolume);

      const remainingVolume = await proofManagerContract.getProofsOf(
        receiver.address
      );

      expect(remainingVolume[0].volume).to.equal(
        parseEther(`${tokenAmount}`).sub(claimedVolume)
      );
    });

    it("should revert when retirement for others amount exceeds owned volume", async () => {
      const {
        issuer,
        claimer,
        certificateID,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const claimedVolume = parseEther("6");

      await expect(
        proofManagerContract
          .connect(claimer)
          .claimProofFor(certificateID, issuer.address, claimedVolume)
      ).to.be.revertedWith(
        `InsufficientBalance("${issuer.address}", ${certificateID}, ${claimedVolume})`
      );
    });

    it("should revert when retirement amount exceeds owned volume", async () => {
      const {
        receiver,
        certificateID,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const claimedVolume = parseEther("46");

      await expect(
        proofManagerContract
          .connect(receiver)
          .claimProof(certificateID, claimedVolume)
      ).to.be.revertedWith(
        `InsufficientBalance("${receiver.address}", ${certificateID}, ${claimedVolume})`
      );
    });

    it("should allow authorized revoker to revoke a retired proof during the revocable Period", async () => {
      const {
        revoker,
        receiver,
        certificateID,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const claimedVolume = parseEther("5");
      await claimVolumeFor(proofManagerContract, receiver, claimedVolume);

      const tx = proofManagerContract.connect(revoker).revokeProof(certificateID);

      await expect(tx).to.emit(proofManagerContract, "ProofRevoked");
    });

    it("should prevent authorized revoker from revoking a retired proof after the revocable Period", async () => {
      const {
        revoker,
        certificateID,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const claimedVolume = parseEther("5");
      const proof = await proofManagerContract.getProof(certificateID);
      const issuanceDate = Number(proof.issuanceDate.toString());

      await claimVolumeFor(proofManagerContract, receiver, claimedVolume);

      //forward time to reach end of revocable period
      await timeTravel(revokablePeriod);

      const tx = proofManagerContract
        .connect(revoker)
        .revokeProof(certificateID);

      //The certificate should not be revocable anymore
      await expect(tx).to.be.revertedWith(
        `TimeToRevokeElapsed(${certificateID}, ${issuanceDate}, ${revokablePeriod})`
      );
    });

    it("allows to reissue revoked certificate", async () => {
      const {
        issuer,
        revoker,
        receiver,
        proofData,
        issuerContract,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const certificateID2 = 2;

      await expect(
        requestMinting(issuerContract, proofData, receiver, issuer)
      ).to.be.revertedWith(`AlreadyCertifiedData("${proofData.volumeRootHash}")`);

      const certificateId = await proofManagerContract.getProofIdByDataHash(
        proofData.volumeRootHash
      );

      await proofManagerContract.connect(revoker).revokeProof(certificateId);

      await mintProof(
        issuerContract,
        certificateID2,
        proofData,
        receiver,
        issuer
      );
    });

    it("allows to get proof ID by data hash", async () => {
      const {
        proofData,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const certificateId = await proofManagerContract.getProofIdByDataHash(
        proofData.volumeRootHash
      );

      expect(BigNumber.from(certificateId).toNumber()).to.be.gt(0);
    });
  });

  describe("Proof verification tests", () => {
    it("should verify all kinds of proofs", async () => {
      const { proofManagerContract, owner } = await loadFixture(initFixture);

      const data = [
        { id: 1, generatorID: 2, volume: 10, consumerID: 500 },
        { id: 2, generatorID: 3, volume: 10, consumerID: 522 },
        { id: 3, generatorID: 4, volume: 10, consumerID: 52 },
        { id: 4, generatorID: 5, volume: 10, consumerID: 53 },
        { id: 5, generatorID: 5, volume: 10, consumerID: 51 },
      ];
      const leaves = data.map((item) => createPreciseProof(item).getHexRoot());
      const tree = createMerkleTree(leaves);
      const root = tree.getHexRoot();

      for (let leaf of leaves) {
        const proof = tree.getHexProof(leaf);
        expect(
          await proofManagerContract
            .connect(owner)
            .verifyProof(root, leaf, proof)
        ).to.be.true;
      }

      for (let dataLeaf of data) {
        const leafTree = createPreciseProof(dataLeaf);
        const leafRoot = leafTree.getHexRoot();
        const leafLeaf = hash(
          "consumerID" + JSON.stringify(dataLeaf.consumerID)
        );
        const leafProof = leafTree.getHexProof(leafLeaf);
        expect(
          await proofManagerContract
            .connect(owner)
            .verifyProof(leafRoot, leafLeaf, leafProof)
        ).to.be.true;
      }
    });

    it("should successfully verify a proof", async () => {
      const { proofManagerContract, owner } = await loadFixture(initFixture);

      const data = [
        { id: 7, generatorID: 4735, volume: 7, consumerID: 7408562 },
        { id: 7408562, generatorID: 7408562, volume: 4735, consumerID: 7 },
        { id: 227777, generatorID: 227777, volume: 7408562, consumerID: 4735 },
        { id: 127, generatorID: 127, volume: 227777, consumerID: 127 },
        { id: 4735, generatorID: 7, volume: 127, consumerID: 227777 },
      ];
      const merkleInfos = getMerkleProof(data);
      const merkleRoot = merkleInfos.merkleRoot;

      for (const proof of merkleInfos.proofs) {
        expect(
          await proofManagerContract
            .connect(owner)
            .verifyProof(merkleRoot, proof.hexLeaf, proof.leafProof)
        ).to.be.true;
      }
    });
  });

  describe("Data disclosure tests", async () => {
    it("should revert when non authorized user tries to disclose data", async () => {
      const { minter, proofData, issuerContract } = await loadFixture(
        initFixture
      );

      const unauthorizedOperator = minter;
      await revokeRole(unauthorizedOperator, roles.issuerRole);
      const key = "consumerID";

      const disclosedDataTree = proofData.volumeTree;
      const dataLeaf = hash(key + proofData.volume);
      const dataProof = disclosedDataTree.getHexProof(dataLeaf);
      const dataRootHash = disclosedDataTree.getHexRoot();

      await expect(
        issuerContract
          .connect(unauthorizedOperator)
          .discloseData(key, proofData.volume, dataProof, dataRootHash)
      ).to.be.revertedWith(
        `NotEnrolledIssuer("${unauthorizedOperator.address}")`
      );
    });

    it("should allow authorized user to disclose data", async () => {
      const { issuer, proofData, issuerContract } = await loadFixture(
        initFixture
      );

      const key = "consumerID";
      const dataLeaf = hash(key + `${proofData.consumerID}`);
      const disclosedDataTree = proofData.volumeTree;
      const dataProof = disclosedDataTree.getHexProof(dataLeaf);
      const dataRootHash = disclosedDataTree.getHexRoot();

      await issuerContract
        .connect(issuer)
        .discloseData(key, `${proofData.consumerID}`, dataProof, dataRootHash);
    });

    it("should revert when one tries to disclose not verified data", async () => {
      const { issuer, proofData, issuerContract } = await loadFixture(
        initFixture
      );

      const key = "consumerID";
      const dataLeaf = hash(key + `${proofData.consumerID}`);
      const disclosedDataTree = proofData.volumeTree;
      const dataProof = disclosedDataTree.getHexProof(dataLeaf);
      const dataRootHash = disclosedDataTree.getHexRoot();

      const notExistingConsumerID = proofData.consumerID + 1;
      const notExistingKey = key + "xD";
      await expect(
        issuerContract
          .connect(issuer)
          .discloseData(
            key,
            `${notExistingConsumerID}`,
            dataProof,
            dataRootHash
          )
      ).to.be.revertedWith("InvalidProof");
      await expect(
        issuerContract
          .connect(issuer)
          .discloseData(
            notExistingKey,
            `${proofData.consumerID}`,
            dataProof,
            dataRootHash
          )
      ).to.be.revertedWith("InvalidProof");
    });

    it("should revert when one tries to disclose already disclosed data", async () => {
      const { issuer, proofData, issuerContract } = await loadFixture(
        initFixture
      );

      const key = "consumerID";
      const dataLeaf = hash(key + `${proofData.consumerID}`);
      const disclosedDataTree = proofData.volumeTree;
      const dataProof = disclosedDataTree.getHexProof(dataLeaf);
      const dataRootHash = disclosedDataTree.getHexRoot();

      await issuerContract
        .connect(issuer)
        .discloseData(key, `${proofData.consumerID}`, dataProof, dataRootHash);

      await expect(
        issuerContract
          .connect(issuer)
          .discloseData(key, `${proofData.consumerID}`, dataProof, dataRootHash)
      ).to.be.revertedWith(`AlreadyDisclosedData("${dataRootHash}", "${key}")`);
    });
  });

  describe("Meta-Certificate Issuance", () => {
    const metaTokenURI = "";

    it("should correctly retrieve the token address", async () => {
      const { metatokenContract } = await loadFixture(initFixture);

      const tokenAddress = await metatokenContract.getMetaTokenAddress();

      expect(tokenAddress).to.be.properAddress;
    });

    it("should correctly read the metoken name", async () => {
      const { metatokenContract } = await loadFixture(initFixture);

      const tokenAddress = await metatokenContract.getMetaTokenAddress();
      const metaToken = await ethers.getContractAt("MetaToken", tokenAddress);

      const metaTokenName = await metaToken.name();
      const metaTokenSymbol = await metaToken.symbol();

      expect(metaTokenName).to.equal("SER Certificate");
      expect(metaTokenSymbol).to.equal("SERC");
    });

    it("should revert when non admin tries to issue meta-certificate on token contract", async () => {
      const { wallets, receiver, certificateID, tokenAmount, metatokenContract } = await loadFixture(issuanceFixture);

      const tokenAddress = await metatokenContract.getMetaTokenAddress();
      const metaToken = await ethers.getContractAt("MetaToken", tokenAddress);
      const nonAdmin = wallets[ 1 ];

      // Trying to direclty call the issuance function on the token contract without being admin
      await expect(
        metaToken
          .connect(nonAdmin)
          .issueMetaToken(certificateID, tokenAmount, receiver.address, metaTokenURI)
      ).to.be.revertedWith(`NotAdmin("${nonAdmin.address}")`);
    });

    it("should revert when non Issuer tries to issue meta-certificate", async () => {
      const {
        wallets,
        receiver,
        tokenAmount,
        certificateID,
        metatokenContract,
      } = await loadFixture(issuanceFixture);

      const unauthorizedOperator = wallets[0];
      await revokeRole(unauthorizedOperator, roles.issuerRole);

      await expect(
        metatokenContract
          .connect(unauthorizedOperator)
          .issueMetaToken(
            certificateID,
            tokenAmount,
            receiver.address,
            metaTokenURI
          )
      ).to.be.revertedWith(
        `NotEnrolledIssuer("${unauthorizedOperator.address}")`
      );
    });

    it("should revert when one tries to issue meta-certificate to zeroAddress", async () => {
      const {
        issuer,
        wallets,
        tokenAmount,
        certificateID,
        metatokenContract,
      } = await loadFixture(issuanceFixture);

      const zeroAddress = ethers.constants.AddressZero;

      // impersonate greenproof contract signer
      const asGreenPoofContractSigner = await ethers.getImpersonatedSigner(
        greenproofAddress
      );

      // Sending ethers to greenproof contract signer
      await wallets[0].sendTransaction({
        to: asGreenPoofContractSigner.address,
        value: ethers.utils.parseEther("10"),
      });

      const tokenAddress = await metatokenContract.getMetaTokenAddress();
      const metaToken = await ethers.getContractAt("MetaToken", tokenAddress);

      // Trying to direclty call the issuance function as admin with address 0 as receiver
      await expect(
        metaToken
          .connect(asGreenPoofContractSigner)
          .issueMetaToken(tokenAmount, tokenAmount, zeroAddress, metaTokenURI)
      ).to.be.revertedWith(`invalidZeroAddress()`);

      await expect(
        metatokenContract
          .connect(issuer)
          .issueMetaToken(certificateID, tokenAmount, zeroAddress, metaTokenURI)
      ).to.be.revertedWith(`ForbiddenZeroAddressReceiver()`);
    });

    it("Should revert when issuing meta-certitificate for not owned parent certificate", async () => {
      const { issuer, metatokenContract, receiver } = await loadFixture(initFixture);
      const certificateID = 1;
      const tokenAmount = 42;

      await expect(
        metatokenContract
          .connect(issuer)
          .issueMetaToken(
            certificateID,
            tokenAmount,
            receiver.address,
            metaTokenURI
          )
      ).to.be.revertedWith(
        `NotAllowedIssuance(${certificateID}, "${receiver.address}", ${parseEther(tokenAmount.toString())}, 0)`
      );
    });

    it("should revert when one tries to issue meta-certificate from revoked certificate", async () => {
      const {
        issuer,
        receiver,
        certificateID,
        metatokenContract,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      const tokenAmount = 21;

      const availableVolume = ethers.utils.parseEther("42");

      // revoke certificate
      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.emit(proofManagerContract, "ProofRevoked");

      await expect(
        metatokenContract
          .connect(issuer)
          .issueMetaToken(
            certificateID,
            tokenAmount,
            receiver.address,
            metaTokenURI
          )
      ).to.be.revertedWith(
        `NotAllowedIssuance(${certificateID}, "${receiver.address}", ${parseEther(tokenAmount.toString())}, ${availableVolume})`
      );
    });

    it("Should revert when issuing more meta-certitificate than owned parent certificate volume", async () => {
      const {
        issuer,
        receiver,
        tokenAmount,
        certificateID,
        metatokenContract,
      } = await loadFixture(issuanceFixture);

      const exceededAmount = tokenAmount + 1;
      const availableVolume = ethers.utils.parseEther("42");

      await expect(
        metatokenContract
          .connect(issuer)
          .issueMetaToken(
            certificateID,
            exceededAmount,
            receiver.address,
            metaTokenURI
          )
      ).to.be.revertedWith(
        `NotAllowedIssuance(${certificateID}, "${receiver.address}", ${parseEther(exceededAmount.toString())}, ${availableVolume})`
      );
    });

    it("Should revert when issuing more meta-certitificate than allowed", async () => {
      const {
        issuer,
        receiver,
        tokenAmount,
        certificateID,
        metatokenContract,
      } = await loadFixture(issuanceFixture);

      const tx = await metatokenContract
        .connect(issuer)
        .issueMetaToken(
          certificateID,
          tokenAmount / 2,
          receiver.address,
          metaTokenURI
        );

      const timestamp = (await ethers.provider.getBlock(tx.blockNumber))
        .timestamp;

      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(
          certificateID,
          receiver.address,
          timestamp,
          parseEther(tokenAmount.toString()).div(2)
        );

      const remainingIssuableVolume = ethers.utils.parseEther("21");

      await expect(
        metatokenContract
          .connect(issuer)
          .issueMetaToken(
            certificateID,
            tokenAmount,
            receiver.address,
            metaTokenURI
          )
      ).to.be.revertedWith(
        `NotAllowedIssuance(${certificateID}, "${receiver.address}", ${parseEther(tokenAmount.toString())}, ${remainingIssuableVolume})`
      );
    });

    it("should not issue meta-certificates when the feature is disabled", async () => {
      const {
        issuer,
        receiver,
        metatokenContract,
      } = await loadFixture(initWithoutMetaTokenFixture);

      const certificateID = 1;
      const tokenAmount = 42;

      await expect(
        metatokenContract
          .connect(issuer)
          .issueMetaToken(
            certificateID,
            tokenAmount,
            receiver.address,
            metaTokenURI
          )
      ).to.be.revertedWith(`MetaTokenIssuanceDisabled()`);
    });

    it("Authorized issuer should be able to issue meta-certificate", async () => {
      const {
        issuer,
        receiver,
        tokenAmount,
        certificateID,
        metatokenContract,
      } = await loadFixture(issuanceFixture);

      const tx = await metatokenContract
        .connect(issuer)
        .issueMetaToken(
          certificateID,
          tokenAmount,
          receiver.address,
          metaTokenURI
        );

      const timestamp = (await ethers.provider.getBlock(tx.blockNumber))
        .timestamp;

      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(certificateID, receiver.address, timestamp, parseEther(tokenAmount.toString()));
    });

    it("should correctly retrieve the totalSupply of meta-certificates", async () => {
      const {
        issuer,
        receiver,
        tokenAmount,
        certificateID,
        metatokenContract,
      } = await loadFixture(issuanceFixture);

      // totalSupply of meta certificate should be null before issuance
      let totalSupply = await metatokenContract.tokenSupply(certificateID);

      expect(totalSupply).to.equals(0);

      const metaToken = await ethers.getContractAt(
        "MetaToken",
        await metatokenContract.getMetaTokenAddress()
      );

      expect(await metaToken.tokenSupply(certificateID)).to.equals(0);

      const tx = await metatokenContract
        .connect(issuer)
        .issueMetaToken(
          certificateID,
          tokenAmount,
          receiver.address,
          metaTokenURI
        );

      const timestamp = (await ethers.provider.getBlock(tx.blockNumber))
        .timestamp;

      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(certificateID, receiver.address, timestamp, parseEther(tokenAmount.toString()));

      // totalSupply of meta certificate should be updated to ${tokenAmount}
      totalSupply = await metatokenContract.tokenSupply(certificateID);

      expect(totalSupply).to.equals(parseEther(tokenAmount.toString()));
      expect(await metaToken.tokenSupply(certificateID)).to.equals(parseEther(tokenAmount.toString()));
    });

    it("Authorized revoker should be able to revoke meta-certificate", async () => {
      const {
        issuer,
        receiver,
        tokenAmount,
        certificateID,
        metatokenContract,
      } = await loadFixture(issuanceFixture);

      // issue meta-certificate
      tx = await metatokenContract
        .connect(issuer)
        .issueMetaToken(
          certificateID,
          tokenAmount,
          receiver.address,
          metaTokenURI
        );

      let timestamp = (await ethers.provider.getBlock(tx.blockNumber))
        .timestamp;

      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(certificateID, receiver.address, timestamp, parseEther(tokenAmount.toString()));

      // check that meta-certificate is not revoked
      const tokenAddress = await metatokenContract.getMetaTokenAddress();

      const metaToken = await ethers.getContractAt("MetaToken", tokenAddress);

      let isRevoked = await metaToken.isMetaTokenRevoked(certificateID);
      expect(isRevoked).to.be.false;
      expect(
        await metatokenContract.isMetaTokenRevoked(certificateID)
      ).to.be.equal(isRevoked);

      // revoke meta-certificate
      tx = await metatokenContract
        .connect(revoker)
        .revokeMetaToken(certificateID);
      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;
      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenRevoked")
        .withArgs(certificateID, timestamp);

      // check if meta-certificate is revoked
      isRevoked = await metaToken.isMetaTokenRevoked(certificateID);
      const revocationDate = await metaToken.tokenRevocationDate(certificateID);

      expect(isRevoked).to.be.true;

      expect(
        await metatokenContract.isMetaTokenRevoked(certificateID)
      ).to.be.equal(isRevoked);

      expect(revocationDate).to.equals(timestamp);
    });

    it("should revert when transfering a revoked meta-certificate", async () => {
      const {
        issuer,
        receiver,
        tokenAmount,
        certificateID,
        metatokenContract,
      } = await loadFixture(issuanceFixture);

      // issue meta-certificate
      tx = await metatokenContract
        .connect(issuer)
        .issueMetaToken(
          certificateID,
          tokenAmount,
          receiver.address,
          metaTokenURI
        );

      let timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(certificateID, receiver.address, timestamp, parseEther(tokenAmount.toString()));

      // revoke meta-certificate
      tx = await metatokenContract
        .connect(revoker)
        .revokeMetaToken(certificateID);
      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;
      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenRevoked")
        .withArgs(certificateID, timestamp);

      // check if meta-certificate is revoked
      const tokenAddress = await metatokenContract.getMetaTokenAddress();

      const metaToken = await ethers.getContractAt("MetaToken", tokenAddress);

      let isRevoked = await metaToken.isMetaTokenRevoked(certificateID);
      const revocationDate = await metaToken.tokenRevocationDate(certificateID);
      expect(isRevoked).to.be.true;
      expect(revocationDate).to.equals(timestamp);

      // transfer meta-certificate
      await expect(
        metaToken
          .connect(receiver)
          .safeTransferFrom(
            receiver.address,
            wallets[2].address,
            certificateID,
            tokenAmount,
            ethers.utils.formatBytes32String("")
          )
      ).to.be.revertedWith(`RevokedToken(${certificateID}, ${revocationDate})`);
    });

    it("Should revert when revoker tries to revoke meta-certificate twice", async () => {
      const {
        issuer,
        receiver,
        tokenAmount,
        certificateID,
        metatokenContract,
      } = await loadFixture(issuanceFixture);

      // issue meta-certificate
      let tx = await metatokenContract
        .connect(issuer)
        .issueMetaToken(
          certificateID,
          tokenAmount,
          receiver.address,
          metaTokenURI
        );

      let timestamp = (await ethers.provider.getBlock(tx.blockNumber))
        .timestamp;

      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(certificateID, receiver.address, timestamp, parseEther(tokenAmount.toString()));

      // check that meta-certificate is not revoked
      const tokenAddress = await metatokenContract.getMetaTokenAddress();

      const metaToken = await ethers.getContractAt("MetaToken", tokenAddress);

      let isRevoked = await metaToken.isMetaTokenRevoked(certificateID);
      expect(isRevoked).to.be.false;

      // revoke meta-certificate
      tx = await metatokenContract
        .connect(revoker)
        .revokeMetaToken(certificateID);

      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenRevoked")
        .withArgs(certificateID, timestamp);

      // check if meta-certificate is revoked
      isRevoked = await metaToken.isMetaTokenRevoked(certificateID);
      expect(isRevoked).to.be.true;

      await expect(
        metatokenContract.connect(revoker).revokeMetaToken(certificateID)
      ).to.be.revertedWith(`RevokedToken(${certificateID}, ${timestamp})`);
    });

    it("should revert when non admin tries to direclty revoke meta-certificate", async () => {
      const {
        issuer,
        wallets,
        receiver,
        tokenAmount,
        certificateID,
        metatokenContract,
      } = await loadFixture(issuanceFixture);

      const nonAdmin = wallets[2];

      // issue meta-certificate
      const tx = await metatokenContract
        .connect(issuer)
        .issueMetaToken(
          certificateID,
          tokenAmount,
          receiver.address,
          metaTokenURI
        );

      const timestamp = await getTimeStamp(tx);

      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(certificateID, receiver.address, timestamp, parseEther(tokenAmount.toString()));

      // direct revocation of meta-certificate on metaToken contract should revert
      const metaToken = await ethers.getContractAt(
        "MetaToken",
        await metatokenContract.getMetaTokenAddress()
      );

      await expect(
        metaToken.connect(nonAdmin).revokeMetaToken(certificateID)
      ).to.be.revertedWith(`NotAdmin("${nonAdmin.address}")`);
    });

    it("should revert when non authorized revoker tries to revoke meta-certificate", async () => {
      const {
        issuer,
        receiver,
        tokenAmount,
        certificateID,
        metatokenContract,
      } = await loadFixture(issuanceFixture);

      // issue meta-certificate
      const tx = await metatokenContract
        .connect(issuer)
        .issueMetaToken(
          certificateID,
          tokenAmount,
          receiver.address,
          metaTokenURI
        );

      const timestamp = await getTimeStamp(tx);

      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(certificateID, receiver.address, timestamp, parseEther(tokenAmount.toString()));

      // revocation of meta-certificate should revert
      const nonRevoker = wallets[2];
      await expect(
        metatokenContract.connect(nonRevoker).revokeMetaToken(certificateID)
      ).to.be.revertedWith(`NotEnrolledRevoker("${nonRevoker.address}")`);
    });

    it("Meta-certificate should correctly be revoked when parent certificate is revoked", async () => {
      const {
        issuer,
        receiver,
        tokenAmount,
        certificateID,
        metatokenContract,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);

      // issue meta-certificate
      let tx = await metatokenContract
        .connect(issuer)
        .issueMetaToken(
          certificateID,
          tokenAmount,
          receiver.address,
          metaTokenURI
        );

      let timestamp = await getTimeStamp(tx);

      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(certificateID, receiver.address, timestamp, parseEther(tokenAmount.toString()));

      // revoking parent certificate should revoke associated meta-certificate
      tx = await proofManagerContract
        .connect(revoker)
        .revokeProof(certificateID);

      timestamp = await getTimeStamp(tx);

      await expect(tx).to.emit(proofManagerContract, "ProofRevoked");

      await expect(tx)
        .to.emit(metatokenContract, "MetaTokenRevoked")
        .withArgs(certificateID, timestamp);
    });

    it("Should not revoke any meta-certificate when revoking a certificate with no derived certificates", async () => {
      const {
        certificateID,
        metatokenContract,
        proofManagerContract,
      } = await loadFixture(issuanceFixture);


      // revoking a certificate with no derived certificates should not revoke any meta-certificate
      const revokeTx = await proofManagerContract
        .connect(revoker)
        .revokeProof(certificateID);

      await expect(revokeTx).to.emit(proofManagerContract, "ProofRevoked");
      await expect(revokeTx).to.not.emit(metatokenContract, "MetaTokenRevoked");
    });

    it("Should not revoke a non existing meta-certificate", async () => {
      const {
        certificateID,
        metatokenContract,
      } = await loadFixture(issuanceFixture);

      // revoking a non existing meta-certificate should revert
      await expect(
        metatokenContract.connect(revoker).revokeMetaToken(certificateID)
      ).to.be.revertedWith(`MetaTokenNotFound(${certificateID})`);
    });
  });

  describe("Meta-Certificate Retirements", () => {
    it("Should correctly retire a meta-certificate", async () => {
      const { receiver, volume, metatokenContract, certificateID } = await loadFixture(initMetaTokenFixture);

      const beforeClaimBalance = await metatokenContract.getBalanceOf(receiver.address, certificateID);
      expect(beforeClaimBalance).to.equal(volume);

      const initialClaimedAmount = await metatokenContract.balanceClaimed(
        receiver.address,
        certificateID
      );
      expect(initialClaimedAmount).to.equal(0);

      const claimTx = await metatokenContract.connect(receiver).claimMetaToken(certificateID, volume)
      const timestamp = await getTimeStamp(claimTx);

      await expect(claimTx).to.emit(metatokenContract, "MetaTokenClaimed")
        .withArgs(certificateID, receiver.address, timestamp, volume);

      const afterClaimBalance = await metatokenContract.getBalanceOf(receiver.address, certificateID);
      expect(afterClaimBalance).to.equal(0);

      const finalClaimedAmount = await metatokenContract.balanceClaimed(
        receiver.address,
        certificateID
      );

      expect(finalClaimedAmount).to.equal(volume);
    });

    it("should revert when trying to retire a meta-certificate when the feature is disabled", async () => {
      const {
        metatokenContract
      } = await loadFixture(initWithoutMetaTokenFixture);

      const certificateID = 1;
      const tokenAmount = 42;

      await expect(
        metatokenContract
          .claimMetaToken(certificateID, tokenAmount)
      ).to.be.revertedWith("MetaTokenIssuanceDisabled()");
    });

    it("should revert when trying to delegately retire a meta-certificate when the feature is disabled", async () => {
      const {
        receiver,
        metatokenContract
      } = await loadFixture(initWithoutMetaTokenFixture);

      const certificateID = 1;
      const tokenAmount = 42;

      await expect(
        metatokenContract
          .claimMetaTokenFor(certificateID, tokenAmount, receiver.address)
      ).to.be.revertedWith("MetaTokenIssuanceDisabled()");
    });

    it("should revert when non enrolled claimer tries to delegately retire meta-certificate", async () => {
      const {
        volume,
        receiver,
        certificateID,
        metatokenContract
      } = await loadFixture(initMetaTokenFixture);

      const claimTx = metatokenContract.connect(receiver).claimMetaTokenFor(
        certificateID,
        parseEther(volume.toString()),
        receiver.address
      );

      await expect(claimTx).to.be.revertedWith(`NotEnrolledClaimer("${receiver.address}")`);
    });

    it("should allow an athorized claimer to delegately retire meta-certifificate", async () => {
      const {
        volume,
        claimer,
        receiver,
        certificateID,
        metatokenContract,
      } = await loadFixture(initMetaTokenFixture);

      const claimTx = await metatokenContract
        .connect(claimer)
        .claimMetaTokenFor(
          certificateID,
          volume,
          receiver.address
      );

      await claimTx.wait()
      
      const timestamp = await getTimeStamp(claimTx);

      await expect(claimTx)
        .to.emit(metatokenContract, `MetaTokenClaimed`)
      .withArgs(certificateID, claimer.address, timestamp, volume)
    });

    it("should revert when trying to delegately retire without balance", async () => {
      const {
        volume,
        claimer,
        certificateID,
        metatokenContract
      } = await loadFixture(initMetaTokenFixture);

      const notOwner = claimer.address;

      const expectedErrorMessage = `InsufficientBalance("${claimer.address}", ${certificateID}, ${volume})`

      await expect(
        metatokenContract.connect(claimer).claimMetaTokenFor(certificateID, volume, notOwner)
      ).to.be.revertedWith(expectedErrorMessage)
    });

    it("should allow a user to directly retire meta-certificate", async () => {
      const {
        volume,
        receiver,
        certificateID,
        metatokenContract
      } = await loadFixture(initMetaTokenFixture);

      const metaToken = await ethers.getContractAt(
        "MetaToken",
        await metatokenContract.getMetaTokenAddress()
      );

      let receiverBalance = await metaToken.getBalanceOf(receiver.address, certificateID);

      expect(receiverBalance).to.equal(volume);

      const claimTx = await metaToken.connect(receiver).claimMetaToken(certificateID, volume)
      const timestamp = await getTimeStamp(claimTx);

      await expect(claimTx)
        .to.emit(metaToken, 'MetaTokenClaimed')
        .withArgs(certificateID, receiver.address, timestamp, volume);
      
      receiverBalance = await metaToken.getBalanceOf(receiver.address, certificateID);

      expect(receiverBalance).to.equal(0);
    });

    it("should revert non admin tries to delegately retire meta-certificate", async () => {
      const {
        volume,
        claimer,
        receiver,
        certificateID,
        metatokenContract,
      } = await loadFixture(initMetaTokenFixture);

      const metaToken = await ethers.getContractAt(
        "MetaToken",
        await metatokenContract.getMetaTokenAddress()
      );

      await expect(
        metaToken
          .connect(claimer)
          .claimMetaTokenFor(certificateID, volume, receiver.address)
      ).to.be.revertedWith(`NotAdmin("${claimer.address}")`)
    });
  });

  describe("Batch operation tests", () => {
    describe("\t- Issuance", () => {
      it("should correctly mint a batch of certificates", async () => {
        const { issuerContract, receiver, votingContract, worker, issuer } =
          await loadFixture(initFixture);
        const batchQueue = [];
        const dataProofs = [];
        const nbIssuanceRequests = 20;

        for (let i = 0; i < nbIssuanceRequests; i++) {
          dataProofs.push(generateProofData({ volume: i + 1 }));

          await reachConsensus(
            dataProofs[i].inputHash,
            dataProofs[i].matchResult,
            votingContract,
            worker
          );

          batchQueue.push({
            volume: dataProofs[i].volume,
            voteID: dataProofs[i].inputHash,
            dataHash: dataProofs[i].volumeRootHash,
            dataProof: dataProofs[i].matchResultProof,
            amountProof: dataProofs[i].volumeProof,
            generator: receiver.address,
            tokenUri: "",
          });
        }

        const batchTx = await issuerContract
          .connect(issuer)
          .requestBatchIssuance(batchQueue);

        for (let i = 0; i < nbIssuanceRequests; i++) {
          await expect(batchTx)
            .to.emit(issuerContract, "ProofMinted")
            .withArgs(
              i + 1,
              parseEther(dataProofs[i].volume.toString()),
              receiver.address
            );
        }
      });

      it("should revert certificate batch issuance when non issuer requests batch issuance", async () => {
        const { issuerContract, receiver, votingContract, worker } =
          await loadFixture(initFixture);
        const nonIssuer = wallets[0];
        const batchQueue = [];
        const dataProofs = [];
        const nbIssuanceRequests = 20;

        for (let i = 0; i < nbIssuanceRequests; i++) {
          dataProofs.push(generateProofData({ volume: i + 1 }));
          await votingContract
            .connect(worker)
            .vote(dataProofs[i].inputHash, dataProofs[i].matchResult);
          batchQueue.push({
            volume: dataProofs[i].volume,
            voteID: dataProofs[i].inputHash,
            dataHash: dataProofs[i].volumeRootHash,
            dataProof: dataProofs[i].matchResultProof,
            amountProof: dataProofs[i].volumeProof,
            generator: receiver.address,
            tokenUri: "",
          });
        }

        await expect(
          issuerContract.connect(nonIssuer).requestBatchIssuance(batchQueue)
        ).to.be.revertedWith(`NotEnrolledIssuer("${nonIssuer.address}")`);
      });

      it("should revert certificate batch issuance when batch queue size exceeds the limit", async () => {
        const { issuerContract, receiver, votingContract, worker, issuer } =
          await loadFixture(initFixture);
        const batchQueue = [];
        const dataProofs = [];
        const maxQueueSize = 20;
        const nbIssuanceRequests = 21;

        for (let i = 0; i < nbIssuanceRequests; i++) {
          dataProofs.push(generateProofData({ volume: i + 1 }));
          await votingContract
            .connect(worker)
            .vote(dataProofs[i].inputHash, dataProofs[i].matchResult);
          batchQueue.push({
            volume: dataProofs[i].volume,
            voteID: dataProofs[i].inputHash,
            dataHash: dataProofs[i].volumeRootHash,
            dataProof: dataProofs[i].matchResultProof,
            amountProof: dataProofs[i].volumeProof,
            generator: receiver.address,
            tokenUri: "",
          });
        }

        await expect(
          issuerContract.connect(issuer).requestBatchIssuance(batchQueue)
        ).to.be.revertedWith(
          `BatchQueueSizeExceeded(${nbIssuanceRequests}, ${maxQueueSize})`
        );
      });
    });

    describe("\t- Transfer", () => {
      it("should correctly transfer a simple batch of certificates", async () => {
        const { issuerContract, receiver, votingContract, worker, issuer } =
          await loadFixture(initFixture);
        const nbIssuanceRequests = 20;

        const { batchQueue, dataProofs } = await prepareBatchIssuance(
          nbIssuanceRequests,
          votingContract,
          worker
        );

        const batchTx = await issuerContract
          .connect(issuer)
          .requestBatchIssuance(batchQueue);

        for (let i = 0; i < nbIssuanceRequests; i++) {
          await expect(batchTx)
            .to.emit(issuerContract, "ProofMinted")
            .withArgs(
              i + 1,
              parseEther(dataProofs[i].volume.toString()),
              receiver.address
            );
        }

        const { batchTransfers } = await prepareSimpleBatchTransfer(
          nbIssuanceRequests,
          receiver,
          dataProofs
        );

        const batchTransferTx = await issuerContract
          .connect(receiver)
          .simpleBatchTransfer(batchTransfers);

        for (let i = 0; i < nbIssuanceRequests; i++) {
          await expect(batchTransferTx)
            .to.emit(issuerContract, "TransferSingle")
            .withArgs(
              receiver.address,
              receiver.address,
              wallets[i % 5].address,
              i + 1,
              parseEther(dataProofs[i].volume.toString())
            );
        }
      });

      it("should revert simple batch transfer of certificates hen batch queue size exceeds the limit", async () => {
        const { issuerContract, receiver, votingContract, worker, issuer } =
          await loadFixture(initFixture);
        const maxQueueSize = 20;

        const { batchQueue, dataProofs } = await prepareBatchIssuance(
          maxQueueSize,
          votingContract,
          worker
        );

        const batchTx = await issuerContract
          .connect(issuer)
          .requestBatchIssuance(batchQueue);

        for (let i = 0; i < maxQueueSize; i++) {
          await expect(batchTx)
            .to.emit(issuerContract, "ProofMinted")
            .withArgs(
              i + 1,
              parseEther(dataProofs[i].volume.toString()),
              receiver.address
            );
        }

        const { batchTransfers } = await prepareSimpleBatchTransfer(
          maxQueueSize,
          receiver,
          dataProofs
        );

        const oversizedBatchTransfers = [...batchTransfers, batchTransfers[0]];
        await expect(
          issuerContract
            .connect(receiver)
            .simpleBatchTransfer(oversizedBatchTransfers)
        ).to.be.revertedWith(
          `BatchQueueSizeExceeded(${maxQueueSize + 1}, ${maxQueueSize})`
        );
      });

      it("should correctly transfer a multiple batch of certificates", async () => {
        const { issuerContract, receiver, votingContract, worker, issuer } =
          await loadFixture(initFixture);
        const nbIssuanceRequests = 20;

        const { batchQueue, dataProofs } = await prepareBatchIssuance(
          nbIssuanceRequests,
          votingContract,
          worker
        );

        const batchTx = await issuerContract
          .connect(issuer)
          .requestBatchIssuance(batchQueue);

        for (let i = 0; i < nbIssuanceRequests; i++) {
          await expect(batchTx)
            .to.emit(issuerContract, "ProofMinted")
            .withArgs(
              i + 1,
              parseEther(dataProofs[i].volume.toString()),
              receiver.address
            );
        }

        const { batchTransfers } = await prepareMultipleBatchTransfer(
          nbIssuanceRequests,
          receiver,
          dataProofs
        );

        const batchTransferTx = await issuerContract
          .connect(receiver)
          .multipleBatchTransfer(batchTransfers);

        for (let i = 0; i < nbIssuanceRequests; i++) {
          const halfOfAmount = parseEther(dataProofs[i].volume.toString()).div(
            2
          );
          await expect(batchTransferTx)
            .to.emit(issuerContract, "TransferBatch")
            .withArgs(
              receiver.address,
              receiver.address,
              wallets[i % 5].address,
              [i + 1, i + 1],
              [halfOfAmount, halfOfAmount]
            );
        }
      });

      it("should revert simple batch transfer of certificates when batch queue size exceeds the limit", async () => {
        const { issuerContract, receiver, votingContract, worker, issuer } =
          await loadFixture(initFixture);
        const maxQueueSize = 20;

        const { batchQueue, dataProofs } = await prepareBatchIssuance(
          maxQueueSize,
          votingContract,
          worker
        );

        const batchTx = await issuerContract
          .connect(issuer)
          .requestBatchIssuance(batchQueue);

        for (let i = 0; i < maxQueueSize; i++) {
          await expect(batchTx)
            .to.emit(issuerContract, "ProofMinted")
            .withArgs(
              i + 1,
              parseEther(dataProofs[i].volume.toString()),
              receiver.address
            );
        }

        const { batchTransfers } = await prepareMultipleBatchTransfer(
          maxQueueSize,
          receiver,
          dataProofs
        );

        const oversizedBatchTransfers = [...batchTransfers, batchTransfers[0]];
        await expect(
          issuerContract
            .connect(receiver)
            .multipleBatchTransfer(oversizedBatchTransfers)
        ).to.be.revertedWith(
          `BatchQueueSizeExceeded(${maxQueueSize + 1}, ${maxQueueSize})`
        );
      });
    });

    describe("\t- Claiming", () => {
      it("should revert if a user tries to claim a batch of non owned certificates", async () => {
        const {
          proofData,
          worker,
          receiver,
          proofManagerContract,
          votingContract,
        } = await loadFixture(initFixture);
        const proofData2 = generateProofData({ volume: 2 });

        await votingContract
          .connect(worker)
          .vote(proofData.inputHash, proofData.matchResult);
        await votingContract
          .connect(worker)
          .vote(proofData2.inputHash, proofData2.matchResult);

        const claimRequests = [
          { amount: parseEther("1"), certificateID: 1 },
          { amount: parseEther("1"), certificateID: 2 },
        ];

        await expect(
          proofManagerContract.connect(receiver).claimBatchProofs(claimRequests)
        ).to.be.revertedWith(
          `InsufficientBalance("${receiver.address}", 1, ${parseEther("1")})`
        );
      });

      it("should revert if batch of claims exceeds the size limit ", async () => {
        const {
          worker,
          receiver,
          claimer,
          issuer,
          proofManagerContract,
          votingContract,
          issuerContract,
        } = await loadFixture(initFixture);
        const maxbatchSize = 20;
        const oversizedBatch = [];

        for (let i = 0; i < maxbatchSize + 1; i++) {
          const volume = i + 1;
          const certificateID = i + 1;

          const proofData = generateProofData({ volume });
          await votingContract
            .connect(worker)
            .vote(proofData.inputHash, proofData.matchResult);

          await mintProof(issuerContract, i + 1, proofData, receiver, issuer);

          oversizedBatch.push({
            amount: parseEther(volume.toString()),
            certificateID,
          });
        }

        await expect(
          proofManagerContract.connect(claimer).claimBatchProofs(oversizedBatch)
        ).to.be.revertedWith(
          `BatchQueueSizeExceeded(${oversizedBatch.length}, ${maxbatchSize})`
        );
      });

      it("should claim a batch of proofs", async () => {
        const {
          issuer,
          worker,
          receiver,
          proofData,
          votingContract,
          issuerContract,
          proofManagerContract,
        } = await loadFixture(initFixture);

        const certificateID1 = 1;
        const certificateID2 = 2;
        const proofData2 = generateProofData({ volume: 2 });

        await reachConsensus(
          proofData.inputHash,
          proofData.matchResult,
          votingContract,
          worker
        );

        await reachConsensus(
          proofData2.inputHash,
          proofData2.matchResult,
          votingContract,
          worker
        );

        await mintProof(
          issuerContract,
          certificateID1,
          proofData,
          receiver,
          issuer
        );

        await mintProof(
          issuerContract,
          certificateID2,
          proofData2,
          receiver,
          issuer
        );

        const claimRequests = [
          { amount: parseEther("1"), certificateID: certificateID1 },
          { amount: parseEther("2"), certificateID: certificateID2 },
        ];

        const batchClaimTx = await proofManagerContract
          .connect(receiver)
          .claimBatchProofs(claimRequests);

        const timestamp = await getTimeStamp(batchClaimTx);

        await expect(batchClaimTx)
          .to.emit(proofManagerContract, "ProofClaimed")
          .withArgs(
            certificateID1,
            receiver.address,
            timestamp,
            claimRequests[0].amount
          );

        await expect(batchClaimTx)
          .to.emit(proofManagerContract, "ProofClaimed")
          .withArgs(
            certificateID2,
            receiver.address,
            timestamp,
            claimRequests[1].amount
          );
      });

      it("should revert if non claimer tries to delegately claim a batch of proofs", async () => {
        const {
          issuer,
          worker,
          receiver,
          proofData,
          votingContract,
          issuerContract,
          proofManagerContract,
        } = await loadFixture(initFixture);

        const certificateID1 = 1;
        const certificateID2 = 2;
        const proofData2 = generateProofData({ volume: 2 });

        await reachConsensus(
          proofData.inputHash,
          proofData.matchResult,
          votingContract,
          worker
        );

        await reachConsensus(
          proofData2.inputHash,
          proofData2.matchResult,
          votingContract,
          worker
        );

        const notClaimer = worker;

        await mintProof(
          issuerContract,
          certificateID1,
          proofData,
          receiver,
          issuer
        );

        await mintProof(
          issuerContract,
          certificateID2,
          proofData2,
          receiver,
          issuer
        );

        const claimRequests = [
          {
            amount: parseEther("1"),
            certificateID: certificateID1,
            certificateOwner: receiver.address,
          },
          {
            amount: parseEther("1"),
            certificateID: certificateID2,
            certificateOwner: receiver.address,
          },
        ];

        await expect(
          proofManagerContract
            .connect(notClaimer)
            .claimBatchProofsFor(claimRequests)
        ).to.be.revertedWith(`NotEnrolledClaimer("${notClaimer.address}")`);
      });

      it("should revert if the delegated claim queue size exceeds the limit ", async () => {
        const {
          worker,
          claimer,
          receiver,
          proofData,
          issuerContract,
          votingContract,
          proofManagerContract,
        } = await loadFixture(initFixture);

        const proofData2 = generateProofData({ volume: 2 });
        const maxbatchSize = 20;
        const oversizedBatch = [];
        const certificateID1 = 1;
        const certificateID2 = 2;

        await reachConsensus(
          proofData.inputHash,
          proofData.matchResult,
          votingContract,
          worker
        );

        await reachConsensus(
          proofData2.inputHash,
          proofData2.matchResult,
          votingContract,
          worker
        );

        await mintProof(
          issuerContract,
          certificateID1,
          proofData,
          receiver,
          issuer
        );
        await mintProof(
          issuerContract,
          certificateID2,
          proofData2,
          receiver,
          issuer
        );

        for (let i = 0; i < maxbatchSize + 1; i++) {
          oversizedBatch.push({
            amount: parseEther("1"),
            certificateID: i + 1,
            certificateOwner: receiver.address,
          });
        }

        await expect(
          proofManagerContract
            .connect(claimer)
            .claimBatchProofsFor(oversizedBatch)
        ).to.be.revertedWith(
          `BatchQueueSizeExceeded(${oversizedBatch.length}, ${maxbatchSize})`
        );
      });

      it("should delegately claim a batch of proofs", async () => {
        const {
          issuer,
          worker,
          claimer,
          receiver,
          proofData,
          votingContract,
          issuerContract,
          proofManagerContract,
        } = await loadFixture(initFixture);

        const proofData2 = generateProofData({ volume: 2 });
        const certificateID1 = 1;
        const certificateID2 = 2;

        await reachConsensus(
          proofData.inputHash,
          proofData.matchResult,
          votingContract,
          worker
        );

        await reachConsensus(
          proofData2.inputHash,
          proofData2.matchResult,
          votingContract,
          worker
        );

        await mintProof(
          issuerContract,
          certificateID1,
          proofData,
          receiver,
          issuer
        );

        await mintProof(
          issuerContract,
          certificateID2,
          proofData2,
          receiver,
          issuer
        );

        const claimRequests = [
          {
            amount: parseEther("1"),
            certificateID: certificateID1,
            certificateOwner: receiver.address,
          },
          {
            amount: parseEther("2"),
            certificateID: certificateID2,
            certificateOwner: receiver.address,
          },
        ];

        const batchClaimTx = await proofManagerContract
          .connect(claimer)
          .claimBatchProofsFor(claimRequests);

        const timestamp = await getTimeStamp(batchClaimTx);

        await expect(batchClaimTx)
          .to.emit(proofManagerContract, "ProofClaimed")
          .withArgs(1, receiver.address, timestamp, claimRequests[0].amount);

        await expect(batchClaimTx)
          .to.emit(proofManagerContract, "ProofClaimed")
          .withArgs(2, receiver.address, timestamp, claimRequests[1].amount);
      });
    });

    describe("\t- Proof Revocation", () => {
      it("should prevent a non authorized entity from revoking batch of non retired proof", async () => {
        const {
          issuer,
          worker,
          receiver,
          proofData,
          votingContract,
          issuerContract,
          proofManagerContract,
        } = await loadFixture(initFixture);

        const certificateID1 = 1;
        const certificateID2 = 2;
        const unauthorizedOperator = issuer;
        const proofData2 = generateProofData({ volume: 2 });

        await reachConsensus(
          proofData.inputHash,
          proofData.matchResult,
          votingContract,
          worker
        );

        await reachConsensus(
          proofData2.inputHash,
          proofData2.matchResult,
          votingContract,
          worker
        );

        await mintProof(
          issuerContract,
          certificateID1,
          proofData,
          receiver,
          issuer
        );

        await mintProof(
          issuerContract,
          certificateID2,
          proofData2,
          receiver,
          issuer
        );
        await revokeRole(unauthorizedOperator, roles.revokerRole);

        await expect(
          proofManagerContract
            .connect(unauthorizedOperator)
            .revokeBatchProofs([certificateID1, certificateID2])
        ).to.be.revertedWith(
          `NotEnrolledRevoker("${unauthorizedOperator.address}")`
        );
      });

      it("should allow an authorized entity to revoke batch of non retired proof", async () => {
        const {
          issuer,
          worker,
          revoker,
          receiver,
          proofData,
          votingContract,
          issuerContract,
          proofManagerContract,
        } = await loadFixture(initFixture);

        const certificateID1 = 1;
        const certificateID2 = 2;
        const proofData2 = generateProofData({ volume: 2 });

        await reachConsensus(
          proofData.inputHash,
          proofData.matchResult,
          votingContract,
          worker
        );

        await reachConsensus(
          proofData2.inputHash,
          proofData2.matchResult,
          votingContract,
          worker
        );

        await mintProof(
          issuerContract,
          certificateID1,
          proofData,
          receiver,
          issuer
        );

        await mintProof(
          issuerContract,
          certificateID2,
          proofData2,
          receiver,
          issuer
        );

        const revokeTx = await proofManagerContract
          .connect(revoker)
          .revokeBatchProofs([certificateID1, certificateID2]);

        await expect(revokeTx)
          .to.emit(proofManagerContract, "ProofRevoked")
          .withArgs(certificateID1);

        await expect(revokeTx)
          .to.emit(proofManagerContract, "ProofRevoked")
          .withArgs(certificateID2);
      });

      it("should revert if the delegated revoke queue size exceeds the limit ", async () => {
        const {
          worker,
          issuer,
          revoker,
          receiver,
          votingContract,
          issuerContract,
          proofManagerContract,
        } = await loadFixture(initFixture);

        const maxbatchSize = 20;
        const oversizedBatch = [];

        for (let i = 0; i < maxbatchSize + 1; i++) {
          const proofData = generateProofData({ volume: i + 1 });

          await reachConsensus(
            proofData.inputHash,
            proofData.matchResult,
            votingContract,
            worker
          );

          await mintProof(issuerContract, i + 1, proofData, receiver, issuer);

          oversizedBatch.push(i + 1);
        }

        await expect(
          proofManagerContract
            .connect(revoker)
            .revokeBatchProofs(oversizedBatch)
        ).to.be.revertedWith(
          `BatchQueueSizeExceeded(${oversizedBatch.length}, ${maxbatchSize})`
        );
      });
    });

    describe("\t- Proofs Inspection", () => {
      it("allows to get the batch of proof IDs by data hashes", async () => {
        const {
          issuer,
          worker,
          receiver,
          proofData,
          votingContract,
          issuerContract,
          proofManagerContract,
        } = await loadFixture(initFixture);

        const certificateID1 = 1;
        const certificateID2 = 2;
        const proofData2 = generateProofData({ volume: 2 });

        await reachConsensus(
          proofData.inputHash,
          proofData.matchResult,
          votingContract,
          worker
        );

        await mintProof(
          issuerContract,
          certificateID1,
          proofData,
          receiver,
          issuer
        );

        await reachConsensus(
          proofData2.inputHash,
          proofData2.matchResult,
          votingContract,
          worker
        );

        await mintProof(
          issuerContract,
          certificateID2,
          proofData2,
          receiver,
          issuer
        );

        const dataHashes = [
          proofData.volumeRootHash,
          proofData2.volumeRootHash,
        ];

        const certificateIDsByHashes = await proofManagerContract
          .connect(issuer)
          .getProofIDsByDataHashes(dataHashes);

        console.log("certificateIDsByHashes", certificateIDsByHashes);

        expect(
          BigNumber.from(certificateIDsByHashes[0]["certificateID"]).toNumber()
        ).to.equal(certificateID1);
        expect(certificateIDsByHashes[0]["dataHash"]).to.equal(
          proofData.volumeRootHash
        );
        expect(
          BigNumber.from(certificateIDsByHashes[1]["certificateID"]).toNumber()
        ).to.equal(certificateID2);
        expect(certificateIDsByHashes[1]["dataHash"]).to.equal(
          proofData2.volumeRootHash
        );
      });
    });
  });

  const claimVolumeFor = async (
    proofManagerContract,
    minter,
    claimedVolume
  ) => {
    const tx = await proofManagerContract
      .connect(claimer)
      .claimProofFor(1, minter.address, claimedVolume);
    await tx.wait();

    const { timestamp } = await ethers.provider.getBlock(tx.blockNumber);
    await expect(tx)
      .to.emit(proofManagerContract, "ProofClaimed")
      .withArgs(1, minter.address, timestamp, claimedVolume);
    return tx;
  };

  const claimVolume = async (proofManagerContract, minter, claimedVolume) => {
    const tx = await proofManagerContract
      .connect(minter)
      .claimProof(1, claimedVolume);
    await tx.wait();

    const { timestamp } = await ethers.provider.getBlock(tx.blockNumber);
    await expect(tx)
      .to.emit(proofManagerContract, "ProofClaimed")
      .withArgs(1, minter.address, timestamp, claimedVolume);
    return tx;
  };

  const reachConsensus = async (
    inputHash,
    matchResult,
    votingContract,
    signer
  ) => {
    await votingContract.connect(signer).vote(inputHash, matchResult);
  };

  const requestMinting = (
    issuerContract,
    { inputHash, volumeRootHash, matchResultProof, volume, volumeProof },
    receiver,
    minter
  ) =>
    issuerContract.connect(minter).requestProofIssuance({
      voteID: inputHash,
      generator: receiver.address,
      dataHash: volumeRootHash,
      dataProof: matchResultProof,
      volume,
      amountProof: volumeProof,
      tokenUri: tokenURI,
    });

  const mintProof = async (issuerContract, id, proofData, receiver, minter) => {
    const mintingTx = requestMinting(
      issuerContract,
      proofData,
      receiver,
      minter
    );
    await expect(mintingTx)
      .to.emit(issuerContract, "ProofMinted")
      .withArgs(
        id,
        parseEther(proofData.volume.toString()).toString(),
        receiver.address
      );
    return mintingTx;
  };

  const transfer = async (
    issuerContract,
    minter,
    receiver,
    transferVolume,
    certificateID = 1
  ) => {
    await expect(
      issuerContract
        .connect(minter)
        .safeTransferFrom(
          minter.address,
          receiver.address,
          certificateID,
          transferVolume,
          transferBytesData
        )
    )
      .to.emit(issuerContract, "TransferSingle")
      .withArgs(
        minter.address,
        minter.address,
        receiver.address,
        certificateID,
        transferVolume
      );
  };

  const transferFor = async (
    issuerContract,
    operator,
    owner,
    receiver,
    certificateID,
    transferVolume
  ) => {
    const tx = await issuerContract
      .connect(operator)
      .safeTransferFrom(
        owner.address,
        receiver.address,
        certificateID,
        transferVolume,
        transferBytesData
      );
    return tx;
  };

  const resetRoles = async () => {
    const wallets = await ethers.getSigners();
    await Promise.all(
      wallets.map(async (wallet) =>
        Promise.all(
          Object.values(roles).map(async (role) => revokeRole(wallet, role))
        )
      )
    );
  };

  const prepareBatchIssuance = async (batchSize, votingContract, worker) => {
    const batchQueue = [];
    const dataProofs = [];

    for (let i = 0; i < batchSize; i++) {
      dataProofs.push(generateProofData({ volume: i + 1 }));
      await votingContract
        .connect(worker)
        .vote(dataProofs[i].inputHash, dataProofs[i].matchResult);
      batchQueue.push({
        volume: dataProofs[i].volume,
        voteID: dataProofs[i].inputHash,
        dataHash: dataProofs[i].volumeRootHash,
        dataProof: dataProofs[i].matchResultProof,
        amountProof: dataProofs[i].volumeProof,
        generator: receiver.address,
        tokenUri: "",
      });
    }
    return { batchQueue, dataProofs };
  };

  const prepareSimpleBatchTransfer = async (BatchSize, sender, dataProofs) => {
    const batchTransfers = [];
    for (let i = 0; i < BatchSize; i++) {
      batchTransfers.push({
        sender: sender.address,
        recipient: wallets[i % 5].address,
        certificateID: i + 1,
        amount: parseEther(dataProofs[i].volume.toString()),
        data: "0x",
      });
    }
    return { batchTransfers };
  };

  const prepareMultipleBatchTransfer = async (
    BatchSize,
    sender,
    dataProofs
  ) => {
    const batchTransfers = [];
    for (let i = 0; i < BatchSize; i++) {
      const halfOfAmount = parseEther(dataProofs[i].volume.toString()).div(2);
      batchTransfers.push({
        sender: sender.address,
        recipient: wallets[i % 5].address,
        certificateIDs: [i + 1, i + 1], // same certificateID is sent twice to the same recipient
        amounts: [halfOfAmount, halfOfAmount], // half of the amount is sent twice to the same recipient
        data: "0x",
      });
    }
    return { batchTransfers };
  };
});