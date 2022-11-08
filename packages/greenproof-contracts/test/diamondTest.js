/* global describe it before ethers */

const { deployDiamond } = require("../scripts/deploy/deploy");
const {
  getSelectors,
  FacetCutAction,
  removeSelectors,
  findIndexOfAddressInFacets,
} = require("../scripts/deploy");

const { deployMockContract, solidity } = require("ethereum-waffle");

const { BigNumber } = require("ethers");

const { ethers } = require("hardhat");

const { assert, expect } = require("chai");

const { claimManagerInterface, claimRevocationInterface } = require("./utils");

const chai = require("chai");

const issuerRole = ethers.utils.namehash(
  "minter.roles.greenproof.apps.iam.ewc"
);
const revokerRole = ethers.utils.namehash(
  "revoker.roles.greenproof.apps.iam.ewc"
);
const workerRole = ethers.utils.namehash(
  "workerRole.roles.greenproof.apps.iam.ewc"
);

const roles = {
  issuerRole,
  revokerRole,
  workerRole,
};

chai.use(solidity);

describe("DiamondTest", async function () {
  let diamondAddress;
  let diamond;
  let issuerFacet;
  let tx;
  let receipt;
  let owner;
  let claimManagerMocked;
  let claimsRevocationRegistryMocked;
  const addresses = [];

  before(async function () {
    [owner] = await ethers.getSigners();

    //  Mocking claimManager
    claimManagerMocked = await deployMockContract(owner, claimManagerInterface);
    //  Mocking claimsRevocationRegistry
    claimsRevocationRegistryMocked = await deployMockContract(
      owner,
      claimRevocationInterface
    );

    ({ diamondAddress } = await deployDiamond({
      claimManagerAddress: claimManagerMocked.address,
      claimRevocationRegistryAddress: claimsRevocationRegistryMocked.address,
      roles,
      facets: ["IssuerFacet"],
    }));

    diamond = await ethers.getContractAt("Diamond", diamondAddress);
    issuerFacet = await ethers.getContractAt("IssuerFacet", diamondAddress);
  });

  describe("\n****** Deployement failure tests ******\n", () => {
    it("should revert if admin address is 0", async () => {
      await expect(
        deployDiamond({
          claimManagerAddress: claimManagerMocked.address,
          claimRevocationRegistryAddress:
            claimsRevocationRegistryMocked.address,
          roles,
          contractOwner: ethers.constants.AddressZero,
        })
      ).to.be.revertedWith("init: Invalid contract Owner");
    });

    it("should revert if claimManager address is 0", async () => {
      await expect(
        deployDiamond({
          claimManagerAddress: ethers.constants.AddressZero,
          claimRevocationRegistryAddress:
            claimsRevocationRegistryMocked.address,
          roles,
        })
      ).to.be.revertedWith("init: Invalid claimManager");
    });

    it("should revert if claimsRevocationRegistry address is 0", async () => {
      await expect(
        deployDiamond({
          claimManagerAddress: claimManagerMocked.address,
          claimRevocationRegistryAddress: ethers.constants.AddressZero,
        })
      ).to.be.revertedWith("init: Invalid claimsRevocationRegistry");
    });

    it("should revert if rewardAmount is to 0", async () => {
      const zeroRewardAmount = BigNumber.from(0);

      await expect(
        deployDiamond({
          rewardAmount: zeroRewardAmount,
          claimManagerAddress: claimManagerMocked.address,
          claimRevocationRegistryAddress:
            claimsRevocationRegistryMocked.address,
          roles,
        })
      ).to.be.revertedWith("init: Null reward amount");
    });

    it("should revert if revocable Period is 0", async () => {
      const zeroRevocablePeriod = 0;
      const contractOwner = ethers.getSigners()[0];

      await expect(
        deployDiamond({
          claimManagerAddress: claimManagerMocked.address,
          claimRevocationRegistryAddress:
            claimsRevocationRegistryMocked.address,
          roles,
          contractOwner,
          revocablePeriod: zeroRevocablePeriod,
        })
      ).to.be.revertedWith("init: Invalid revocable period");
    });
  });

  describe("\n****** Proxy setting tests ******", () => {
    it("should have four facets -- call to facetAddresses function", async () => {
      for (const address of await diamond.facetAddresses()) {
        addresses.push(address);
      }

      assert.equal(addresses.length, 2); // SolidState https://github.com/solidstate-network/solidstate-solidity/blob/e9f741cb1476a066ce92d39600a82dc1c9e06b7d/contracts/proxy/diamond/SolidStateDiamond.sol#L72 and Issuer facets
    });

    it("facets should have the right function selectors -- call to facetFunctionSelectors function", async () => {
      const expectedIssuerSelectors = getSelectors(issuerFacet);
      const issuerSelectors = await diamond.facetFunctionSelectors(
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
        await diamond.facetAddress(requestProofIssuanceSelector)
      );

      const discloseDataSelector = issuerFacet.interface.getSighash(
        "discloseData(string,string,bytes32[],bytes32)"
      );
      assert.equal(
        addresses[1],
        await diamond.facetAddress(discloseDataSelector)
      );
    });

    it("should add test1 functions", async () => {
      const Test1Facet = await ethers.getContractFactory("Test1Facet");
      const test1Facet = await Test1Facet.deploy();
      await test1Facet.deployed();
      addresses.push(test1Facet.address);
      const expectedSelectors = getSelectors(test1Facet);

      tx = await diamond.diamondCut(
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
      const selectors = await diamond.facetFunctionSelectors(
        test1Facet.address
      );
      assert.sameMembers(selectors, expectedSelectors);
    });

    it("should test function call", async () => {
      const test1Facet = await ethers.getContractAt(
        "Test1Facet",
        diamondAddress
      );
      await test1Facet.test1Func10();
    });

    it("should add test2 functions", async () => {
      const Test2Facet = await ethers.getContractFactory("Test2Facet");
      const test2Facet = await Test2Facet.deploy();
      await test2Facet.deployed();
      addresses.push(test2Facet.address);
      const selectors = getSelectors(test2Facet);
      tx = await diamond.diamondCut(
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
        await diamond.facetFunctionSelectors(test2Facet.address),
        selectors
      );
    });

    it("should remove some test2 functions", async () => {
      const test2Facet = await ethers.getContractAt(
        "Test2Facet",
        diamondAddress
      );
      const functionsToKeep = [
        "test2Func1()",
        "test2Func5()",
        "test2Func6()",
        "test2Func19()",
        "test2Func20()",
      ];
      const selectors = getSelectors(test2Facet).remove(functionsToKeep);
      tx = await diamond.diamondCut(
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
        await diamond.facetFunctionSelectors(addresses[3]),
        getSelectors(test2Facet).get(functionsToKeep)
      );
    });

    it("should remove some test1 functions", async () => {
      const test1Facet = await ethers.getContractAt(
        "Test1Facet",
        diamondAddress
      );
      const functionsToKeep = [
        "test1Func2()",
        "test1Func11()",
        "test1Func12()",
      ];
      const selectors = getSelectors(test1Facet).remove(functionsToKeep);
      tx = await diamond.diamondCut(
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
        await diamond.facetFunctionSelectors(addresses[2]),
        getSelectors(test1Facet).get(functionsToKeep)
      );
    });

    it("remove all functions from all mutable facets", async () => {
      let selectors = [];
      let [, ...facets] = await diamond.facets();
      for (let i = 0; i < facets.length; i++) {
        selectors.push(...facets[i].selectors);
      }
      selectors = removeSelectors(selectors, [
        "facets()",
        "diamondCut(tuple(address,uint8,bytes4[])[],address,bytes)",
      ]);
      tx = await diamond.diamondCut(
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
      facets = await diamond.facets();
      assert.equal(facets.length, 1); // SolidState facet
      const diamondCutSelector = diamond.interface.getSighash(
        "diamondCut((address,uint8,bytes4[])[],address,bytes)"
      );
      const facetsSelector = diamond.interface.getSighash("facets()");
      assert.equal(facets[0][0], addresses[0]);
      assert.includeMembers(facets[0][1], [diamondCutSelector, facetsSelector]);
    });

    it("add most functions and facets", async () => {
      // const diamondLoupeFacetSelectors = getSelectors(diamondLoupeFacet);
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
      tx = await diamond.diamondCut(cut, ethers.constants.AddressZero, "0x", {
        gasLimit: 8000000,
      });
      receipt = await tx.wait();
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`);
      }
      const facets = await diamond.facets();
      const facetAddresses = await diamond.facetAddresses();
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
