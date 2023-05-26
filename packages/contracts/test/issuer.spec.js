const chai = require("chai");
const { utils } = require("ethers");
const { expect } = require("chai");
const { deployGreenproof } = require("../scripts/deploy/deployContracts");
const { solidity } = require("ethereum-waffle");
const { roles } = require("./utils/roles.utils");
const { initMockClaimManager } = require("./utils/claimManager.utils");
const { initMockClaimRevoker } = require("./utils/claimRevocation.utils");
const { generateProofData } = require("./utils/issuer.utils");
const { BigNumber } = require("ethers");
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

  let greenproofAddress;
  let votingContract;
  let proofManagerContract;
  let issuerContract;
  let metatokenContract;

  let grantRole;
  let revokeRole;

  const initFixture = async() => {
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
    metatokenContract = await ethers.getContractAt(
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
      claimsRevocationRegistryMocked
    }
  }

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
      const { issuerContract, issuer} = await loadFixture(initFixture);
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
      const { issuerContract, issuer} = await loadFixture(initFixture);
      
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
      
      const { issuerContract, issuer} = await loadFixture(initFixture);


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

    it("should revert proof issuance when contract is paused", async () => {

      const { greenproofContract, issuer} = await loadFixture(initFixture);

      
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      tx = await greenproofContract.pause();

      await expect(
        requestMinting(proofData, wallets[1], issuer)
      ).to.be.revertedWith("PausedContract()");
    })

    it("should reject proof issuance requests by non issuers", async () => {
      const { issuerContract} = await loadFixture(initFixture);
      
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
      await loadFixture(initFixture);
      
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(1, proofData);
    });

    it("Authorized issuers can send simple proof issuance requests", async () => {
      await loadFixture(initFixture);
      
      const proofData = generateProofData();
      const certificateID = 1;
      const receiver = wallets[ 1 ];

      await reachConsensus(proofData.simpleInputHash, proofData.simpleMatchResult);

      await expect(
        issuerContract
          .connect(issuer)
          .requestProofIssuance(
            proofData.simpleMatchResult,
            receiver.address,
            proofData.simpleMatchResult,
            proofData.matchResultProof,
            proofData.volume,
            proofData.volumeProof,
            tokenURI
          )
      ).to.emit(issuerContract, "ProofMinted")
      .withArgs(
        certificateID,
        parseEther(proofData.volume.toString()).toString(),
        receiver.address
      );
    });

    it("should allow proof issuance after contract is unpaused", async () => {
      
      const { greenproofContract, issuer} = await loadFixture(initFixture);


      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      //Pausing contract
      tx = await greenproofContract.pause();
      let timestamp = await getTimeStamp(tx);
      
      await expect(tx)
        .to.emit(greenproofContract, "ContractPaused")
        .withArgs(timestamp, owner.address);

      await expect(
        requestMinting(proofData, wallets[1], issuer)
      ).to.be.revertedWith("PausedContract()");

      //Unpausing contract
      tx = await greenproofContract.unPause();
      timestamp = await getTimeStamp(tx);
      
      await expect(tx)
        .to.emit(greenproofContract, "ContractUnPaused")
        .withArgs(timestamp, owner.address);
      
      const certificateID = 1;
      await mintProof(certificateID, proofData, wallets[ 1 ]);
    })

    it("reverts when issuers send duplicate proof issuance requests", async () => {
      const { proofData } = await loadFixture(initFixture);
      
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(1, proofData);
      await expectAlreadyCertified(proofData);
    });

    it("checks that the certified generation volume is correct after minting", async () => {
      const { proofData, issuerContract } = await loadFixture(initFixture);
      
      const receiver = wallets[ 1 ];

      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, receiver);

      const amountMinted = parseInt(
        formatEther(await issuerContract.balanceOf(receiver.address, 1))
      );

      expect(amountMinted).to.equal(proofData.volume);
    });

    it("should get the list of all certificate owners", async () => {
      const { issuerContract } = await loadFixture(initFixture);
      
      const minter = wallets[ 0 ];
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

      const { proofManagerContract } = await loadFixture(initFixture);    
      const certificaID = 1;
      const proofData = generateProofData({volume: mintedVolume})

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
      const { proofManagerContract, owner } = await loadFixture(initFixture);    

      const invalidCertificateID = 42;
      await expect(
        proofManagerContract.connect(owner).getProof(invalidCertificateID)
      ).to.be.revertedWith("NonExistingCertificate");
      
      await expect(
        proofManagerContract.connect(owner).getProof(0)
      ).to.be.revertedWith("NonExistingCertificate");
    });

    it("should get all certificates of one owner", async () => {
      const { proofManagerContract, proofData, votingContract, worker } = await loadFixture(initFixture);    

      await votingContract.connect(worker).vote(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, wallets[0]);

      const secondProofData = generateProofData();
      await votingContract.connect(worker).vote(secondProofData.inputHash, secondProofData.matchResult);
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
      const { proofManagerContract } = await loadFixture(initFixture);    

      await expect(
        proofManagerContract.getProofsOf(wallets[0].address)
      ).to.be.revertedWith(`NoProofsOwned`);
    });

    it("Should reject issuance requests for wrongs voteIDs", async () => {
      const { proofData } = await loadFixture(initFixture);    

      const { inputHash: someOtherHash } = generateProofData();
      const receiver = wallets[ 0 ];

      await reachConsensus(proofData.inputHash, proofData.matchResult);

      const wrongData = { ...proofData, inputHash: someOtherHash };

      await expect(requestMinting(wrongData, receiver)).to.be.revertedWith(
        someOtherHash
      );
    });
  });

  describe("Proof transfers tests", () => {
    it("should revert when one tries to transfer token ID = 0", async () => {
      const { issuerContract } = await loadFixture(initFixture);

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
      const { issuerContract, owner } = await loadFixture(initFixture);
      
      const minter = wallets[ 0 ];
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
      const { issuerContract } = await loadFixture(initFixture);

      const minter = wallets[0];
      const mintedVolume = 5;
      const transferVolume = 2;
      const certificateID = 1;
      const receiver = wallets[ 1 ];
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(certificateID, proofData, minter);

      const transferBytesData = ethers.utils.formatBytes32String("");
      const expectedRevertMessage = `NotOwnerOrApproved("${receiver.address}", "${minter.address}")`

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
      const { issuerContract, minter, receiver } = await loadFixture(initFixture);

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
      const { issuerContract, minter } = await loadFixture(initFixture);
      
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
      const { issuerContract, proofManagerContract, votingContract, minter, worker } = await loadFixture(initFixture);
      
      const transferVolume = parseEther("2");
      const mintedVolume1 = 21;
      const mintedVolume2 = 42;
      const proofData1 = generateProofData({ id: 1, volume: mintedVolume1 });
      const proofData2 = generateProofData({ id: 2, volume: mintedVolume2 });
      await votingContract.connect(worker).vote(proofData1.inputHash, proofData1.matchResult);
      await votingContract.connect(worker).vote(proofData2.inputHash, proofData2.matchResult);
      await mintProof(1, proofData1, minter);
      await mintProof(2, proofData2, minter);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(2)
      ).to.emit(proofManagerContract, "ProofRevoked");

      const transferBytesData = ethers.utils.formatBytes32String("");
      const expectedRevertMessage = `NotAllowedTransfer(2, "${minter.address}", "${owner.address}")`
      await expect(
        issuerContract
          .connect(minter)
          .safeBatchTransferFrom(
            minter.address,
            owner.address,
            [1, 2],
            [transferVolume, transferVolume],
            transferBytesData
          )
      ).to.be.revertedWith(expectedRevertMessage);
    });

    it("should allow Batch certificates transfers of revoked certificate to the generator wallet", async () => {
      const {
        minter,
        worker,
        revoker,
        issuerContract,
        votingContract,
        proofManagerContract,
      } = await loadFixture(initFixture);
      
      const transferVolume = parseEther("2");
      const mintedVolume1 = 21;
      const mintedVolume2 = 42;
      const proofData1 = generateProofData({ id: 1, volume: mintedVolume1 });
      const proofData2 = generateProofData({ id: 2, volume: mintedVolume2 });
      await votingContract.connect(worker).vote(proofData1.inputHash, proofData1.matchResult);
      await votingContract.connect(worker).vote(proofData2.inputHash, proofData2.matchResult);
      await mintProof(1, proofData1, minter);
      await mintProof(2, proofData2, minter);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(2)
      ).to.emit(proofManagerContract, "ProofRevoked");

      const transferBytesData = ethers.utils.formatBytes32String("");

      await expect(
        issuerContract
          .connect(minter)
          .safeBatchTransferFrom(
            minter.address,
            minter.address,
            [1, 2],
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
      ).to.be.revertedWith(
        "insufficient balance"
      );
    });

    it("should correctly transfer certificates", async () => {
      const { issuerContract, minter, receiver } = await loadFixture(initFixture);
      
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

    it("should revert when non approvers tries to approve operators", async () => {
      
      const generator = wallets[0];
      const approvedSender = wallets[6];

      const expectedErrorMessage = `NotEnrolledApprover("${owner.address}")`;
      
      await expect(
        issuerContract.approveOperator(approvedSender.address, generator.address)
      ).to.be.revertedWith(expectedErrorMessage);

    });

    it("should revert when non approvers tries to remove operators' approval", async () => {
      await loadFixture(initFixture);
      const generator = wallets[0];
      const approvedSender = wallets[6];

      const expectedErrorMessage = `NotEnrolledApprover("${owner.address}")`;
      
      // 1 - checks that operator is correctly approved
      await expect(
        issuerContract.connect(approver).approveOperator(approvedSender.address, generator.address)
      ).to.emit(issuerContract, "OperatorApproved")
            .withArgs(approvedSender.address, generator.address, approver.address);
      
      // 2 - Non approver tries to remove operator
      await expect(
        issuerContract.removeApprovedOperator(approvedSender.address, generator.address)
      ).to.be.revertedWith(expectedErrorMessage);

    });
    
    it("should revert when approver tries to self approve as operators", async () => {
      
      const generator = wallets[0];
      const expectedErrorMessage = `ForbiddenSelfApproval("${approver.address}", "${generator.address}")`;
      
      await expect(
        issuerContract.connect(approver).approveOperator(approver.address, generator.address)
      ).to.be.revertedWith(expectedErrorMessage);

    });
    
    it("should not revert when approver self removes from operators", async () => {
      await loadFixture(initFixture);
      
      const generator = wallets[0];
      const secondApprover = wallets[6];
      await grantRole(secondApprover, roles.approverRole);

      // Since an approver cannot self approve, another approver has to do it first
      await expect(
        issuerContract.connect(approver).approveOperator(secondApprover.address, generator.address)
      ).to.emit(issuerContract, "OperatorApproved")
            .withArgs(secondApprover.address, generator.address, approver.address);
      
      // the approver should be allowed to self remove approval rights
      await expect(
        issuerContract.connect(secondApprover).removeApprovedOperator(secondApprover.address, generator.address)
      ).to.emit(issuerContract, "OperatorRemoved")
            .withArgs(secondApprover.address, generator.address, secondApprover.address);
    });
    
    it("should correctly approve operators for certificate owners", async () => {
      await loadFixture(initFixture);
      
      const generator = wallets[0];
      const approvedSender = wallets[6];
      
      await expect(
        issuerContract.connect(approver).approveOperator(approvedSender.address, generator.address)
      ).to.emit(issuerContract, "OperatorApproved")
      .withArgs(approvedSender.address, generator.address, approver.address);

    });

    it("should correctly remove operators approval's for transferring other certificates", async () => {
      await loadFixture(initFixture);
      
      const generator = wallets[0];
      const approvedSender = wallets[6];
      const maxIterations = 100;
      
      //checking that we can add/ remove transfer rights several times
      for (i = 0; i < maxIterations; i++) {
        // 1 - We first grant transfer rights to the operator for the generator
        await expect(
          issuerContract.connect(approver).approveOperator(approvedSender.address, generator.address)
        ).to.emit(issuerContract, "OperatorApproved")
        .withArgs(approvedSender.address, generator.address, approver.address);

        // 2 - We later remove the approval of the operator
        await expect(
          issuerContract.connect(approver).removeApprovedOperator(approvedSender.address, generator.address)
        ).to.emit(issuerContract, "OperatorRemoved").withArgs(approvedSender.address, generator.address, approver.address);
      }
    });

    it("should prevent already approved operators from being approved again", async () => {
      await loadFixture(initFixture);
      
      const generator = wallets[ 0 ];
      const approvedSender = wallets[6];
      const expectedErrorMessage = `AlreadyApprovedOperator("${approvedSender.address}", "${generator.address}")`;

      await expect(
        issuerContract.connect(approver).approveOperator(approvedSender.address, generator.address)
      ).to.emit(issuerContract, "OperatorApproved")
              .withArgs(approvedSender.address, generator.address, approver.address);

      await expect(
        issuerContract.connect(approver).approveOperator(approvedSender.address, generator.address)
      ).to.be.revertedWith(expectedErrorMessage);
    });

    it("should prevent already removed operators from being removed again", async () => {
      await loadFixture(initFixture);
      
      const generator = wallets[0];
      const approvedSender = wallets[6];
      const expectedRevertMessage = `AlreadyRemovedOperator("${approvedSender.address}", "${generator.address}")`
      
      // 1 - We first grant transfer rights to the operator for the generator
      await expect(
        issuerContract.connect(approver).approveOperator(approvedSender.address, generator.address)
      ).to.emit(issuerContract, "OperatorApproved")
      .withArgs(approvedSender.address, generator.address, approver.address);

      // 2 - We later remove the approval of the operator
      await expect(
        issuerContract.connect(approver).removeApprovedOperator(approvedSender.address, generator.address)
      ).to.emit(issuerContract, "OperatorRemoved").withArgs(approvedSender.address, generator.address, approver.address);

      // 2 - We should be able to call `removeApprovedOperator`function again
      await expect(
        issuerContract.connect(approver).removeApprovedOperator(approvedSender.address, generator.address)
      ).to.be.revertedWith(expectedRevertMessage);

    });
    
    it("should allow approved parties to transfer certificates on behalf of certificate owner", async () => {
      await loadFixture(initFixture);
      
      const mintedVolume = 5;
      const certificateID = 1;
      const receiver = wallets[1];
      const generator = wallets[0];
      const approvedSender = wallets[6];
      const transferVolume = parseEther("2");
      const proofData = generateProofData({ volume: mintedVolume });

      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(certificateID, proofData, generator);

      // 1 - The authorized appover approves the new sender
      await expect(
        issuerContract.connect(approver).approveOperator(approvedSender.address, generator.address)
      ).to.emit(issuerContract, "OperatorApproved")
              .withArgs(approvedSender.address, generator.address, approver.address);

      // 2 - The approved sender transfers the certificate to the receiver on behalf of the generator
      await expect(
        transferFor(approvedSender, generator, receiver, certificateID, transferVolume)
      ).to.emit(issuerContract, "TransferSingle")
              .withArgs(
                approvedSender.address,
                generator.address,
                receiver.address,
                certificateID,
                transferVolume
      );
      
      // 3 - We verify that the transfer has been correctly made
      const generatorBalance = await issuerContract.balanceOf(generator.address, certificateID);
      const receiverBalance = await issuerContract.balanceOf(receiver.address, certificateID);

      expect(generatorBalance).to.equal(
        parseEther(mintedVolume.toString()).sub(transferVolume)
      );
      expect(receiverBalance).to.equal(transferVolume);
    });
  });

  describe("Proof revocation tests", () => {
    it("should prevent a non authorized entity from revoking non retired proof", async () => {
      const { proofManagerContract, proofData, minter } = await loadFixture(initFixture);
      
      
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const unauthorizedOperator = minter;
      await mintProof(1, proofData, unauthorizedOperator);
      await revokeRole(unauthorizedOperator, roles.revokerRole);

      await expect(
        proofManagerContract.connect(unauthorizedOperator).revokeProof(1)
      ).to.be.revertedWith(`NotEnrolledRevoker("${unauthorizedOperator.address}")`);
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
      const { proofData, revoker } = await loadFixture(initFixture);

      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, revoker);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(1)
      ).to.emit(proofManagerContract, "ProofRevoked");
    });

    it("should revert when transfering revoked proof", async () => {
      const {
        owner,
        revoker,
        proofData,
        issuerContract,
        proofManagerContract
      } = await loadFixture(initFixture);

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
      const {
        owner,
        issuer,
        revoker,
        issuerContract,
        proofManagerContract
      } = await loadFixture(initFixture);
      
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
      const { proofData, revoker, proofManagerContract } = await loadFixture(initFixture);

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
      const { proofData, revoker, claimer, proofManagerContract } = await loadFixture(initFixture);
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
      const { proofData, worker, owner, proofManagerContract } = await loadFixture(initFixture);

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

      const { proofData, issuer, proofManagerContract, revoker } = await loadFixture(initFixture);

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
      const { proofManagerContract, minter } = await loadFixture(initFixture);

      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
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
      const { proofManagerContract, minter } = await loadFixture(initFixture);

      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
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
      const { proofManagerContract, minter, claimer } = await loadFixture(initFixture);

      const mintedVolume = 5;
      const certificateID = 1;
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
      const { proofManagerContract, minter } = await loadFixture(initFixture);

      const mintedVolume = 5;
      const certificateID = 1;
      const claimedVolume = parseEther("6");
      const proofData = generateProofData({ volume: mintedVolume });
      
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(certificateID, proofData, minter);

      await expect(
        proofManagerContract.connect(minter).claimProof(certificateID, claimedVolume)
      ).to.be.revertedWith(`InsufficientBalance("${minter.address}", ${certificateID}, ${claimedVolume})`);
    });

    it("should allow authorized revoker to revoke a retired proof during the revocable Period", async () => {
      const { proofManagerContract, minter, revoker } = await loadFixture(initFixture);
      
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, minter);
      const claimedVolume = parseEther("5");
      await claimVolumeFor(minter, claimedVolume);

      const tx = proofManagerContract.connect(revoker).revokeProof(1);

      await expect(tx).to.emit(proofManagerContract, "ProofRevoked");
    });

    it("should prevent authorized revoker from revoking a retired proof after the revocable Period", async () => {
      const { proofManagerContract, minter, owner, revoker } = await loadFixture(initFixture);
      
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
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

      const { proofManagerContract, proofData, revoker } = await loadFixture(initFixture);

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
      const { proofData, proofManagerContract, revoker } = await loadFixture(initFixture);

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
      const { minter, proofData, issuerContract } = await loadFixture(initFixture);

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
      ).to.be.revertedWith(`NotEnrolledIssuer("${unauthorizedOperator.address}")`);
    });

    it("should allow authorized user to disclose data", async () => {
      const { issuer, proofData, issuerContract } = await loadFixture(initFixture);

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
      const { issuer, proofData, issuerContract } = await loadFixture(initFixture);

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
      const { issuer, proofData, issuerContract } = await loadFixture(initFixture);

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
      const { wallets, metatokenContract } = await loadFixture(initFixture); 
      const tokenAddress = await metatokenContract.getMetaTokenAddress();
      const metaToken = await ethers.getContractAt("MetaToken", tokenAddress);
      const nonAdmin = wallets[1];

      // Trying to direclty call the issuance function on the token contract without being admin
      await expect(
        metaToken.connect(nonAdmin).issueMetaToken(1, 1, wallets[0].address, metaTokenURI)
      ).to.be.revertedWith(`NotAdmin("${nonAdmin.address}")`);
    });

    it("should revert when non Issuer tries to issue meta-certificate", async () => {
      const { wallets, receiver, proofData, metatokenContract } = await loadFixture(initFixture);
      const unauthorizedOperator = wallets[0];
      await revokeRole(unauthorizedOperator, roles.issuerRole);
      const safcParentID = 1;
      const tokenAmount = 42;

      // issue SAFC
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData);

      await expect(
        metatokenContract
          .connect(unauthorizedOperator)
          .issueMetaToken(
            safcParentID,
            tokenAmount,
            receiver.address,
            metaTokenURI
          )
      ).to.be.revertedWith(`NotEnrolledIssuer("${unauthorizedOperator.address}")`);
    });

    it("should revert when one tries to issue meta-certificate to zeroAddress", async () => {
      const { wallets, issuer, proofData, metatokenContract } = await loadFixture(initFixture);
      const safcParentID = 1;
      const tokenAmount = 42;
      const zeroAddress = ethers.constants.AddressZero;

      // issue SAFC
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData);

      // impersonate greenproof contract signer
      const asGreenPoofContractSigner = await ethers.getImpersonatedSigner(greenproofAddress);
      // Sending ethers to greenproof contract signer
      await wallets[ 0 ].sendTransaction({
        to: asGreenPoofContractSigner.address,
        value: ethers.utils.parseEther("10")
      });
      const tokenAddress = await metatokenContract.getMetaTokenAddress();
      const metaToken = await ethers.getContractAt("MetaToken", tokenAddress);
      
      // Trying to direclty call the issuance function as admin with address 0 as receiver
      await expect(
        metaToken.connect(asGreenPoofContractSigner).issueMetaToken(
          safcParentID,
          tokenAmount,
          zeroAddress,
          metaTokenURI
        )
      ).to.be.revertedWith(`invalidZeroAddress()`);

      await expect(
        metatokenContract
          .connect(issuer)
          .issueMetaToken(
            safcParentID,
            tokenAmount,
            zeroAddress,
            metaTokenURI
          )
      ).to.be.revertedWith(`ForbiddenZeroAddressReceiver()`);
    });

    it("Should revert when issuing meta-certitificate for not owned parent certificate", async () => {
      const {issuer, metatokenContract, receiver} = await loadFixture(initFixture);
      const safcParentID = 1;
      const tokenAmount = ethers.utils.parseEther("42");

      await expect(
        metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount,
          receiver.address,
          metaTokenURI
      )).to.be.revertedWith(`NotAllowedIssuance(${safcParentID}, "${receiver.address}", ${tokenAmount}, 0)`);
    });

    it("should revert when one tries to issue meta-certificate from revoked certificate", async () => {
      const {issuer, receiver, proofManagerContract, metatokenContract} = await loadFixture(initFixture);
      const safcParentID = 1;
      const tokenAmount = ethers.utils.parseEther("21");


      // issue SAFC
      const proofData = generateProofData({ volume: 42});
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData, receiver);

      const availableVolume = ethers.utils.parseEther("42")

      // revoke certificate
      await expect(
        proofManagerContract.connect(revoker).revokeProof(safcParentID)
      ).to.emit(proofManagerContract, "ProofRevoked");

      await expect(
        metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount,
          receiver.address,
          metaTokenURI
      )).to.be.revertedWith(`NotAllowedIssuance(${safcParentID}, "${receiver.address}", ${tokenAmount}, ${availableVolume})`);
    });

    it("Should revert when issuing more meta-certitificate than owned parent certificate volume", async () => {
      const { wallets, issuer, receiver, metatokenContract  } = await loadFixture(initFixture);
      const safcParentID = 1;
      const tokenAmount = ethers.utils.parseEther("42");

      // issue SAFC
      const proofData = generateProofData({ volume: 21 });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const availableVolume = ethers.utils.parseEther("21");

      await mintProof(safcParentID, proofData, receiver);

      await expect(
        metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount,
          receiver.address,
          metaTokenURI
      )).to.be.revertedWith(`NotAllowedIssuance(${safcParentID}, "${receiver.address}", ${tokenAmount}, ${availableVolume})`);
    });

    it("Should revert when issuing more meta-certitificate than allowed", async () => {
      const { wallets, issuer, receiver, metatokenContract  } = await loadFixture(initFixture);
      const safcParentID = 1;
      const tokenAmount = ethers.utils.parseEther("42");

      // issue SAFC
      const proofData = generateProofData({ volume: 42 });
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData, receiver);

       const tx = await metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount.div(2),
          receiver.address,
          metaTokenURI
      );

      const timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

      await expect(tx).to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(safcParentID, receiver.address, timestamp, tokenAmount.div(2));
      
      const remainingIssuableVolume = ethers.utils.parseEther("21");
      

      await expect(
        metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount,
          receiver.address,
          metaTokenURI
      )).to.be.revertedWith(`NotAllowedIssuance(${safcParentID}, "${receiver.address}", ${tokenAmount}, ${remainingIssuableVolume})`);
    });

    it("Authorized issuer should be able to issue meta-certificate", async () => {
      const { receiver, issuer, metatokenContract  } = await loadFixture(initFixture);
      const safcParentID = 1;
      const tokenAmount = 42;

      // issue SAFC
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData, receiver);

      const tx = await metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount,
          receiver.address,
          metaTokenURI
      );

      const timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

      await expect(tx).to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(safcParentID, receiver.address, timestamp, tokenAmount);
    });

    it("should correctly retrieve the totalSupply of meta-certificates", async () => {
      const { issuer, receiver, metatokenContract  } = await loadFixture(initFixture);
      const safcParentID = 1;
      const tokenAmount = 42;

      // issue SAFC
      const proofData = generateProofData({volume: tokenAmount});
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData, receiver);

      // totalSupply of meta certificate should be null before issuance
      let totalSupply = await metatokenContract.tokenSupply(safcParentID);
      expect(totalSupply).to.equals(0);

      const metaToken = await ethers.getContractAt("MetaToken", await metatokenContract.getMetaTokenAddress());

      expect(
        await metaToken.tokenSupply(safcParentID)
      ).to.equals(0);

      const tx = await metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount,
          receiver.address,
          metaTokenURI
      );

      const timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

      await expect(tx).to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(safcParentID, receiver.address, timestamp, tokenAmount);
      
      // totalSupply of meta certificate should be updated to ${tokenAmount}
      totalSupply = await metatokenContract.tokenSupply(safcParentID);
      expect(totalSupply).to.equals(tokenAmount);
      expect(
        await metaToken.tokenSupply(safcParentID)
      ).to.equals(tokenAmount);

    });

    it("Authorized revoker should be able to revoke meta-certificate", async () => {
      const { issuer, receiver, metatokenContract  } = await loadFixture(initFixture);
      const safcParentID = 1;
      const tokenAmount = 42;

      // issue SAFC
      const proofData = generateProofData({volume: tokenAmount});
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData, receiver);

      // issue meta-certificate
      tx = await metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount,
          receiver.address,
          metaTokenURI
      );

      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

      await expect(tx).to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(safcParentID, receiver.address, timestamp, tokenAmount);
      
        // check that meta-certificate is not revoked
      const tokenAddress = await metatokenContract.getMetaTokenAddress();
      
      const metaToken = await ethers.getContractAt("MetaToken", tokenAddress);
      
      let isRevoked = await metaToken.isMetaTokenRevoked(safcParentID);
      expect(isRevoked).to.be.false;
      expect(
        await metatokenContract.isMetaTokenRevoked(safcParentID)
      ).to.be.equal(isRevoked);
      

      // revoke meta-certificate
      tx = await metatokenContract.connect(revoker).revokeMetaToken(safcParentID)
      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;
      await expect(tx).to.emit(metatokenContract, "MetaTokenRevoked")
        .withArgs(safcParentID, timestamp);
      
      // check if meta-certificate is revoked
      isRevoked = await metaToken.isMetaTokenRevoked(safcParentID);
      const revocationDate = await metaToken.tokenRevocationDate(safcParentID);

      expect(isRevoked).to.be.true;
      expect(
        await metatokenContract.isMetaTokenRevoked(safcParentID)
      ).to.be.equal(isRevoked);
      expect(revocationDate).to.equals(timestamp);
    });

    it("should revert when transfering a revoked meta-certificate", async () => {
      const safcParentID = 1;
      const tokenAmount = 42;
      const receiver = wallets[ 1 ];

      // issue SAFC
      const proofData = generateProofData({volume: tokenAmount});
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData);

      // issue meta-certificate
      tx = await metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount,
          receiver.address,
          metaTokenURI
      );

      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

      await expect(tx).to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(safcParentID, receiver.address, timestamp, tokenAmount);
      
      // revoke meta-certificate
      tx = await metatokenContract.connect(revoker).revokeMetaToken(safcParentID)
      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;
      await expect(tx).to.emit(metatokenContract, "MetaTokenRevoked")
        .withArgs(safcParentID, timestamp);
      
      // check if meta-certificate is revoked
      const tokenAddress = await metatokenContract.getMetaTokenAddress();
      
      const metaToken = await ethers.getContractAt("MetaToken", tokenAddress);
      
      let isRevoked = await metaToken.isMetaTokenRevoked(safcParentID);
      const revocationDate = await metaToken.tokenRevocationDate(safcParentID);
      expect(isRevoked).to.be.true;
      expect(revocationDate).to.equals(timestamp);

      // transfer meta-certificate
      await expect(
        metaToken.connect(receiver).safeTransferFrom(
          receiver.address,
          wallets[ 2 ].address,
          safcParentID,
          tokenAmount,
          ethers.utils.formatBytes32String("")
        )
      ).to.be.revertedWith(`RevokedToken(${safcParentID}, ${revocationDate})`);
    });

    it("Should revert when revoker tries to revoke meta-certificate twice", async () => {
      const safcParentID = 1;
      const tokenAmount = 42;
      const receiver = wallets[ 1 ];

      // issue SAFC
      const proofData = generateProofData({volume: tokenAmount});
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData);

      // issue meta-certificate
      tx = await metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount,
          receiver.address,
          metaTokenURI
      );

      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

      await expect(tx).to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(safcParentID, receiver.address, timestamp, tokenAmount);
      
      // check that meta-certificate is not revoked
      const tokenAddress = await metatokenContract.getMetaTokenAddress();
      
      const metaToken = await ethers.getContractAt("MetaToken", tokenAddress);
      
      let isRevoked = await metaToken.isMetaTokenRevoked(safcParentID);
      expect(isRevoked).to.be.false;
      

      // revoke meta-certificate
      tx = await metatokenContract.connect(revoker).revokeMetaToken(safcParentID)
      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;
      await expect(tx).to.emit(metatokenContract, "MetaTokenRevoked")
        .withArgs(safcParentID, timestamp);
      
      // check if meta-certificate is revoked
      isRevoked = await metaToken.isMetaTokenRevoked(safcParentID);
      expect(isRevoked).to.be.true;

      await expect(
        metatokenContract.connect(revoker).revokeMetaToken(safcParentID)
      ).to.be.revertedWith(`RevokedToken(${safcParentID}, ${timestamp})`);
    });

    it("should revert when non admin tries to direclty revoke meta-certificate", async () => {
      const safcParentID = 1;
      const tokenAmount = 42;
      const receiver = wallets[ 1 ];

      // issue SAFC
      const proofData = generateProofData({volume: tokenAmount});
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData);

      // issue meta-certificate
      tx = await metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount,
          receiver.address,
          metaTokenURI
      );

      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

      await expect(tx).to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(safcParentID, receiver.address, timestamp, tokenAmount);

      // direct revocation of meta-certificate on metaToken contract should revert
      const metaToken = await ethers.getContractAt("MetaToken", await metatokenContract.getMetaTokenAddress());
      const nonAdmin = wallets[ 2 ];

      await expect(
        metaToken.connect(wallets[2]).revokeMetaToken(safcParentID)
      ).to.be.revertedWith(`NotAdmin("${nonAdmin.address}")`);
    });

    it("should revert when non authorized revoker tries to revoke meta-certificate", async () => {
      const safcParentID = 1;
      const tokenAmount = 42;
      const receiver = wallets[ 1 ];

      // issue SAFC
      const proofData = generateProofData({volume: tokenAmount});
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData);

      // issue meta-certificate
      tx = await metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount,
          receiver.address,
          metaTokenURI
      );

      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

      await expect(tx).to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(safcParentID, receiver.address, timestamp, tokenAmount);

      // revocation of meta-certificate should revert
      const nonRevoker = wallets[ 2 ];
      await expect(
        metatokenContract.connect(nonRevoker).revokeMetaToken(safcParentID)
      ).to.be.revertedWith(`NotEnrolledRevoker("${nonRevoker.address}")`);
    });

    it("Meta-certificate should correctly be revoked when parent certificate is revoked", async () => {
      const safcParentID = 1;
      const tokenAmount = 42;
      const receiver = wallets[ 1 ];
      let tx;
      let timestamp;

      // issue SAFC
      const proofData = generateProofData({volume: tokenAmount});
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData, receiver);

      // issue meta-certificate
      tx = await metatokenContract.connect(issuer)
        .issueMetaToken(
          safcParentID,
          tokenAmount,
          receiver.address,
          metaTokenURI
      );

      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

      await expect(tx).to.emit(metatokenContract, "MetaTokenIssued")
        .withArgs(safcParentID, receiver.address, timestamp, tokenAmount);

      // revoking parent certificate should revoke associated meta-certificate
      tx = await proofManagerContract.connect(revoker).revokeProof(safcParentID)
      timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;
      await expect(tx).to.emit(proofManagerContract, "ProofRevoked");
      await expect(tx).to.emit(metatokenContract, "MetaTokenRevoked").withArgs(safcParentID, timestamp);
    });

    it("Should not revoke any meta-certificate when revoking a certificate with no derived certificates", async () => {
      const safcParentID = 1;
      const tokenAmount = 42;
      const receiver = wallets[ 1 ];
      let tx;

      // issue SAFC
      const proofData = generateProofData({volume: tokenAmount});
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(safcParentID, proofData, receiver);

      // revoking a certificate with no derived certificates should not revoke any meta-certificate
      tx = await proofManagerContract.connect(revoker).revokeProof(safcParentID);
      await expect(tx).to.emit(proofManagerContract, "ProofRevoked");
      await expect(tx).to.not.emit(metatokenContract, "MetaTokenRevoked");
    });
  });

  describe("Batch operation tests", () => {
    describe("\t- Issuance", () => {
      it("should correctly mint a batch of certificates", async () => {
        const { issuerContract, receiver, votingContract, worker, issuer } = await loadFixture(initFixture);
        const batchQueue = [];
        const dataProofs = [];
        const nbIssuanceRequests = 20;
  
        for (let i = 0; i < nbIssuanceRequests; i++) {
          dataProofs.push(generateProofData({ volume: i + 1 }));
          await votingContract.connect(worker).vote(dataProofs[ i ].inputHash, dataProofs[ i ].matchResult);
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
              .withArgs(i + 1,  parseEther(dataProofs[i].volume.toString()), receiver.address);
        }
      });
  
      it("should revert certificate batch issuance when non issuer requests batch issuance", async () => {
        const { issuerContract, receiver, votingContract, worker } = await loadFixture(initFixture);
        const nonIssuer = wallets[ 0 ];
        const batchQueue = [];
        const dataProofs = [];
        const nbIssuanceRequests = 20;
  
        for (let i = 0; i < nbIssuanceRequests; i++) {
          dataProofs.push(generateProofData({ volume: i + 1 }));
          await votingContract.connect(worker).vote(dataProofs[ i ].inputHash, dataProofs[ i ].matchResult);
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
          issuerContract
            .connect(nonIssuer).requestBatchIssuance(batchQueue)
        ).to.be.revertedWith(`NotEnrolledIssuer("${nonIssuer.address}")`);
      });
      
      it("should revert certificate batch issuance when batch queue size exceeds the limit", async () => {
        const { issuerContract, receiver, votingContract, worker, issuer } = await loadFixture(initFixture);
        const batchQueue = [];
        const dataProofs = [];
        const maxQueueSize = 20;
        const nbIssuanceRequests = 21;
  
        for (let i = 0; i < nbIssuanceRequests; i++) {
          dataProofs.push(generateProofData({ volume: i + 1 }));
          await votingContract.connect(worker).vote(dataProofs[ i ].inputHash, dataProofs[ i ].matchResult);
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
          issuerContract
            .connect(issuer).requestBatchIssuance(batchQueue)
        ).to.be.revertedWith(`BatchQueueSizeExceeded(${nbIssuanceRequests}, ${maxQueueSize})`);
      });
    });

    describe("\t- Transfer", () => {
      it("should correctly transfer a simple batch of certificates", async () => {
        const { issuerContract, receiver, votingContract, worker, issuer } = await loadFixture(initFixture);
        const nbIssuanceRequests = 20;

        const { batchQueue, dataProofs } = await prepareBatchIssuance(nbIssuanceRequests, votingContract, worker);
  
        const batchTx = await issuerContract
          .connect(issuer)
          .requestBatchIssuance(batchQueue);
        
        for (let i = 0; i < nbIssuanceRequests; i++) {
          await expect(batchTx)
              .to.emit(issuerContract, "ProofMinted")
              .withArgs(i + 1,  parseEther(dataProofs[i].volume.toString()), receiver.address);
        }

        const { batchTransfers } = await prepareSimpleBatchTransfer(nbIssuanceRequests, receiver, dataProofs);
        
        const batchTransferTx = await issuerContract
          .connect(receiver)
          .simpleBatchTransfer(batchTransfers);
        
        for(let i = 0; i < nbIssuanceRequests; i++) {
          await expect(batchTransferTx)
            .to.emit(issuerContract, "TransferSingle")
            .withArgs(receiver.address, receiver.address, wallets[i % 5].address, i + 1, parseEther(dataProofs[i].volume.toString()));
        }
      });

      it("should revert simple batch transfer of certificates hen batch queue size exceeds the limit", async () => {
        const { issuerContract, receiver, votingContract, worker, issuer } = await loadFixture(initFixture);
        const maxQueueSize = 20;

        const { batchQueue, dataProofs } = await prepareBatchIssuance(maxQueueSize, votingContract, worker);
  
        const batchTx = await issuerContract
          .connect(issuer)
          .requestBatchIssuance(batchQueue);
        
        for (let i = 0; i < maxQueueSize; i++) {
          await expect(batchTx)
              .to.emit(issuerContract, "ProofMinted")
              .withArgs(i + 1,  parseEther(dataProofs[i].volume.toString()), receiver.address);
        }

        const { batchTransfers } = await prepareSimpleBatchTransfer(maxQueueSize, receiver, dataProofs);
        
        const oversizedBatchTransfers = [...batchTransfers, batchTransfers[0]]
        await expect(
          issuerContract
          .connect(receiver)
            .simpleBatchTransfer(oversizedBatchTransfers)
        ).to.be.revertedWith(`BatchQueueSizeExceeded(${maxQueueSize + 1}, ${maxQueueSize})`);
        
      });

      it("should correctly transfer a multiple batch of certificates", async () => {
        const { issuerContract, receiver, votingContract, worker, issuer } = await loadFixture(initFixture);
        const nbIssuanceRequests = 20;

        const { batchQueue, dataProofs } = await prepareBatchIssuance(nbIssuanceRequests, votingContract, worker);
  
        const batchTx = await issuerContract
          .connect(issuer)
          .requestBatchIssuance(batchQueue);
        
        for (let i = 0; i < nbIssuanceRequests; i++) {
          await expect(batchTx)
              .to.emit(issuerContract, "ProofMinted")
              .withArgs(i + 1,  parseEther(dataProofs[i].volume.toString()), receiver.address);
        }

        const { batchTransfers } = await prepareMultipleBatchTransfer(nbIssuanceRequests, receiver, dataProofs);
        
        const batchTransferTx = await issuerContract
          .connect(receiver)
          .multipleBatchTransfer(batchTransfers);
        
        for (let i = 0; i < nbIssuanceRequests; i++) {
          const halfOfAmount = parseEther(dataProofs[ i ].volume.toString()).div(2);
          await expect(batchTransferTx)
            .to.emit(issuerContract, "TransferBatch")
            .withArgs(receiver.address, receiver.address, wallets[i % 5].address, [i + 1, i + 1], [halfOfAmount, halfOfAmount]);
        }
      });

      it("should revert simple batch transfer of certificates when batch queue size exceeds the limit", async () => {
        const { issuerContract, receiver, votingContract, worker, issuer } = await loadFixture(initFixture);
        const maxQueueSize = 20;

        const { batchQueue, dataProofs } = await prepareBatchIssuance(maxQueueSize, votingContract, worker);
  
        const batchTx = await issuerContract
          .connect(issuer)
          .requestBatchIssuance(batchQueue);
        
        for (let i = 0; i < maxQueueSize; i++) {
          await expect(batchTx)
              .to.emit(issuerContract, "ProofMinted")
              .withArgs(i + 1,  parseEther(dataProofs[i].volume.toString()), receiver.address);
        }

        const { batchTransfers } = await prepareMultipleBatchTransfer(maxQueueSize, receiver, dataProofs);
        
        const oversizedBatchTransfers = [...batchTransfers, batchTransfers[0]]
        await expect(
          issuerContract
          .connect(receiver)
            .multipleBatchTransfer(oversizedBatchTransfers)
        ).to.be.revertedWith(`BatchQueueSizeExceeded(${maxQueueSize + 1}, ${maxQueueSize})`);
        
      });
    });

    describe("\t- Claiming", () => {
      it("should revert if a user tries to claim a batch of non owned certificates", async () => {
        const { proofData, worker, receiver, proofManagerContract, votingContract } = await loadFixture(initFixture);
         const proofData2 = generateProofData({ volume: 2 });
         
        await votingContract.connect(worker).vote(proofData.inputHash, proofData.matchResult);
        await votingContract.connect(worker).vote(proofData2.inputHash, proofData2.matchResult);
         
         const claimRequests = [
           { amount: parseEther("1"), certificateID: 1},
           { amount: parseEther("1"), certificateID: 2},
         ]

        await expect(
          proofManagerContract
            .connect(receiver)
            .claimBatchProofs(claimRequests)
        ).to.be.revertedWith(`InsufficientBalance("${receiver.address}", 1, ${parseEther("1")})`);
      });

      it("should revert if batch of claims exceeds the size limit ", async () => {
        const { worker, receiver, claimer, proofManagerContract, votingContract } = await loadFixture(initFixture);
        const maxbatchSize = 20;
        const oversizedBatch = [];
         
        for (let i = 0; i < maxbatchSize + 1; i++) {
          const volume = i + 1;
          const certificateID = i + 1;

          const proofData = generateProofData({volume});
          await votingContract.connect(worker).vote(proofData.inputHash, proofData.matchResult);
          await mintProof(certificateID, proofData, receiver);
          oversizedBatch.push(
            {
              amount: parseEther((volume).toString()),
              certificateID
            })
        }

        await expect(
          proofManagerContract
          .connect(claimer)
            .claimBatchProofs(oversizedBatch)
          ).to.be.revertedWith(`BatchQueueSizeExceeded(${oversizedBatch.length}, ${maxbatchSize})`);
        
      });

      it("should claim a batch of proofs", async () => {
        const { proofData, worker, receiver, proofManagerContract, votingContract } = await loadFixture(initFixture);
         const proofData2 = generateProofData({ volume: 2 });
         
        await votingContract.connect(worker).vote(proofData.inputHash, proofData.matchResult);
        await votingContract.connect(worker).vote(proofData2.inputHash, proofData2.matchResult);

       
        await mintProof(1, proofData, receiver);
        await mintProof(2, proofData2, receiver);
         
         const claimRequests = [
           { amount: parseEther("1"), certificateID: 1 },
           { amount: parseEther("2"), certificateID: 2 },
         ]

        const batchClaimTx = await proofManagerContract
          .connect(receiver)
          .claimBatchProofs(claimRequests);
        
        const timestamp = await getTimeStamp(batchClaimTx);
        
        await expect(batchClaimTx).to.emit(proofManagerContract, "ProofClaimed").withArgs(1, receiver.address, timestamp, claimRequests[0].amount);
        await expect(batchClaimTx).to.emit(proofManagerContract, "ProofClaimed").withArgs(2, receiver.address, timestamp, claimRequests[1].amount);
      });

      it("should revert if non claimer tries to delegately claim a batch of proofs", async () => {
        const { proofData, worker, receiver, proofManagerContract, votingContract } = await loadFixture(initFixture);
         const proofData2 = generateProofData({ volume: 2 });
         
        await votingContract.connect(worker).vote(proofData.inputHash, proofData.matchResult);
        await votingContract.connect(worker).vote(proofData2.inputHash, proofData2.matchResult);

        const notClaimer = worker;
       
        await mintProof(1, proofData, receiver);
        await mintProof(2, proofData2, receiver);
         
         const claimRequests = [
           { amount: parseEther("1"), certificateID: 1, certificateOwner: receiver.address },
           { amount: parseEther("1"), certificateID: 2, certificateOwner: receiver.address },
         ]

        await expect(
          proofManagerContract
            .connect(notClaimer)
            .claimBatchProofsFor(claimRequests)
        ).to.be.revertedWith(`NotEnrolledClaimer("${notClaimer.address}")`);
      });

      it("should revert if the delegated claim queue size exceeds the limit ", async () => {
        const { proofData, worker, receiver, claimer, proofManagerContract, votingContract } = await loadFixture(initFixture);
        const proofData2 = generateProofData({ volume: 2 });
        const maxbatchSize = 20;
        const oversizedBatch = [];
         
        await votingContract.connect(worker).vote(proofData.inputHash, proofData.matchResult);
        await votingContract.connect(worker).vote(proofData2.inputHash, proofData2.matchResult);

       
        await mintProof(1, proofData, receiver);
        await mintProof(2, proofData2, receiver);
         
        for (let i = 0; i < maxbatchSize + 1; i++) {
          oversizedBatch.push({ amount: parseEther("1"), certificateID: i + 1, certificateOwner: receiver.address })
        }

        await expect(
          proofManagerContract
          .connect(claimer)
            .claimBatchProofsFor(oversizedBatch)
          ).to.be.revertedWith(`BatchQueueSizeExceeded(${oversizedBatch.length}, ${maxbatchSize})`);
        
      });

      it("should delegately claim a batch of proofs", async () => {
        const { proofData, worker, receiver, claimer, proofManagerContract, votingContract } = await loadFixture(initFixture);
         const proofData2 = generateProofData({ volume: 2 });
         
        await votingContract.connect(worker).vote(proofData.inputHash, proofData.matchResult);
        await votingContract.connect(worker).vote(proofData2.inputHash, proofData2.matchResult);

       
        await mintProof(1, proofData, receiver);
        await mintProof(2, proofData2, receiver);
         
         const claimRequests = [
           { amount: parseEther("1"), certificateID: 1, certificateOwner: receiver.address },
           { amount: parseEther("2"), certificateID: 2, certificateOwner: receiver.address },
         ]

        const batchClaimTx = await proofManagerContract
          .connect(claimer)
          .claimBatchProofsFor(claimRequests);
        
        const timestamp = await getTimeStamp(batchClaimTx);
        
        await expect(batchClaimTx).to.emit(proofManagerContract, "ProofClaimed").withArgs(1, receiver.address, timestamp, claimRequests[0].amount);
        await expect(batchClaimTx).to.emit(proofManagerContract, "ProofClaimed").withArgs(2, receiver.address, timestamp, claimRequests[1].amount);
      });
    });

    describe("\t- Proofs Inspection", () => {
      it("allows to get the batch of proof IDs by data hashes", async () => {
        const { proofData, proofManagerContract, receiver, worker, votingContract } = await loadFixture(initFixture);
        const certificateID1 = 1;
        const certificateID2 = 2;
        const proofData2 = generateProofData({ volume: 2 });

        await votingContract.connect(worker).vote(proofData.inputHash, proofData.matchResult);
        await mintProof(certificateID1, proofData, receiver);
        
        await votingContract.connect(worker).vote(proofData2.inputHash, proofData2.matchResult);
        await mintProof(certificateID2, proofData2, receiver);

        const dataHashes = [proofData.volumeRootHash, proofData2.volumeRootHash];

        const certificateIDsByHashes = await proofManagerContract
          .connect(issuer)
          .getProofIDsByDataHashes(dataHashes);

        console.log("certificateIDsByHashes", certificateIDsByHashes);

        expect(BigNumber.from(certificateIDsByHashes[0]['certificateID']).toNumber()).to.equal(certificateID1);
        expect(certificateIDsByHashes[0]['dataHash']).to.equal(proofData.volumeRootHash);
        expect(BigNumber.from(certificateIDsByHashes[1]['certificateID']).toNumber()).to.equal(certificateID2);
        expect(certificateIDsByHashes[1]['dataHash']).to.equal(proofData2.volumeRootHash);
      });
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
    const { votingContract } = await loadFixture(initFixture);
    
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

  const transferFor = async (operator, owner, receiver, certificateID, transferVolume) => {

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

  const prepareBatchIssuance = async(batchSize, votingContract, worker) => {
    const batchQueue = [];
    const dataProofs = [];

    for (let i = 0; i < batchSize; i++) {
          dataProofs.push(generateProofData({ volume: i + 1 }));
          await votingContract.connect(worker).vote(dataProofs[ i ].inputHash, dataProofs[ i ].matchResult);
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
  }

  const prepareSimpleBatchTransfer = async (BatchSize, sender, dataProofs) => {
    const batchTransfers = [];
    for (let i = 0; i < BatchSize; i++) {
      batchTransfers.push(
        {
          sender: sender.address,
          recipient: wallets[ i % 5 ].address,
          certificateID: i + 1,
          amount: parseEther(dataProofs[ i ].volume.toString()),
          data: "0x",
        }
      );
    }
    return { batchTransfers };
  }

  const prepareMultipleBatchTransfer = async (BatchSize, sender, dataProofs) => {
    const batchTransfers = [];
    for (let i = 0; i < BatchSize; i++) {
      const halfOfAmount = parseEther(dataProofs[ i ].volume.toString()).div(2);
      batchTransfers.push(
        {
          sender: sender.address,
          recipient: wallets[ i % 5 ].address,
          certificateIDs: [i + 1, i + 1], // same certificateID is sent twice to the same recipient
          amounts: [halfOfAmount, halfOfAmount], // half of the amount is sent twice to the same recipient
          data: "0x",
        }
      );
    }
    return { batchTransfers };
  }
});
