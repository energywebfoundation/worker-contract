const chai = require('chai');
const { expect } = require('chai');
const { parseEther } = require('ethers').utils;
const {
  deployDiamond,
} = require('../scripts/deploy/deployContracts');
const { ethers } = require('hardhat');
const { solidity } = require('ethereum-waffle');
const { roles } = require('./utils/roles.utils');
const { initMockClaimManager } = require('./utils/claimManager.utils');
const { initMockClaimRevoker } = require('./utils/claimRevocation.utils');
const { generateProofData } = require('./utils/issuer.utils');
const { BigNumber } = require('ethers');
chai.use(solidity);

const tokenURI = 'bafkreihzks3jsrfqn4wm6jtc3hbfsikq52eutvkvrhd454jztna73cpaaq';
const transferBytesData = ethers.utils.formatBytes32String('');

describe('IssuerFacet', function() {
  let owner;
  let issuer;
  let worker;
  let wallets;

  let diamondAddress;
  let votingContract;
  let proofManagerContract;
  let issuerContract;

  let grantRole;
  let revokeRole;

  beforeEach(async () => {
    [
      owner,
      issuer,
      worker,
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

    ({ diamondAddress } = await deployDiamond({
      claimManagerAddress: claimManagerMocked.address,
      claimRevokerAddress: claimsRevocationRegistryMocked.address,
      contractOwner: owner.address,
      roles,
      majorityPercentage: 0,
    }));

    issuerContract = await ethers.getContractAt('IssuerFacet', diamondAddress);
    votingContract = await ethers.getContractAt('VotingFacet', diamondAddress);
    proofManagerContract = await ethers.getContractAt('ProofManagerFacet', diamondAddress);

    await grantRole(worker, roles.workerRole);
    await votingContract.addWorker(worker.address);
    await grantRole(issuer, roles.issuerRole);
  });

  describe('Proof issuance tests', () => {
    it('checks that the every one has 0 balance initially', async () => {
      for (const wallet of await ethers.getSigners()) {
        const first20TokenIds = new Array(20).fill(0).map((_, i) => i);
        for (const tokenId of first20TokenIds) {
          const balance = await issuerContract.balanceOf(
            wallet.address,
            tokenId,
          );

          expect(balance).to.equal(0);
        }
      }
    });

    it('should reject proof issuance requests if generator is the zero address', async () => {
      const { inputHash, volumeRootHash, matchResultProof, volume, volumeProof } = generateProofData();

      await expect(
        issuerContract
          .connect(issuer)
          .requestProofIssuance(
            inputHash,
            ethers.constants.AddressZero,
            volumeRootHash,
            matchResultProof,
            parseEther(volume.toString(10)),
            volumeProof,
            tokenURI,
          ),
      ).to.be.revertedWith('issuance must be non-zero');
    });

    it('Authorized issuers can send proof issuance requests', async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(1, proofData);
    });

    it('reverts when issuers send duplicate proof issuance requests', async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      await mintProof(1, proofData);
      await expectAlreadyCertified(proofData);
    });

    it('checks that the certified generation volume is correct after minting', async () => {
      const receiver = wallets[1];
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, receiver);

      const amountMinted = await issuerContract.balanceOf(receiver.address, 1);

      expect(amountMinted).to.equal(parseEther(proofData.volume.toString()));
    });

    it('should revert when one tries to transfer token ID = 0', async () => {
      const transferBytesData = ethers.utils.formatBytes32String('');

      await expect(
        issuerContract
          .connect(wallets[0])
          .safeTransferFrom(
            wallets[0].address,
            owner.address,
            0,
            parseEther('2'),
            transferBytesData,
          ),
      ).to.be.revertedWith('transfer: invalid zero token ID');
    });

    it('should revert when one tries to transfer token ID > lastTokenIndex', async () => {
      const invalidTokenIndex = 1;

      await expect(
        issuerContract
          .connect(wallets[0])
          .safeTransferFrom(
            wallets[0].address,
            owner.address,
            invalidTokenIndex,
            parseEther('2'),
            transferBytesData,
          ),
      ).to.be.revertedWith(
        'transfer: tokenId greater than issuer.latestCertificateId',
      );
    });

    it('should correctly transfer certificates', async () => {
      const minter = wallets[0];
      const receiver = wallets[1];
      const transferVolume = parseEther('2');
      const mintedVolume = 5;
      const proofData = generateProofData({ volume: mintedVolume });
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, minter);

      await transfer(minter, receiver, transferVolume);

      const minterBalance = await issuerContract.balanceOf(minter.address, 1);
      const receiverBalance = await issuerContract.balanceOf(receiver.address, 1);
      expect(minterBalance).to.equal(parseEther(`${mintedVolume}`).sub(transferVolume));
      expect(receiverBalance).to.equal(transferVolume);
    });

    it('should get the list of all certificate owners', async () => {
      const minter = wallets[0];
      const receiver = wallets[1];
      const transferVolume = parseEther('2');
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

    it('should get all certificates of one owner', async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      await mintProof(1, proofData, wallets[0]);

      const secondProofData = generateProofData();
      await reachConsensus(secondProofData.inputHash, secondProofData.matchResult);
      await mintProof(2, secondProofData, wallets[0]);

      const certs = await proofManagerContract.getProofsOf(wallets[0].address);

      expect(certs).to.have.length(2);
      const cert = certs[0];
      expect(cert.isRevoked).to.eql(false);
      expect(cert.certificateID).to.eql(BigNumber.from(1));
      expect(cert.volume).to.eql(parseEther(`${proofData.volume}`));
      expect(cert.merkleRootHash).to.eql(proofData.volumeRootHash);
      expect(cert.generator).to.eql(wallets[0].address);

      const secondCert = certs[1];
      expect(secondCert.isRevoked).to.eql(false);
      expect(secondCert.certificateID).to.eql(BigNumber.from(2));
      expect(secondCert.volume).to.eql(parseEther(`${secondProofData.volume}`));
      expect(secondCert.merkleRootHash).to.eql(secondProofData.volumeRootHash);
      expect(secondCert.generator).to.eql(wallets[0].address);

    });

    it('Should reject issuance requests for wrongs voteIDs', async () => {
      const { inputHash: someOtherHash } = generateProofData();
      const receiver = wallets[0];
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);

      const wrongData = { ...proofData, inputHash: someOtherHash };

      await requestMinting(wrongData, receiver)
        .to.be.revertedWith(someOtherHash);
    });
  });

  describe.only('Proof revocation tests', () => {
    it('should prevent a non authorized entity from revoking non retired proof', async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const unauthorizedOperator = wallets[0];
      await mintProof(1, proofData, unauthorizedOperator);
      await revokeRole(unauthorizedOperator, roles.revokerRole);

      await expect(
        proofManagerContract
          .connect(unauthorizedOperator)
          .revokeProof(1),
      ).to.be.revertedWith('Access: Not enrolled as revoker');
    });

    it('should prevent revocation of non existing certificates', async () => {
      const nonExistingCertificateID = 1;
      const revoker = wallets[0];
      await grantRole(revoker, roles.revokerRole);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(nonExistingCertificateID),
      ).to.be.revertedWith(
        `NonExistingCertificate(${nonExistingCertificateID})`,
      );
    });

    it('should allow an authorized entity to revoke a non retired proof', async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const revoker = wallets[0];
      await mintProof(1, proofData, revoker);
      await grantRole(revoker, roles.revokerRole);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(1),
      ).to.emit(proofManagerContract, 'ProofRevoked');
    });

    it('it should revert when transfering reevoked proof', async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const revoker = wallets[0];
      await mintProof(1, proofData, revoker);
      await grantRole(revoker, roles.revokerRole);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(1),
      ).to.emit(proofManagerContract, 'ProofRevoked');


      await expect(
        issuerContract
          .safeTransferFrom(
            revoker.address,
            owner.address,
            1,
            parseEther('1'),
            transferBytesData,
          ),
      ).to.be.revertedWith('non tradable revoked proof');
    });

    it('should prevent duplicate revocation', async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const revoker = wallets[0];
      await mintProof(1, proofData, revoker);
      await grantRole(revoker, roles.revokerRole);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(1),
      ).to.emit(proofManagerContract, 'ProofRevoked');

      await expect(
        proofManagerContract.connect(revoker).revokeProof(1),
      ).to.be.revertedWith('already revoked proof');
    });

    it('should revert if one tries to retire a revoked proof', async () => {
      const proofData = generateProofData();
      await reachConsensus(proofData.inputHash, proofData.matchResult);
      const revoker = wallets[0];
      await mintProof(1, proofData, revoker);
      await grantRole(revoker, roles.revokerRole);

      await expect(
        proofManagerContract.connect(revoker).revokeProof(1),
      ).to.emit(proofManagerContract, 'ProofRevoked');

      await expect(
        proofManagerContract.connect(owner).claimProof(1, 1),
      ).to.be.revertedWith('proof revoked');
    });

      it('should allow claiming proofs', async () => {
        const mintedVolume = 5;
        const proofData = generateProofData({ volume: mintedVolume });
        await reachConsensus(proofData.inputHash, proofData.matchResult);
        const minter = wallets[0];
        await mintProof(1, proofData, minter);
        const claimedVolume = parseEther((proofData.volume - 2).toString());

        const initialClaimedAmount = await proofManagerContract.claimedBalanceOf(minter.address,1);
        expect(initialClaimedAmount).to.equal(0);

        const tx = await proofManagerContract
          .connect(minter)
          .claimProof(1, claimedVolume);
        await tx.wait();

        const { timestamp } = await ethers.provider.getBlock(tx.blockNumber);
        await expect(tx)
          .to.emit(proofManagerContract, 'ProofClaimed')
          .withArgs(1, minter.address, timestamp, claimedVolume);

        const claimedProofsAmount = await proofManagerContract.claimedBalanceOf(minter.address,1);
        expect(claimedProofsAmount).to.equal(claimedVolume);

        const remainingVolume = await proofManagerContract.getProofsOf(minter.address)
        expect(remainingVolume[0].volume).to.equal(parseEther(`${mintedVolume}`).sub(claimedVolume))
      });
    //
    //   it('should revert when retirement amount exceeds owned volume', async () => {
    //     await expect(
    //       proofManagerContract
    //         .connect(generator)
    //         .claimProof(lastTokenID, parseEther('100')),
    //     ).to.be.revertedWith('Insufficient volume owned');
    //   });
    //
    //   it('should prevent authorized revoker from revoking a retired proof after the revocable Period', async () => {
    //     const proof = await proofManagerContract
    //       .connect(owner)
    //       .getProof(certificateID2);
    //     const issuanceDate = Number(proof.issuanceDate.toString());
    //
    //     //forward time to reach end of revocable period
    //     await timeTravel(DEFAULT_REVOCABLE_PERIOD);
    //
    //     tx = proofManagerContract.connect(revoker).revokeProof(certificateID2);
    //
    //     //The certificate should not be revocable anymore
    //     await expect(tx).to.be.revertedWith(
    //       `NonRevokableCertificate(${certificateID2}, ${issuanceDate}, ${
    //         issuanceDate + DEFAULT_REVOCABLE_PERIOD
    //       })`,
    //     ); //emit(proofManagerContract, "ProofRevoked");
    //   });
    //
    //   it('allows to reissue revoked certificate', async () => {
    //     const {
    //       inputHash, volumeRootHash, matchResultProof, volume, volumeProof, matchResult,
    //     } = generateProofData();
    //
    //     await votingContract.connect(worker1).vote(inputHash, matchResult);
    //     await votingContract.connect(worker2).vote(inputHash, matchResult);
    //
    //     await expect(
    //       issuerContract
    //         .connect(issuer)
    //         .requestProofIssuance(inputHash, generatorAddress, volumeRootHash, matchResultProof, parseEther(volume.toString()), volumeProof, tokenURI),
    //     );
    //
    //     const certificateId = await proofManagerContract.connect(revoker).getProofIdByDataHash(volumeRootHash);
    //     await expect(
    //       issuerContract
    //         .connect(issuer)
    //         .requestProofIssuance(inputHash, generatorAddress, volumeRootHash, matchResultProof, parseEther(volume.toString()), volumeProof, tokenURI),
    //     ).to.be.revertedWith(`AlreadyCertifiedData("${volumeRootHash}")`);
    //
    //     await proofManagerContract.connect(revoker).revokeProof(certificateId);
    //
    //     await issuerContract
    //       .connect(issuer)
    //       .requestProofIssuance(inputHash, generatorAddress, volumeRootHash, matchResultProof, parseEther(volume.toString()), volumeProof, tokenURI);
    //   });
    //
    //   it('allows to get proof ID by data hash', async () => {
    //     const {
    //       inputHash, volumeRootHash, matchResultProof, volume, volumeProof, matchResult,
    //     } = generateProofData();
    //     await votingContract.connect(worker1).vote(inputHash, matchResult);
    //     await votingContract.connect(worker2).vote(inputHash, matchResult);
    //
    //     await expect(
    //       issuerContract
    //         .connect(issuer)
    //         .requestProofIssuance(inputHash, generatorAddress, volumeRootHash, matchResultProof, parseEther(volume.toString()), volumeProof, tokenURI),
    //     ).to.emit(issuerContract, 'ProofMinted');
    //
    //     const certificateId = await proofManagerContract.connect(issuer).getProofIdByDataHash(volumeRootHash);
    //
    //     expect(BigNumber.from(certificateId).toNumber()).to.be.gt(0);
    //   });
    // });
    //
    // describe('Proof verification tests', () => {
    //   it('should verify all kinds of proofs', async () => {
    //     const arr = [
    //       {
    //         id: 1,
    //         generatorID: 2,
    //         volume: 10,
    //         consumerID: 500,
    //       },
    //       {
    //         id: 2,
    //         generatorID: 3,
    //         volume: 10,
    //         consumerID: 522,
    //       },
    //       {
    //         id: 3,
    //         generatorID: 4,
    //         volume: 10,
    //         consumerID: 52,
    //       },
    //       {
    //         id: 4,
    //         generatorID: 5,
    //         volume: 10,
    //         consumerID: 53,
    //       },
    //       {
    //         id: 5,
    //         generatorID: 5,
    //         volume: 10,
    //         consumerID: 51,
    //       },
    //     ];
    //     const leaves = arr.map((item) => createPreciseProof(item).getHexRoot());
    //     const tree = createMerkleTree(leaves);
    //
    //     const leaf = leaves[1];
    //     const proof = tree.getHexProof(leaf);
    //     const root = tree.getHexRoot();
    //     expect(
    //       await proofManagerContract.connect(owner).verifyProof(root, leaf, proof),
    //     ).to.be.true;
    //
    //     const leafTree = createPreciseProof(arr[1]);
    //     const leafRoot = leafTree.getHexRoot();
    //     const leafLeaf = hash('consumerID' + JSON.stringify(522));
    //     const leafProof = leafTree.getHexProof(leafLeaf);
    //     expect(
    //       await proofManagerContract
    //         .connect(owner)
    //         .verifyProof(leafRoot, leafLeaf, leafProof),
    //     ).to.be.true;
    //   });
    //
    //   it('should successfully verify a proof', async () => {
    //     merkleInfos = getMerkleProof(data3);
    //     VC = merkleInfos.merkleRoot;
    //     expect(
    //       await proofManagerContract
    //         .connect(owner)
    //         .verifyProof(
    //           VC,
    //           merkleInfos.proofs[0].hexLeaf,
    //           merkleInfos.proofs[0].leafProof,
    //         ),
    //     ).to.be.true;
    //   });
    // });
    //
    // describe('Data disclosure tests', () => {
    //   it('should revert when non authorized user tries to disclose data', async () => {
    //     await revokeRole(nonAuthorizedOperator, issuerRole);
    //
    //     const key = 'consumerID';
    //     const value = '500';
    //
    //     const disclosedDataTree = createPreciseProof(data[0]);
    //     const dataLeaf = hash(key + value);
    //     const dataProof = disclosedDataTree.getHexProof(dataLeaf);
    //     const dataRootHash = disclosedDataTree.getHexRoot();
    //
    //     await expect(
    //       issuerContract
    //         .connect(nonAuthorizedOperator)
    //         .discloseData(key, value, dataProof, dataRootHash),
    //     ).to.be.revertedWith('Access: Not an issuer');
    //   });
    //
    //   it('should allow authorized user to disclose data', async () => {
    //     const key = 'consumerID';
    //     const value = '500';
    //
    //     const disclosedDataTree = createPreciseProof(data[0]);
    //     const dataLeaf = hash(key + value);
    //     const dataProof = disclosedDataTree.getHexProof(dataLeaf);
    //     const dataRootHash = disclosedDataTree.getHexRoot();
    //
    //     await issuerContract
    //       .connect(issuer)
    //       .discloseData(key, value, dataProof, dataRootHash);
    //   });
    //
    //   it('should revert when one tries to disclose not verified data', async () => {
    //     const wrongKey = 'NotExistingKey';
    //     const value = '500';
    //
    //     const disclosedDataTree = createPreciseProof(data[0]);
    //     const dataLeaf = hash(wrongKey + value);
    //     const dataProof = disclosedDataTree.getHexProof(dataLeaf);
    //     const dataRootHash = disclosedDataTree.getHexRoot();
    //
    //     await expect(
    //       issuerContract
    //         .connect(issuer)
    //         .discloseData(wrongKey, value, dataProof, dataRootHash),
    //     ).to.be.revertedWith('Disclose : data not verified');
    //   });
    //
    //   it('should revert when one tries to disclose already disclosed data', async () => {
    //     const key = 'consumerID';
    //     const value = '500';
    //
    //     const disclosedDataTree = createPreciseProof(data[0]);
    //     const dataLeaf = hash(key + value);
    //     const dataProof = disclosedDataTree.getHexProof(dataLeaf);
    //     const dataRootHash = disclosedDataTree.getHexRoot();
    //
    //     await expect(
    //       issuerContract
    //         .connect(issuer)
    //         .discloseData(key, value, dataProof, dataRootHash),
    //     ).to.be.revertedWith('Disclose: data already disclosed');
    //   });
  });

  const reachConsensus = async (inputHash, matchResult) => {
    await votingContract.connect(worker).vote(inputHash, matchResult);
  };

  const requestMinting = ({ inputHash, volumeRootHash, matchResultProof, volume, volumeProof }, receiver) => expect(
    issuerContract
      .connect(issuer)
      .requestProofIssuance(
        inputHash,
        receiver.address,
        volumeRootHash,
        matchResultProof,
        parseEther(volume.toString()),
        volumeProof,
        tokenURI,
      ),
  );

  const mintProof = async (id, proofData, receiver = wallets[1]) => {
    await requestMinting(proofData, receiver)
      .to.emit(issuerContract, 'ProofMinted')
      .withArgs(id, parseEther(proofData.volume.toString()), receiver.address);
  };

  const approveForTransfer = async (minter, wallet) => {
    await issuerContract.connect(minter).setApprovalForAll(wallet.address, true);
  };

  const expectAlreadyCertified = async (proofData) => {
    await requestMinting(proofData, wallets[0])
      .to.be.revertedWith(`AlreadyCertifiedData("${proofData.volumeRootHash}")`);
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
          transferBytesData,
        ),
    )
      .to.emit(issuerContract, 'TransferSingle')
      .withArgs(
        minter.address,
        minter.address,
        receiver.address,
        1,
        transferVolume,
      );
  };
});
