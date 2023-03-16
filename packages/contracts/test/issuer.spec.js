const chai = require("chai");
const { utils } = require("ethers");
const { expect } = require("chai");
const { deployGreenproof } = require("../scripts/deploy/deployContracts");
const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { roles } = require("./utils/roles.utils");
const { initMockClaimManager } = require("./utils/claimManager.utils");
const { initMockClaimRevoker } = require("./utils/claimRevocation.utils");
const { generateProofData } = require("./utils/issuer.utils");
const { BigNumber } = require("ethers");
const { timeTravel } = require("./utils/time.utils");
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
  let wallets;

  let greenproofAddress;
  let votingContract;
  let proofManagerContract;
  let issuerContract;

  let grantRole;
  let revokeRole;

  beforeEach(async () => {
    [owner, issuer, worker, revoker, claimer, ...wallets] =
      await ethers.getSigners();

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
    }));

    issuerContract = await ethers.getContractAt(
      "IssuerFacet",
      greenproofAddress
    );
    votingContract = await ethers.getContractAt(
      "VotingFacet",
      greenproofAddress
    );
    proofManagerContract = await ethers.getContractAt(
      "ProofManagerFacet",
      greenproofAddress
    );

    await resetRoles();
    await grantRole(worker, roles.workerRole);
    await votingContract.addWorker(worker.address);
    await grantRole(issuer, roles.issuerRole);
    await grantRole(revoker, roles.revokerRole);
    await grantRole(claimer, roles.claimerRole);
  });

  describe("Proof issuance tests", () => {
    it("checks that every one has 0 balance initially", async () => {
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
      const {
        inputHash,
        volumeRootHash,
        matchResultProof,
        volume,
        volumeProof,
      } = generateProofData();

      await expect(
        issuerContract
          .connect(issuer)
          .requestProofIssuance(
            inputHash,
            ethers.constants.AddressZero,
            volumeRootHash,
            matchResultProof,
            volume.toString(10),
            volumeProof,
            tokenURI
          )
      ).to.be.revertedWith("ForbiddenZeroAddressReceiver()");
    });

    it("should reject proof issuance requests for data not in consensus", async () => {
      const {
        inputHash,
        matchResultProof,
        volume,
        volumeProof,
        matchResult
      } = generateProofData();

      await reachConsensus(inputHash, matchResult);
      const wrongVolumeRootHash = ethers.utils.formatBytes32String("wrongVolumeRootHash");
      await expect(
        issuerContract
          .connect(issuer)
          .requestProofIssuance(
            inputHash,
            wallets[1].address,
            wrongVolumeRootHash,
            matchResultProof,
            volume.toString(10),
            volumeProof,
            tokenURI
          )
      ).to.be.revertedWith(`NotInConsensus("${inputHash}")`);
    });

    it("should reject proof issuance requests for volume not in consensus", async () => {
      const {
        inputHash,
        volumeRootHash,
        matchResultProof,
        volumeProof,
        matchResult,
      } = generateProofData({ volume: 42 });

      await reachConsensus(inputHash, matchResult);

      const wrongVolume = 21;

      await expect(
        issuerContract
          .connect(issuer)
          .requestProofIssuance(
            inputHash,
            wallets[1].address,
            volumeRootHash,
            matchResultProof,
            wrongVolume,
            volumeProof,
            tokenURI
          )
      ).to.be.revertedWith(`VolumeNotInConsensus(${wrongVolume}, "${volumeRootHash}"`);
    });

    it("should reject proof issuance requests by non issuers", async () => {
      const {
        inputHash,
        volumeRootHash,
        matchResultProof,
        volumeProof,
        matchResult,
      } = generateProofData();

      await reachConsensus(inputHash, matchResult);

      await expect(
        issuerContract.requestProofIssuance(
          inputHash,
          wallets[1].address,
          volumeRootHash,
          matchResultProof,
          10,
          volumeProof,
          tokenURI
        )
      ).to.be.revertedWith(`NotEnrolledIssuer("${owner.address}")`);
    });

    it("Authorized issuers can send proof issuance requests", async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(1, proofData);
    });

    it("reverts when issuers send duplicate proof issuance requests", async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(1, proofData);
      await expectAlreadyCertified(proofData);
    });

    it("checks that the certified generation volume is correct after minting", async () => {
      const receiver = wallets[1];
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, receiver);

      const amountMinted = parseInt(
        formatEther(await issuerContract.balanceOf(receiver.address, 1))
      );

      expect(amountMinted).to.equal(proofData.volume);
    });

    it("should get the list of all certificate owners", async () => {
      const minter = wallets[0];
      const receiver = wallets[1];
      const transferVolume = parseEther("2");
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, minter);

      await transfer(minter, receiver, transferVolume);

      const certificateOwners = await issuerContract.getCertificateOwners(1);
      expect(certificateOwners).to.be.deep.equal([
        minter.address,
        receiver.address,
      ]);
    });

    it("should get details of a minted certificate", async () => {
      const mintedVolume = 5;
      const certificaID = 1;
      const proofData = generateProofData({ volume: mintedVolume });

      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const minter = wallets[0];
      const mintTx = await mintProof(certificaID, proofData, minter);
      const proof = await proofManagerContract.connect(owner).getProof(1);

      const { timestamp } = await ethers.provider.getBlock(mintTx.blockNumber);

      expect(proof.issuanceDate).to.equal(timestamp);
      expect(proof.certificateID).to.equal(certificaID);
      expect(proof.generator).to.equal(minter.address);
      expect(parseInt(formatEther(proof.volume))).to.equal(mintedVolume);
      expect(proof.merkleRootHash).to.be.deep.equal(proofData.volumeRootHash);
    });

    it("should revert when asking details for an invalid certificateID", async () => {
      const invalidCertificateID = 42;
      await expect(
        proofManagerContract.connect(owner).getProof(invalidCertificateID)
      ).to.be.revertedWith("NonExistingCertificate");
      
      await expect(
        proofManagerContract.connect(owner).getProof(0)
      ).to.be.revertedWith("NonExistingCertificate");
    });

    it("should get all certificates of one owner", async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, wallets[0]);

      const secondProofData = generateProofData();
      await reachConsensus(
        secondProofData.inputHash,
        secondProofData.matchResult
      );
      await mintProof(2, secondProofData, wallets[0]);

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
      await expect(
        proofManagerContract.getProofsOf(wallets[0].address)
      ).to.be.revertedWith(`NoProofsOwned`);
    });

    it("Should reject issuance requests for wrongs voteIDs", async () => {
      const { inputHash: someOtherHash } = generateProofData();
      const receiver = wallets[0];
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      const wrongData = { ...proofData, inputHash: someOtherHash };

      await expect(requestMinting(wrongData, receiver)).to.be.revertedWith(
        someOtherHash
      );
    });
  });

  describe("Proof transfers tests", () => {
    it("should revert when one tries to transfer token ID = 0", async () => {
      const transferBytesData = ethers.utils.formatBytes32String("");

      await expect(
        issuerContract
          .connect(wallets[0])
          .safeTransferFrom(
            wallets[0].address,
            owner.address,
            0,
            parseEther("2"),
            transferBytesData
          )
      ).to.be.revertedWith("insufficient balance");
    });

    it("should revert when one tries to transfer Batch certificates containing token ID = 0", async () => {
      const minter = wallets[0];
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, minter);

      const transferBytesData = ethers.utils.formatBytes32String("");

      await expect(
        issuerContract
          .connect(wallets[0])
          .safeBatchTransferFrom(
            wallets[0].address,
            owner.address,
            [1, 0],
            [parseEther("2"), parseEther("2")],
            transferBytesData
          )
      ).to.be.revertedWith("ERC1155: insufficient balances for transfer");
    });
    it("should revert Batch certificates transfer when caller is not approved", async () => {
      const minter = wallets[0];
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, minter);

      const transferBytesData = ethers.utils.formatBytes32String("");

      await expect(
        issuerContract
          .connect(wallets[1])
          .safeBatchTransferFrom(
            wallets[0].address,
            owner.address,
            [1, 1],
            [parseEther("2"), parseEther("2")],
            transferBytesData
          )
      ).to.be.revertedWith("ERC1155: caller is not owner nor approved");
    });

    it("should allow Batch certificates transfer when caller is approved", async () => {
      const minter = wallets[0];
      const receiver = wallets[1];
      const transferVolume = parseEther("2");
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, receiver);

      const transferBytesData = ethers.utils.formatBytes32String("");
      await issuerContract
        .connect(receiver)
        .setApprovalForAll(minter.address, true);
      await expect(
        issuerContract
          .connect(minter)
          .safeBatchTransferFrom(
            receiver.address,
            owner.address,
            [1, 1],
            [transferVolume, transferVolume.sub(1)],
            transferBytesData
          )
      ).to.not.be.reverted;
    });

    it("should revert when one tries to transfer Batch certificates containing token ID > lastTokenIndex", async () => {
      const minter = wallets[0];
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, minter);

      const transferBytesData = ethers.utils.formatBytes32String("");

      await expect(
        issuerContract
          .connect(wallets[0])
          .safeBatchTransferFrom(
            wallets[0].address,
            owner.address,
            [1, 42],
            [parseEther("2"), parseEther("2")],
            transferBytesData
          )
      ).to.be.revertedWith(
        "'ERC1155: insufficient balances for transfer"
      );
    });

    it("should revert Batch certificates transfers to a non generator wallet containing revoked certificate", async () => {
      const minter = wallets[0];
      const transferVolume = parseEther("2");
      const mintedVolume1 = 21;
      const mintedVolume2 = 42;
      const proofData1 = generateProofData({ id: 1, volume: mintedVolume1 });
      const proofData2 = generateProofData({ id: 2, volume: mintedVolume2 });
      await reachConsensus(proofData1.inputHash, proofData1.matchResult);
      await reachConsensus(proofData2.inputHash, proofData2.matchResult);
      await mintProof(1, proofData1, minter);
      await mintProof(2, proofData2, minter);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(2)
      ).to.emit(proofManagerContract, "ProofRevoked");

      const transferBytesData = ethers.utils.formatBytes32String("");
      const expectedRevertMessage = `NotAllowedTransfer(2, "${wallets[0].address}", "${owner.address}")`
      await expect(
        issuerContract
          .connect(wallets[0])
          .safeBatchTransferFrom(
            wallets[0].address,
            owner.address,
            [1, 2],
            [transferVolume, transferVolume],
            transferBytesData
          )
      ).to.be.revertedWith(expectedRevertMessage);
    });

    it("should allow Batch certificates transfers of revoked certificate to the generator wallet", async () => {
      const minter = wallets[0];
      const transferVolume = parseEther("2");
      const mintedVolume1 = 21;
      const mintedVolume2 = 42;
      const proofData1 = generateProofData({ id: 1, volume: mintedVolume1 });
      const proofData2 = generateProofData({ id: 2, volume: mintedVolume2 });
      await reachConsensus(proofData1.inputHash, proofData1.matchResult);
      await reachConsensus(proofData2.inputHash, proofData2.matchResult);
      await mintProof(1, proofData1, minter);
      await mintProof(2, proofData2, minter);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(2)
      ).to.emit(proofManagerContract, "ProofRevoked");

      const transferBytesData = ethers.utils.formatBytes32String("");

      await expect(
        issuerContract
          .connect(wallets[0])
          .safeBatchTransferFrom(
            wallets[0].address,
            minter.address,
            [1, 2],
            [transferVolume, transferVolume],
            transferBytesData
          )
      ).to.emit(issuerContract, "TransferBatch");
    });

    it("should revert when one tries to transfer token ID > lastTokenIndex", async () => {
      const invalidTokenIndex = 1;

      await expect(
        issuerContract
          .connect(wallets[0])
          .safeTransferFrom(
            wallets[0].address,
            owner.address,
            invalidTokenIndex,
            parseEther("2"),
            transferBytesData
          )
      ).to.be.revertedWith(
        "insufficient balance"
      );
    });

    it("should correctly transfer certificates", async () => {
      const minter = wallets[0];
      const receiver = wallets[1];
      const transferVolume = parseEther("2");
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, minter);

      await transfer(minter, receiver, transferVolume);

      const minterBalance = await issuerContract.balanceOf(minter.address, 1);
      const receiverBalance = await issuerContract.balanceOf(
        receiver.address,
        1
      );
      expect(minterBalance).to.equal(
        parseEther(mintedVolume.toString()).sub(transferVolume)
      );
      expect(receiverBalance).to.equal(transferVolume);
    });
  });

  describe("Proof revocation tests", () => {
    it("should prevent a non authorized entity from revoking non retired proof", async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const unauthorizedOperator = wallets[0];
      await mintProof(1, proofData, unauthorizedOperator);
      await revokeRole(unauthorizedOperator, roles.revokerRole);

      await expect(
        proofManagerContract.connect(unauthorizedOperator).revokeProof(1)
      ).to.be.revertedWith(`NotEnrolledRevoker("${unauthorizedOperator.address}")`);
    });

    it("should prevent revocation of non existing certificates", async () => {
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
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, revoker);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(1)
      ).to.emit(proofManagerContract, "ProofRevoked");
    });

    it("should revert when transfering revoked proof", async () => {
      const proofData = generateProofData();
      const certificateID = 1;
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(certificateID, proofData, owner);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.emit(proofManagerContract, "ProofRevoked");
      
      const expectedRevertMessage = `NotAllowedTransfer(${certificateID}, "${owner.address}", "${revoker.address}")`

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
      const proofData = generateProofData({ volume: 42 });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const certificateID = 1;
      const volumeToTransfer = parseEther("21");

      await mintProof(certificateID, proofData, issuer);

      //transfert the certificate to the owner
      await issuerContract
        .connect(issuer)
        .safeTransferFrom(
          issuer.address,
          owner.address,
          certificateID,
          volumeToTransfer,
          transferBytesData
        );

      //Certificate revocation
      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.emit(proofManagerContract, "ProofRevoked");

      const expectedRevertMessage = `NotAllowedTransfer(${certificateID}, "${owner.address}", "${revoker.address}")`
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
          issuer.address,
          certificateID,
          volumeToTransfer,
          transferBytesData
        )
      ).to.be.not.reverted;
    });

    it("should prevent duplicate revocation", async () => {
      const proofData = generateProofData();
      const certificateID = 1;
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(certificateID, proofData, revoker);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.emit(proofManagerContract, "ProofRevoked");

      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.be.revertedWith(`ProofRevoked(${certificateID})`);
    });

    it("should revert if claimer tries to retire a revoked proof", async () => {
      const proofData = generateProofData();
      const certificateID = 1;

      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(certificateID, proofData, owner);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(1)
      ).to.emit(proofManagerContract, "ProofRevoked");

      await expect(
        proofManagerContract.connect(claimer).claimProofFor(1, owner.address, 1)
      ).to.be.revertedWith(`ProofRevoked(${certificateID})`);
    });

    it("should revert if non claimer tries to claim proof", async () => {
      const proofData = generateProofData();
      const notClaimer = worker;
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, owner);

      await expect(
        proofManagerContract
          .connect(notClaimer)
          .claimProofFor(1, owner.address, 1)
      ).to.be.revertedWith(`NotEnrolledClaimer("${notClaimer.address}")`);
    });

    it("should revert if owner tries to retire a revoked proof", async () => {
      const proofData = generateProofData();
      const certificateID = 1;
      const claimedVolume = 1;

      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(certificateID, proofData, issuer, issuer);
      await grantRole(issuer, roles.claimerRole);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(certificateID)
      ).to.emit(proofManagerContract, "ProofRevoked");

      await expect(
        proofManagerContract.connect(issuer).claimProof(certificateID, claimedVolume)
      ).to.be.revertedWith(`ProofRevoked(${certificateID})`);
    });

    it("should allow claiming proofs for others", async () => {
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const minter = wallets[0];
      await mintProof(1, proofData, minter);
      const claimedVolume = parseEther((proofData.volume - 2).toString());

      const initialClaimedAmount = await proofManagerContract.claimedBalanceOf(
        minter.address,
        1
      );
      expect(initialClaimedAmount).to.equal(0);

      await claimVolumeFor(minter, claimedVolume);

      const claimedProofsAmount = await proofManagerContract.claimedBalanceOf(
        minter.address,
        1
      );
      expect(claimedProofsAmount).to.equal(claimedVolume);

      const remainingVolume = await proofManagerContract.getProofsOf(
        minter.address
      );
      expect(remainingVolume[0].volume).to.equal(
        parseEther(mintedVolume.toString()).sub(claimedVolume)
      );
    });

    it("should allow claiming proofs", async () => {
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const minter = wallets[0];
      await mintProof(1, proofData, minter);
      const claimedVolume = parseEther((proofData.volume - 2).toString());

      const initialClaimedAmount = await proofManagerContract.claimedBalanceOf(
        minter.address,
        1
      );
      expect(initialClaimedAmount).to.equal(0);

      await claimVolume(minter, claimedVolume);

      const claimedProofsAmount = await proofManagerContract.claimedBalanceOf(
        minter.address,
        1
      );
      expect(claimedProofsAmount).to.equal(claimedVolume);

      const remainingVolume = await proofManagerContract.getProofsOf(
        minter.address
      );
      expect(remainingVolume[0].volume).to.equal(
        parseEther(`${mintedVolume}`).sub(claimedVolume)
      );
    });

    it("should revert when retirement for others amount exceeds owned volume", async () => {
      const mintedVolume = 5;
      const certificateID = 1;
      const minter = wallets[0];
      const proofData = generateProofData({ volume: mintedVolume });

      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(certificateID, proofData, minter);
      const claimedVolume = parseEther("6");

      await expect(
        proofManagerContract
          .connect(claimer)
          .claimProofFor(certificateID, minter.address, claimedVolume)
      ).to.be.revertedWith(`InsufficientBalance("${minter.address}", ${certificateID}, ${claimedVolume})`);
    });

    it("should revert when retirement amount exceeds owned volume", async () => {
      const mintedVolume = 5;
      const certificateID = 1;
      const minter = wallets[0];
      const claimedVolume = parseEther("6");
      const proofData = generateProofData({ volume: mintedVolume });
      
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(certificateID, proofData, minter);

      await expect(
        proofManagerContract.connect(minter).claimProof(certificateID, claimedVolume)
      ).to.be.revertedWith(`InsufficientBalance("${minter.address}", ${certificateID}, ${claimedVolume})`);
    });

    it("should allow authorized revoker to revoke a retired proof during the revocable Period", async () => {
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const minter = wallets[0];
      await mintProof(1, proofData, minter);
      const claimedVolume = parseEther("5");
      await claimVolumeFor(minter, claimedVolume);

      const tx = proofManagerContract.connect(revoker).revokeProof(1);

      await expect(tx).to.emit(proofManagerContract, "ProofRevoked");
    });

    it("should prevent authorized revoker from revoking a retired proof after the revocable Period", async () => {
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const minter = wallets[0];
      await mintProof(1, proofData, minter);
      const claimedVolume = parseEther("5");
      const proof = await proofManagerContract.connect(owner).getProof(1);
      const issuanceDate = Number(proof.issuanceDate.toString());
      await claimVolumeFor(minter, claimedVolume);

      //forward time to reach end of revocable period
      await timeTravel(revokablePeriod);

      const tx = proofManagerContract.connect(revoker).revokeProof(1);

      //The certificate should not be revocable anymore
      await expect(tx).to.be.revertedWith(
        `TimeToRevokeElapsed(${1}, ${issuanceDate}, ${revokablePeriod})`
      );
    });

    it("allows to reissue revoked certificate", async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(1, proofData, revoker);
      await expectAlreadyCertified(proofData);

      const certificateId = await proofManagerContract
        .connect(revoker)
        .getProofIdByDataHash(proofData.volumeRootHash);
      await proofManagerContract.connect(revoker).revokeProof(certificateId);

      await mintProof(2, proofData, revoker);
    });

    it("allows to get proof ID by data hash", async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(1, proofData, revoker);

      const certificateId = await proofManagerContract
        .connect(issuer)
        .getProofIdByDataHash(proofData.volumeRootHash);

      expect(BigNumber.from(certificateId).toNumber()).to.be.gt(0);
    });
  });

  describe("Proof verification tests", () => {
    it("should verify all kinds of proofs", async () => {
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

  describe("Data disclosure tests", () => {
    it("should revert when non authorized user tries to disclose data", async () => {
      const unauthorizedOperator = wallets[0];
      await revokeRole(unauthorizedOperator, roles.issuerRole);
      const proofData = generateProofData();
      const key = "consumerID";

      const disclosedDataTree = proofData.volumeTree;
      const dataLeaf = hash(key + proofData.volume);
      const dataProof = disclosedDataTree.getHexProof(dataLeaf);
      const dataRootHash = disclosedDataTree.getHexRoot();

      await expect(
        issuerContract
          .connect(unauthorizedOperator)
          .discloseData(key, proofData.volume, dataProof, dataRootHash)
      ).to.be.revertedWith(`NotEnrolledIssuer("${unauthorizedOperator.address}")`);
    });

    it("should allow authorized user to disclose data", async () => {
      const proofData = generateProofData();
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
      const proofData = generateProofData();
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
      const proofData = generateProofData();
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
      ).to.be.revertedWith(`AlreadyDisclosedData("${dataRootHash}", "${key}")`)
    });
  });

  const claimVolumeFor = async (minter, claimedVolume) => {
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

  const claimVolume = async (minter, claimedVolume) => {
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

  const reachConsensus = async (inputHash, matchResult) => {
    await votingContract.connect(worker).vote(inputHash, matchResult);
  };

  const requestMinting = (
    { inputHash, volumeRootHash, matchResultProof, volume, volumeProof },
    receiver,
    minter = issuer
  ) =>
    issuerContract
      .connect(minter)
      .requestProofIssuance(
        inputHash,
        receiver.address,
        volumeRootHash,
        matchResultProof,
        volume,
        volumeProof,
        tokenURI
      );

  const mintProof = async (
    id,
    proofData,
    receiver = wallets[1],
    minter = issuer
  ) => {
    const mintingTx = requestMinting(proofData, receiver, minter);
    await expect(mintingTx)
      .to.emit(issuerContract, "ProofMinted")
      .withArgs(
        id,
        parseEther(proofData.volume.toString()).toString(),
        receiver.address
      );
    return mintingTx;
  };

  const approveForTransfer = async (minter, wallet) => {
    await issuerContract
      .connect(minter)
      .setApprovalForAll(wallet.address, true);
  };

  const expectAlreadyCertified = async (proofData) => {
    await expect(requestMinting(proofData, wallets[0])).to.be.revertedWith(
      `AlreadyCertifiedData("${proofData.volumeRootHash}")`
    );
  };

  const transfer = async (minter, receiver, transferVolume) => {
    await approveForTransfer(minter, owner);

    await expect(
      issuerContract
        .connect(minter)
        .safeTransferFrom(
          minter.address,
          receiver.address,
          1,
          transferVolume,
          transferBytesData
        )
    )
      .to.emit(issuerContract, "TransferSingle")
      .withArgs(
        minter.address,
        minter.address,
        receiver.address,
        1,
        transferVolume
      );
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
});
