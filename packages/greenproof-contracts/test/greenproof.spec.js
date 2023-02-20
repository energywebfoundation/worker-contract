const {
  getSelectors,
  FacetCutAction,
  removeSelectors,
  findIndexOfAddressInFacets,
} = require("../scripts/deploy");
const { solidity } = require("ethereum-waffle");
const { ethers } = require("hardhat");
const { assert, expect, util } = require("chai");
const chai = require("chai");

const { roles } = require("./utils/roles.utils");
const { deployGreenproof } = require("../scripts/deploy/deployContracts");
const { initMockClaimManager } = require("./utils/claimManager.utils");
const { initMockClaimRevoker } = require("./utils/claimRevocation.utils");

chai.use(solidity);

describe("GreenproofTest", async function () {
  let greenproofAddress;
  let greenproof;
  let issuerFacet;
  let tx;
  let receipt;
  let owner;
  let nonOwner;
  let claimManagerMocked;
  let claimsRevocationRegistryMocked;
  const addresses = [];

  before(async function () {
    [owner, nonOwner] = await ethers.getSigners();

    claimManagerMocked = await initMockClaimManager(owner);
    claimsRevocationRegistryMocked = await initMockClaimRevoker(owner);

    ({ greenproofAddress } = await deployGreenproof({
      claimManagerAddress: claimManagerMocked.address,
      claimRevokerAddress: claimsRevocationRegistryMocked.address,
      roles,
      facets: ["IssuerFacet"],
    }));

    greenproof = await ethers.getContractAt("Greenproof", greenproofAddress);
    issuerFacet = await ethers.getContractAt("IssuerFacet", greenproofAddress);
  });

  describe("\n****** Deployement failure tests ******\n", () => {
    it("should revert if admin address is 0", async () => {
      await expect(
        deployGreenproof({
          claimManagerAddress: claimManagerMocked.address,
          claimRevokerAddress: claimsRevocationRegistryMocked.address,
          roles,
          contractOwner: ethers.constants.AddressZero,
        })
      ).to.be.revertedWith("init: Invalid contract Owner");
    });

    it("should revert if claimManager address is 0", async () => {
      await expect(
        deployGreenproof({
          claimManagerAddress: ethers.constants.AddressZero,
          claimRevokerAddress: claimsRevocationRegistryMocked.address,
          roles,
        })
      ).to.be.revertedWith("init: Invalid claimManager");
    });

    it("should revert if claimsRevocationRegistry address is 0", async () => {
      await expect(
        deployGreenproof({
          claimManagerAddress: claimManagerMocked.address,
          claimRevokerAddress: ethers.constants.AddressZero,
        })
      ).to.be.revertedWith("init: Invalid claimsRevocationRegistry");
    });

    it("should revert if revocable Period is 0", async () => {
      const zeroRevocablePeriod = 0;
      const contractOwner = (await ethers.getSigners())[0];

      await expect(
        deployGreenproof({
          claimManagerAddress: claimManagerMocked.address,
          claimRevokerAddress: claimsRevocationRegistryMocked.address,
          roles,
          contractOwner: contractOwner.address,
          revocablePeriod: zeroRevocablePeriod,
        })
      ).to.be.revertedWith("init: Invalid revocable period");
    });

    it("Greenproof should not be initialized with 0 reward amount", async () => {
      const contractOwner = (await ethers.getSigners())[ 0 ];

      await expect(
        deployGreenproof({
          claimManagerAddress: claimManagerMocked.address,
          claimRevokerAddress: claimsRevocationRegistryMocked.address,
          roles,
          contractOwner: contractOwner.address,
          rewardAmount: ethers.constants.Zero
        })
      ).to.be.revertedWith("init: Null reward amount");
    });

    it("should revert if majority percentage is above 100", async () => {
      const contractOwner = (await ethers.getSigners())[0];

      await expect(
        deployGreenproof({
          claimManagerAddress: claimManagerMocked.address,
          claimRevokerAddress: claimsRevocationRegistryMocked.address,
          roles,
          contractOwner: contractOwner.address,
          majorityPercentage: 101
        })
      ).to.be.revertedWith("init: Majority percentage must be between 0 and 100");
    })
  });

  describe("Proxy roles updates tests", () => {

    describe("- ClaimManagerAddress update tests", () => {
      it("should revert when updating claimManager with Zero address", async () => {
        const zeroAddress = ethers.constants.AddressZero;
        await expect(greenproof.updateClaimManager(zeroAddress))
          .to.be.revertedWith("Cannot update to null address");
      });

      it("should revert when updating claimManager with same address", async () => {
        await expect(greenproof.updateClaimManager(claimManagerMocked.address))
          .to.be.revertedWith("Same address");
      });

      it("should revert when non owner tries to update claimManager Address", async () => {
        const newClaimManagerAddress = "0x43a7aEeb21C0dFE55d967d7A58B2Dfe6AEA50d7f";
        
        await expect(
          greenproof.connect(nonOwner).updateClaimManager(newClaimManagerAddress)
        ).to.be.revertedWith(`NotAuthorized("Owner")`);
      });

      it("should update claimManager Address", async () => {
        const oldClaimManagerAddress = claimManagerMocked.address;
        const newClaimManagerAddress = "0x43a7aEeb21C0dFE55d967d7A58B2Dfe6AEA50d7f";
        
        await expect(greenproof.updateClaimManager(newClaimManagerAddress))
          .to.emit(greenproof, "ClaimManagerUpdated").withArgs(oldClaimManagerAddress, newClaimManagerAddress);
      });

    });

    describe("- ClaimRevocationRegistry update tests", () => {
      it("should revert when updating ClaimRevocationRegistry with Zero address", async () => {
        const zeroAddress = ethers.constants.AddressZero;
        await expect(greenproof.updateClaimRevocationRegistry(zeroAddress))
          .to.be.revertedWith("Revocation Registry: null address");
      });

      it("should revert when updating ClaimRevocationRegistry with same address", async () => {
        await expect(greenproof.updateClaimRevocationRegistry(claimsRevocationRegistryMocked.address))
          .to.be.revertedWith("Revocation Registry: Same address");
      });

      it("should revert when non owner tries to update ClaimRevocationRegistry Address", async () => {
        const newRevocationregistry = "0x43a7aEeb21C0dFE55d967d7A58B2Dfe6AEA50d7f";
        
        await expect(
          greenproof.connect(nonOwner).updateClaimRevocationRegistry(newRevocationregistry)
        ).to.be.revertedWith(`NotAuthorized("Owner")`);
      });

      it("should update ClaimRevocationRegistry Address", async () => {
        const oldRevocationregistry = claimsRevocationRegistryMocked.address;
        const newRevocationregistry = "0x43a7aEeb21C0dFE55d967d7A58B2Dfe6AEA50d7f";
        
        await expect(greenproof.updateClaimRevocationRegistry(newRevocationregistry))
          .to.emit(greenproof, "ClaimsRevocationRegistryUpdated").withArgs(oldRevocationregistry, newRevocationregistry);
      });

    });

    describe("- ClaimerRole update tests", () => {
      it("should revert when updating claimerRole version with same version", async () => {
        const sameRoleVersion = 1;
        await expect(greenproof.updateClaimerVersion(sameRoleVersion))
          .to.be.revertedWith("Same version");
      });

      it("should revert when non owner tries to update claimerRole version", async () => {
        const newRoleVersion = 2;
        
        await expect(
          greenproof.connect(nonOwner).updateClaimerVersion(newRoleVersion)
        ).to.be.revertedWith(`NotAuthorized("Owner")`);
      });

      it("should update claimerRole version", async () => {
        const oldRoleVersion = 1;
        const newRoleVersion = 2;
        
        await expect(greenproof.updateClaimerVersion(newRoleVersion))
          .to.emit(greenproof, "ClaimerVersionUpdated").withArgs(oldRoleVersion, newRoleVersion);
      });

    });

    describe("- workerRole update tests", () => {
      it("should revert when updating workerRole version with same version", async () => {
        const sameRoleVersion = 1;
        await expect(greenproof.updateWorkerVersion(sameRoleVersion))
          .to.be.revertedWith("Same version");
      });

      it("should revert when non owner tries to update workerRole version", async () => {
        const newRoleVersion = 2;
        
        await expect(
          greenproof.connect(nonOwner).updateWorkerVersion(newRoleVersion)
        ).to.be.revertedWith(`NotAuthorized("Owner")`);
      });

      it("should update workerRole version", async () => {
        const oldRoleVersion = 1;
        const newRoleVersion = 2;
        
        await expect(greenproof.updateWorkerVersion(newRoleVersion))
          .to.emit(greenproof, "WorkerVersionUpdated").withArgs(oldRoleVersion, newRoleVersion);
      });

    });

    describe("- RevokerRole update tests", () => {
      it("should revert when updating revokerRole version with same version", async () => {
        const sameRoleVersion = 1;
        await expect(greenproof.updateRevokerVersion(sameRoleVersion))
          .to.be.revertedWith("Same version");
      });

      it("should revert when non owner tries to update revokerRole version", async () => {
        const newRoleVersion = 2;
        
        await expect(
          greenproof.connect(nonOwner).updateRevokerVersion(newRoleVersion)
        ).to.be.revertedWith(`NotAuthorized("Owner")`);
      });

      it("should update revokerRole version", async () => {
        const oldRoleVersion = 1;
        const newRoleVersion = 2;
        
        await expect(greenproof.updateRevokerVersion(newRoleVersion))
          .to.emit(greenproof, "RevokerVersionUpdated").withArgs(oldRoleVersion, newRoleVersion);
      });

    });

    describe("- IssuerRole update tests", () => {
      it("should revert when updating IssuerRole version with same version", async () => {
        const sameRoleVersion = 1;
        await expect(greenproof.updateIssuerVersion(sameRoleVersion))
          .to.be.revertedWith("Same version");
      });

      it("should revert when non owner tries to update IssuerRole version", async () => {
        const newRoleVersion = 2;
        
        await expect(
          greenproof.connect(nonOwner).updateIssuerVersion(newRoleVersion)
        ).to.be.revertedWith(`NotAuthorized("Owner")`);
      });

      it("should update IssuerRole version", async () => {
        const oldRoleVersion = 1;
        const newRoleVersion = 2;
        
        await expect(greenproof.updateIssuerVersion(newRoleVersion))
          .to.emit(greenproof, "IssuerVersionUpdated").withArgs(oldRoleVersion, newRoleVersion);
      });

    });
    
    describe("- ApproverRole update tests", () => {
      it("should revert when updating approverRole version with same version", async () => {
        const sameRoleVersion = 1;
        await expect(greenproof.updateApproverVersion(sameRoleVersion))
          .to.be.revertedWith("Same version");
      });

      it("should revert when non owner tries to update approverRole version", async () => {
        const newRoleVersion = 2;
        
        await expect(
          greenproof.connect(nonOwner).updateApproverVersion(newRoleVersion)
        ).to.be.revertedWith(`NotAuthorized("Owner")`);
      });

      it("should update approverRole version", async () => {
        const oldRoleVersion = 1;
        const newRoleVersion = 2;
        
        await expect(greenproof.updateApproverVersion(newRoleVersion))
          .to.emit(greenproof, "ApproverVersionUpdated").withArgs(oldRoleVersion, newRoleVersion);
      });

    });

    describe("- TransferRole update tests", () => {
      it("should revert when updating transferRole version with same version", async () => {
        const sameRoleVersion = 1;
        await expect(greenproof.updateTransferVersion(sameRoleVersion))
          .to.be.revertedWith("Same version");
      });

      it("should revert when non owner tries to update transferRole version", async () => {
        const newRoleVersion = 2;
        
        await expect(
          greenproof.connect(nonOwner).updateTransferVersion(newRoleVersion)
        ).to.be.revertedWith(`NotAuthorized("Owner")`);
      });

      it("should update transferRole version", async () => {
        const oldRoleVersion = 1;
        const newRoleVersion = 2;
        
        await expect(greenproof.updateTransferVersion(newRoleVersion))
          .to.emit(greenproof, "TransferVersionUpdated").withArgs(oldRoleVersion, newRoleVersion);
      });

    });
  })

  describe("\n****** Proxy setting tests ******", () => {
    it("should have four facets -- call to facetAddresses function", async () => {
      for (const address of await greenproof.facetAddresses()) {
        addresses.push(address);
      }

      assert.equal(addresses.length, 2); // SolidState https://github.com/solidstate-network/solidstate-solidity/blob/e9f741cb1476a066ce92d39600a82dc1c9e06b7d/contracts/proxy/diamond/SolidStategreenproof.sol#L72 and Issuer facets
    });

    it("facets should have the right function selectors -- call to facetFunctionSelectors function", async () => {
      const expectedIssuerSelectors = getSelectors(issuerFacet);
      const issuerSelectors = await greenproof.facetFunctionSelectors(
        addresses[1]
      );
      assert.sameMembers(issuerSelectors, expectedIssuerSelectors);
    });

    it("selectors should be associated to facets correctly -- multiple calls to facetAddress function", async () => {
      const requestProofIssuanceSelector = issuerFacet.interface.getSighash(
        "requestProofIssuance(bytes32,address,bytes32,bytes32[],uint256,bytes32[],string)"
      );
      assert.equal(
        addresses[1],
        await greenproof.facetAddress(requestProofIssuanceSelector)
      );

      const discloseDataSelector = issuerFacet.interface.getSighash(
        "discloseData(string,string,bytes32[],bytes32)"
      );
      assert.equal(
        addresses[1],
        await greenproof.facetAddress(discloseDataSelector)
      );
    });

    it("should add test1 functions", async () => {
      const Test1Facet = await ethers.getContractFactory("Test1Facet");
      const test1Facet = await Test1Facet.deploy();
      await test1Facet.deployed();
      addresses.push(test1Facet.address);
      const expectedSelectors = getSelectors(test1Facet);

      tx = await greenproof.diamondCut(
        [
          {
            target: test1Facet.address,
            action: FacetCutAction.Add,
            selectors: expectedSelectors,
          },
        ],
        ethers.constants.AddressZero,
        "0x",
        { gasLimit: 800000 }
      );
      receipt = await tx.wait();
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`);
      }
      const selectors = await greenproof.facetFunctionSelectors(
        test1Facet.address
      );
      assert.sameMembers(selectors, expectedSelectors);
    });

    it("should test function calls", async () => {
      const test1Facet = await ethers.getContractAt(
        "Test1Facet",
        greenproofAddress
      );
      await test1Facet.test1Func1();
      await test1Facet.test1Func2();
      await test1Facet.test1Func3();
      await test1Facet.test1Func4();
      await test1Facet.test1Func5();
      await test1Facet.test1Func6();
      await test1Facet.test1Func7();
      await test1Facet.test1Func8();
      await test1Facet.test1Func9();
      await test1Facet.test1Func10();
      await test1Facet.test1Func11();
      await test1Facet.test1Func12();
      await test1Facet.test1Func13();
      await test1Facet.test1Func14();
      await test1Facet.test1Func15();
      await test1Facet.test1Func16();
      await test1Facet.test1Func17();
      await test1Facet.test1Func18();
      await test1Facet.test1Func19();
      await test1Facet.test1Func20();
      await test1Facet.isInterfaceSupported("0x43a7aEeb");
    });

    it("should add test2 functions", async () => {
      const Test2Facet = await ethers.getContractFactory("Test2Facet");
      const test2Facet = await Test2Facet.deploy();
      await test2Facet.deployed();
      addresses.push(test2Facet.address);
      const selectors = getSelectors(test2Facet);
      tx = await greenproof.diamondCut(
        [
          {
            target: test2Facet.address,
            action: FacetCutAction.Add,
            selectors,
          },
        ],
        ethers.constants.AddressZero,
        "0x",
        { gasLimit: 800000 }
      );
      receipt = await tx.wait();
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`);
      }
      assert.sameMembers(
        await greenproof.facetFunctionSelectors(test2Facet.address),
        selectors
      );

      await test2Facet.test2Func1();
      await test2Facet.test2Func2();
      await test2Facet.test2Func3();
      await test2Facet.test2Func4();
      await test2Facet.test2Func5();
      await test2Facet.test2Func6();
      await test2Facet.test2Func7();
      await test2Facet.test2Func8();
      await test2Facet.test2Func9();
      await test2Facet.test2Func10();
      await test2Facet.test2Func11();
      await test2Facet.test2Func12();
      await test2Facet.test2Func13();
      await test2Facet.test2Func14();
      await test2Facet.test2Func15();
      await test2Facet.test2Func16();
      await test2Facet.test2Func17();
      await test2Facet.test2Func18();
      await test2Facet.test2Func19();
      await test2Facet.test2Func20();
    });

    it("should remove some test2 functions", async () => {
      const test2Facet = await ethers.getContractAt(
        "Test2Facet",
        greenproofAddress
      );
      const functionsToKeep = [
        "test2Func1()",
        "test2Func5()",
        "test2Func6()",
        "test2Func19()",
        "test2Func20()",
      ];
      const selectors = getSelectors(test2Facet).remove(functionsToKeep);
      tx = await greenproof.diamondCut(
        [
          {
            target: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            selectors,
          },
        ],
        ethers.constants.AddressZero,
        "0x",
        { gasLimit: 800000 }
      );
      receipt = await tx.wait();
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`);
      }
      assert.sameMembers(
        await greenproof.facetFunctionSelectors(addresses[3]),
        getSelectors(test2Facet).get(functionsToKeep)
      );
    });

    it("should remove some test1 functions", async () => {
      const test1Facet = await ethers.getContractAt(
        "Test1Facet",
        greenproofAddress
      );
      const functionsToKeep = [
        "test1Func2()",
        "test1Func11()",
        "test1Func12()",
      ];
      const selectors = getSelectors(test1Facet).remove(functionsToKeep);
      tx = await greenproof.diamondCut(
        [
          {
            target: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            selectors,
          },
        ],
        ethers.constants.AddressZero,
        "0x",
        { gasLimit: 800000 }
      );
      receipt = await tx.wait();
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`);
      }
      assert.sameMembers(
        await greenproof.facetFunctionSelectors(addresses[2]),
        getSelectors(test1Facet).get(functionsToKeep)
      );
    });

    it("remove all functions from all mutable facets", async () => {
      let selectors = [];
      let [, ...facets] = await greenproof.facets();
      for (let i = 0; i < facets.length; i++) {
        selectors.push(...facets[i].selectors);
      }
      selectors = removeSelectors(selectors, [
        "facets()",
        "diamondCut(tuple(address,uint8,bytes4[])[],address,bytes)",
      ]);
      tx = await greenproof.diamondCut(
        [
          {
            target: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            selectors: selectors,
          },
        ],
        ethers.constants.AddressZero,
        "0x",
        { gasLimit: 800000 }
      );
      receipt = await tx.wait();
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`);
      }
      facets = await greenproof.facets();
      assert.equal(facets.length, 1); // SolidState facet
      const diamondCutSelector = greenproof.interface.getSighash(
        "diamondCut((address,uint8,bytes4[])[],address,bytes)"
      );
      const facetsSelector = greenproof.interface.getSighash("facets()");
      assert.equal(facets[0][0], addresses[0]);
      assert.includeMembers(facets[0][1], [diamondCutSelector, facetsSelector]);
    });

    it("add most functions and facets", async () => {
      const IssuerFacet = await ethers.getContractFactory("IssuerFacet");
      const Test1Facet = await ethers.getContractFactory("Test1Facet");
      const Test2Facet = await ethers.getContractFactory("Test2Facet");
      // Any number of functions from any number of facets can be added/replaced/removed in a
      // single transaction
      const cut = [
        {
          target: addresses[1],
          action: FacetCutAction.Add,
          selectors: getSelectors(IssuerFacet),
        },
        {
          target: addresses[2],
          action: FacetCutAction.Add,
          selectors: getSelectors(Test1Facet),
        },
        {
          target: addresses[3],
          action: FacetCutAction.Add,
          selectors: getSelectors(Test2Facet),
        },
      ];
      tx = await greenproof.diamondCut(
        cut,
        ethers.constants.AddressZero,
        "0x",
        {
          gasLimit: 8000000,
        }
      );
      receipt = await tx.wait();
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`);
      }
      const facets = await greenproof.facets();
      const facetAddresses = await greenproof.facetAddresses();
      assert.equal(facetAddresses.length, 4);
      assert.equal(facets.length, 4);
      assert.sameMembers(facetAddresses, addresses);
      assert.equal(facets[0][0], facetAddresses[0], "first facet");
      assert.equal(facets[1][0], facetAddresses[1], "second facet");
      assert.equal(facets[2][0], facetAddresses[2], "third facet");
      assert.equal(facets[3][0], facetAddresses[3], "fourth facet");
      assert.sameMembers(
        facets[findIndexOfAddressInFacets(addresses[1], facets)][1],
        getSelectors(IssuerFacet)
      );
      assert.sameMembers(
        facets[findIndexOfAddressInFacets(addresses[2], facets)][1],
        getSelectors(Test1Facet)
      );
      assert.sameMembers(
        facets[findIndexOfAddressInFacets(addresses[3], facets)][1],
        getSelectors(Test2Facet)
      );
    });
  });
});
