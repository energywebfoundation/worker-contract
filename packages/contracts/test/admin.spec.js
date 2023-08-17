const chai = require("chai");
const { expect } = require("chai");
const { utils, BigNumber } = require("ethers");
const { solidity } = require("ethereum-waffle");
const { roles, setRole, resetRoles } = require("./utils/roles.utils");
const { getTimeStamp } = require("./utils/time.utils");
const { generateProofData } = require("./utils/issuer.utils");
const { deployGreenproof } = require("../deploy/deployContracts");
const { initMockClaimManager } = require("./utils/claimUtils/claimManager.utils");
const { initMockClaimRevoker } = require("./utils/claimUtils/claimRevocation.utils");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { getSelectorsFromFacet } = require("../scripts/deploy/libraries/greenproof");


const revokablePeriod = 60 * 60 * 24;

describe("Admin Functionalilties", () => {

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
    
    const claimManagerConfig = {
      claimManagerMocked,
      claimsRevocationRegistryMocked,
    }

    grantRole = async (wallet, role) => {
      await setRole(claimManagerConfig, wallet.address, role, "active");
    };

    revokeRole = async (wallet, role) => {
      await setRole(claimManagerConfig, wallet.address, role, "active");
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

    const adminContract = await ethers.getContractAt(
      "AdminFacet",
      greenproofAddress
    );

    const proofData = generateProofData();

    await resetRoles(claimManagerConfig);
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
      adminContract,
      issuerContract,
      votingContract,
      metatokenContract,
      proofManagerContract,
      greenproofAddress,
      claimManagerMocked,
      claimsRevocationRegistryMocked,
    };
  };

  it("should revert when non admin tries to declare one single admin function", async () => {
    const {
      claimer,
      adminContract,
    } = await loadFixture(initFixture);

    const IssuerSelectors = await getSelectorsFromFacet("IssuerFacet");

    await expect(
      adminContract
        .connect(claimer)
        .declareSingleAdminFunction(IssuerSelectors[ 0 ]))
        .to.be.revertedWith(`NotAuthorized("Owner", "${claimer.address}")`);
  });

  it("should revert when admin adds an already declared admin function", async () => {
    const {
      adminContract,
    } = await loadFixture(initFixture);

    const adminSelectors = await getSelectorsFromFacet("AdminFacet");

    await expect(
      adminContract
        .declareSingleAdminFunction(adminSelectors[ 0 ]))
        .to.be.revertedWith(`ProxyError("Admin function already set")`);
  });

  it("should revert when non admin tries to declare several (Batch) admin functions", async () => {
    const {
      claimer,
      adminContract,
    } = await loadFixture(initFixture);

    const IssuerSelectors = await getSelectorsFromFacet("IssuerFacet");

    await expect(
      adminContract
        .connect(claimer)
        .declareBatchAdminFunctions(IssuerSelectors))
      .to.be.revertedWith(`NotAuthorized("Owner", "${claimer.address}")`);
  });

  it("should revert when admin tries to declare empty list of admin functions", async () => {
    const {
      adminContract,
    } = await loadFixture(initFixture);

    const emptyListOfFunctions = [];

    await expect(
      adminContract
        .declareBatchAdminFunctions(emptyListOfFunctions))
      .to.be.revertedWith(`ProxyError("Admin functions: Empty list")`);
  });
  
  it("should revert when admin tries to remove empty list of admin functions", async () => {
    const {
      adminContract,
    } = await loadFixture(initFixture);

    const emptyListOfFunctions = [];

    await expect(
      adminContract
        .removeBatchAdminFunctions(emptyListOfFunctions))
      .to.be.revertedWith(`ProxyError("Admin functions: Empty list")`);
  });

  it("should correctly declare a single admin function", async () => {
    const {
      adminContract,
    } = await loadFixture(initFixture);

    const adminSelectors = await getSelectorsFromFacet("IssuerFacet");

    const declareTx = await adminContract.declareSingleAdminFunction(adminSelectors[ 0 ])

    await expect(declareTx)
      .to.emit(adminContract, "AdminFunctionDeclared")
      .withArgs(adminSelectors[ 0 ], await getTimeStamp(declareTx));
  });
  
  it("should correctly declare a list (batch) of admin functions", async () => {
    const {
      adminContract,
    } = await loadFixture(initFixture);

    const adminSelectors = await getSelectorsFromFacet("IssuerFacet");

    const declareTx = await adminContract.declareBatchAdminFunctions(adminSelectors);

    await expect(declareTx).to.emit(adminContract, "AdminFunctionsDeclared")
      // .withArgs(adminSelectors, await getTimeStamp(declareTx)); <-- a bug in the waffle lib prevents indexed dynamic arrays from being corrctly catched
  });
  
  it("should revert when non admin tries to remove one single admin function", async () => {
    const {
      claimer,
      adminContract,
    } = await loadFixture(initFixture);

    const adminSelectors = await getSelectorsFromFacet("AdminFacet");

    await expect(
      adminContract
        .connect(claimer)
        .removeSingleAdminFunction(adminSelectors[ 0 ]))
        .to.be.revertedWith(`NotAuthorized("Owner", "${claimer.address}")`);
  });

  it("should revert when admin removes a not declared admin function", async () => {
    const {
      adminContract,
    } = await loadFixture(initFixture);

    const issuerSelectors = await getSelectorsFromFacet("IssuerFacet");

    await expect(
      adminContract
        .removeSingleAdminFunction(issuerSelectors[ 0 ]))
        .to.be.revertedWith(`ProxyError("Admin function already set")`);
  });

  it("should revert when non admin tries to remove several (Batch) admin functions", async () => {
    const {
      claimer,
      adminContract,
    } = await loadFixture(initFixture);

    const IssuerSelectors = await getSelectorsFromFacet("IssuerFacet");

    await expect(
      adminContract
        .connect(claimer)
        .removeBatchAdminFunctions(IssuerSelectors))
      .to.be.revertedWith(`NotAuthorized("Owner", "${claimer.address}")`);
  });

  it("should revert when admin tries to remove admin functions from an empty list", async () => {
    const {
      adminContract,
    } = await loadFixture(initFixture);

    const emptyListOfFunctions = [];

    await expect(
      adminContract
        .removeBatchAdminFunctions(emptyListOfFunctions))
      .to.be.revertedWith(`ProxyError("Admin functions: Empty list")`);
  });

  it("should correctly remove a single admin function", async () => {
    const {
      adminContract,
    } = await loadFixture(initFixture);

    const adminSelectors = await getSelectorsFromFacet("AdminFacet");

    const declareTx = await adminContract.removeSingleAdminFunction(adminSelectors[ 0 ])

    await expect(declareTx)
      .to.emit(adminContract, "AdminFunctionDiscarded")
      .withArgs(adminSelectors[ 0 ], await getTimeStamp(declareTx));
  });
  
  it("should correctly remove a list (batch) of admin functions", async () => {
    const {
      adminContract,
    } = await loadFixture(initFixture);

    const adminSelectors = await getSelectorsFromFacet("AdminFacet");

    const declareTx = await adminContract.removeBatchAdminFunctions(adminSelectors);

    await expect(declareTx).to.emit(adminContract, "AdminFunctionsDiscarded")
      // .withArgs(adminSelectors, await getTimeStamp(declareTx)); <-- a bug in the waffle lib prevents indexed dynamic arrays from being corrctly catched
  });
});