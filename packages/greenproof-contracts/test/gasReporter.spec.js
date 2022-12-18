const chai = require('chai');
const { expect } = require('chai');
const { parseEther } = require('ethers').utils;
const { deployGreenproof } = require('../scripts/deploy/deployContracts');
const { ethers } = require('hardhat');
const { solidity } = require('ethereum-waffle');
const { roles } = require('./utils/roles.utils');
const { initMockClaimManager } = require('./utils/claimManager.utils');
const { initMockClaimRevoker } = require('./utils/claimRevocation.utils');
const { generateProofData } = require('./utils/issuer.utils');
const { BigNumber } = require('ethers');
const { timeTravel } = require('./utils/time.utils');
const { createPreciseProof, createMerkleTree, hash } = require('@energyweb/greenproof-merkle-tree');
const { getMerkleProof } = require('./utils/merkleProof.utils');

chai.use(solidity);

const tokenURI = 'bafkreihzks3jsrfqn4wm6jtc3hbfsikq52eutvkvrhd454jztna73cpaaq';
const transferBytesData = ethers.utils.formatBytes32String('');
const revokablePeriod = 60 * 60 * 24;


describe('Gas consumption report', function() {
  let owner;
  let issuer;
  let worker;
  let revoker;
  let claimer;
  let wallets;
  let sender;
  let receiver;

  let greenproofAddress;
  let votingContract;
  let proofManagerContract;
  let issuerContract;

  let grantRole;
  let revokeRole;

  let proofData;

  before(async () => {
    [
      owner,
      issuer,
      worker,
      revoker,
      claimer,
      ...wallets
    ] = await ethers.getSigners();

    const claimManagerMocked = await initMockClaimManager(owner);
    const claimsRevocationRegistryMocked = await initMockClaimRevoker(owner);

    grantRole = async (wallet, role) => {
      await claimManagerMocked.grantRole(wallet.address, role);
      await claimsRevocationRegistryMocked.isRevoked(
        role,
        wallet.address,
        false,
      );
    };

    revokeRole = async (wallet, role) => {
      await claimManagerMocked.grantRole(wallet.address, role);
      await claimsRevocationRegistryMocked.isRevoked(
        role,
        wallet.address,
        true,
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

    issuerContract = await ethers.getContractAt('IssuerFacet', greenproofAddress);
    votingContract = await ethers.getContractAt('VotingFacet', greenproofAddress);
    proofManagerContract = await ethers.getContractAt('ProofManagerFacet', greenproofAddress);

    await resetRoles();
    await grantRole(worker, roles.workerRole);
    await votingContract.addWorker(worker.address);
    await grantRole(issuer, roles.issuerRole);
    await grantRole(revoker, roles.revokerRole);
    await grantRole(claimer, roles.claimerRole);

    sender = wallets[0];
    receiver = wallets[1];
  });

  describe('', () => {

    it('Voting process', async () => {
      const mintedVolume = 42;

      proofData = generateProofData({ volume: mintedVolume });

      await reachConsensus(proofData.inputHash, proofData.matchResult);
    });

    it('Certificate issuance process', async () => {
      await mintProof(1, proofData, wallets[0]);
    });

    it('Certificates transfer', async () => {
      const transferVolume = parseEther('2');
      await transfer(sender, receiver, transferVolume);
    });

        it('Retirement ', async () => {
      const claimedVolume = parseEther("2");

      await claimVolume(sender, claimedVolume);
    });
  
    it('Delegation of retirement', async () => {
      const claimedVolume = parseEther("2");

      await claimVolumeFor(sender, claimedVolume);

    });

    it('Revocation', async () => {
      await expect(
        proofManagerContract.connect(revoker).revokeProof(1),
      ).to.emit(proofManagerContract, 'ProofRevoked');
    });

    it('Proofs verification', async () => {
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

      const proof = tree.getHexProof(leaves[0]);
      expect(
        await proofManagerContract.connect(owner).verifyProof(root, leaves[0], proof),
      ).to.be.true;
      
    });

    it('Data disclosure', async () => {
      const proofData = generateProofData();
      const key = 'consumerID';
      const dataLeaf = hash(key + `${proofData.consumerID}`);
      const disclosedDataTree = proofData.volumeTree;
      const dataProof = disclosedDataTree.getHexProof(dataLeaf);
      const dataRootHash = disclosedDataTree.getHexRoot();

      await issuerContract
        .connect(issuer)
        .discloseData(key, `${proofData.consumerID}`, dataProof, dataRootHash);
    });
  });

  const claimVolumeFor = async (minter, claimedVolume) => {
    const tx = await proofManagerContract
      .connect(claimer)
      .claimProofFor(1, minter.address, claimedVolume);
    await tx.wait();

    const { timestamp } = await ethers.provider.getBlock(tx.blockNumber);
    await expect(tx)
      .to.emit(proofManagerContract, 'ProofClaimed')
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
      .to.emit(proofManagerContract, 'ProofClaimed')
      .withArgs(1, minter.address, timestamp, claimedVolume);
    return tx;
  };

  const reachConsensus = async (inputHash, matchResult) => {
    await votingContract.connect(worker).vote(inputHash, matchResult);
  };

  const requestMinting = (
    { inputHash, volumeRootHash, matchResultProof, volume, volumeProof },
    receiver,
    minter = issuer,
  ) =>
    issuerContract
      .connect(minter)
      .requestProofIssuance(
        inputHash,
        receiver.address,
        volumeRootHash,
        matchResultProof,
        parseEther(volume.toString()),
        volumeProof,
        tokenURI,
      )

  const mintProof = async (id, proofData, receiver = wallets[ 1 ], minter = issuer) => {
    const tx = await requestMinting(proofData, receiver, minter)
    await expect(tx)
      .to.emit(issuerContract, 'ProofMinted')
      .withArgs(id, parseEther(proofData.volume.toString()), receiver.address);
  };

  const approveForTransfer = async (minter, wallet) => {
    await issuerContract.connect(minter).setApprovalForAll(wallet.address, true);
  };

  const expectAlreadyCertified = async (proofData) => {
    await expect(requestMinting(proofData, wallets[0]))
      .to.be.revertedWith(`AlreadyCertifiedData("${proofData.volumeRootHash}")`);
  };

  const transfer = async (sender, receiver, transferVolume) => {
    await approveForTransfer(sender, owner);

    await expect(
      issuerContract
        .connect(sender)
        .safeTransferFrom(
          sender.address,
          receiver.address,
          1,
          transferVolume,
          transferBytesData,
        ),
    )
      .to.emit(issuerContract, 'TransferSingle')
      .withArgs(
        sender.address,
        sender.address,
        receiver.address,
        1,
        transferVolume,
      );
  };

  const resetRoles = async () => {
    const wallets = await ethers.getSigners();
    await Promise.all(
      wallets.map(async wallet =>
        Promise.all(
          Object.values(roles).map(async role =>
            revokeRole(wallet, role)
          )
        )
      )
    );
  };
});
