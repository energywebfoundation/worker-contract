/* global describe it before ethers */

const {
  getSelectors,
  FacetCutAction,
  removeSelectors,
  findIndexOfAddressInFacets,
  deployDiamond,
} = require("../scripts/deploy");

const { deployMockContract, solidity } = require("ethereum-waffle");

const { BigNumber } = require('ethers');

const { ethers } = require('hardhat')

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
  let diamondCutFacet;
  let diamondLoupeFacet;
  let ownershipFacet;
  let issuerFacet;
  let tx;
  let receipt;
  let result;
  let owner;
  let claimManagerMocked;
  let claimsRevocationRegistryMocked;
  const addresses = [];


  before(async function () {
    [owner] = await ethers.getSigners();
  
    //  Mocking claimManager
    claimManagerMocked = await deployMockContract(
      owner,
      claimManagerInterface
    );
//  Mocking claimsRevocationRegistry
    claimsRevocationRegistryMocked = await deployMockContract(
      owner,
      claimRevocationInterface
    );

    ({ diamondAddress } = await deployDiamond({
      claimManagerAddress: claimManagerMocked.address,claimsRevocationRegistryMocked.address,
      roles,
      facets: ['DiamondLoupeFacet', 'OwnershipFacet', 'IssuerFacet'],
    }))

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
    issuerFacet = await ethers.getContractAt(
      "IssuerFacet",
      diamondAddress
    );
  });

  describe("\n****** Deployement failure tests ******\n", () => {
    
    it("should revert if admin address is 0", async () => {
      
      await expect(
        deployDiamond({
          claimManagerAddress: claimManagerMocked.address,
          claimsRevocationRegistryMocked.address,
          roles,
          contractOwner: ethers.constants.AddressZero,
        }),
      ).to.be.revertedWith("init: Invalid contract Owner");
    });

    it("should revert if claimManager address is 0", async () => {

      await expect(
        deployDiamond({
          claimManagerAddress: ethers.constants.AddressZero,
          claimsRevocationRegistryMocked.address,
          roles,
        })
      ).to.be.revertedWith("init: Invalid claimManager");
    });

    it("should revert if claimsRevocationRegistry address is 0", async () => {

      await expect(
        deployDiamond(
          timeLimit,
          rewardAmount,
          claimManagerMocked.address,
          ethers.constants.AddressZero,
          roles,
          isDiamondTest,
        )
      ).to.be.revertedWith("init: Invalid claimsRevocationRegistry");
    });


    it("should revert if rewardAmount is to 0", async () => {
      const zeroRewardAmount = BigNumber.from(0);

      await expect(
        deployDiamond({
          rewardAmount: zeroRewardAmount,
         claimManagerAddress: claimManagerMocked.address,
          claimsRevocationRegistryMocked.address,
          roles,
        })
      ).to.be.revertedWith("init: Null reward amount");
    });

    it("should revert if revocable Period is 0", async () => {
      const zeroRevocablePeriod = 0;
      const contractOwner = ethers.getSigners()[ 0 ];

      await expect(
        deployDiamond({
          claimManagerAddress: claimManagerMocked.address,
          claimsRevocationRegistryMocked.address,
          roles,
          contractOwner,
          revocablePeriod: zeroRevocablePeriod,
        }),
      ).to.be.revertedWith("init: Invalid revocable period");
    });
  });

  describe("\n****** Proxy setting tests ******", () => {

    it('should have four facets -- call to facetAddresses function', async () => {
       for (const address of await diamondLoupeFacet.facetAddresses()) {
         addresses.push(address)
       }
   
       assert.equal(addresses.length, 4)
    });
   
    it('facets should have the right function selectors -- call to facetFunctionSelectors function', async () => {
       let selectors = getSelectors(diamondCutFacet)
       result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0])
       assert.sameMembers(result, selectors)
       selectors = getSelectors(diamondLoupeFacet)
       result = await diamondLoupeFacet.facetFunctionSelectors(addresses[1])
       assert.sameMembers(result, selectors)
       selectors = getSelectors(ownershipFacet)
       result = await diamondLoupeFacet.facetFunctionSelectors(addresses[2])
       assert.sameMembers(result, selectors)
    });
   
    it('selectors should be associated to facets correctly -- multiple calls to facetAddress function', async () => {
       assert.equal(
         addresses[0],
         await diamondLoupeFacet.facetAddress("0x1f931c1c")
       );
       assert.equal(
         addresses[1],
         await diamondLoupeFacet.facetAddress('0xcdffacc6')
       )
       assert.equal(
         addresses[3],
         await diamondLoupeFacet.facetAddress('0x01ffc9a7')
       )
       assert.equal(
         addresses[2],
         await diamondLoupeFacet.facetAddress('0xf2fde38b')
       )
    });
   
    it('should add test1 functions', async () => {
       const Test1Facet = await ethers.getContractFactory('Test1Facet')
       const test1Facet = await Test1Facet.deploy()
       await test1Facet.deployed()
       addresses.push(test1Facet.address)
       const selectors = getSelectors(test1Facet).remove(['supportsInterface(bytes4)'])

      tx = await diamondCutFacet.diamondCut(
         [{
           facetAddress: test1Facet.address,
           action: FacetCutAction.Add,
           functionSelectors: selectors
         }],
         ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
       receipt = await tx.wait()
       if (!receipt.status) {
         throw Error(`Diamond upgrade failed: ${tx.hash}`)
       }
       result = await diamondLoupeFacet.facetFunctionSelectors(test1Facet.address)
       assert.sameMembers(result, selectors)
    });
   
    it('should test function call', async () => {
       const test1Facet = await ethers.getContractAt('Test1Facet', diamondAddress)
       await test1Facet.test1Func10()
    });
   
    it('should replace supportsInterface function', async () => {
       const Test1Facet = await ethers.getContractFactory('Test1Facet')
       const selectors = getSelectors(Test1Facet).get(['supportsInterface(bytes4)'])
       const testFacetAddress = addresses[4]
       tx = await diamondCutFacet.diamondCut(
         [{
           facetAddress: testFacetAddress,
           action: FacetCutAction.Replace,
           functionSelectors: selectors
         }],
         ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
       receipt = await tx.wait()
       if (!receipt.status) {
         throw Error(`Diamond upgrade failed: ${tx.hash}`)
       }
       result = await diamondLoupeFacet.facetFunctionSelectors(testFacetAddress)
       assert.sameMembers(result, getSelectors(Test1Facet))
    });
   
    it('should add test2 functions', async () => {
       const Test2Facet = await ethers.getContractFactory('Test2Facet')
       const test2Facet = await Test2Facet.deploy()
       await test2Facet.deployed()
       addresses.push(test2Facet.address)
       const selectors = getSelectors(test2Facet)
       tx = await diamondCutFacet.diamondCut(
         [{
           facetAddress: test2Facet.address,
           action: FacetCutAction.Add,
           functionSelectors: selectors
         }],
         ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
       receipt = await tx.wait()
       if (!receipt.status) {
         throw Error(`Diamond upgrade failed: ${tx.hash}`)
       }
       result = await diamondLoupeFacet.facetFunctionSelectors(test2Facet.address)
       assert.sameMembers(result, selectors)
     })
   
    it('should remove some test2 functions', async () => {
       const test2Facet = await ethers.getContractAt('Test2Facet', diamondAddress)
       const functionsToKeep = ['test2Func1()', 'test2Func5()', 'test2Func6()', 'test2Func19()', 'test2Func20()']
       const selectors = getSelectors(test2Facet).remove(functionsToKeep)
       tx = await diamondCutFacet.diamondCut(
         [{
           facetAddress: ethers.constants.AddressZero,
           action: FacetCutAction.Remove,
           functionSelectors: selectors
         }],
         ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
       receipt = await tx.wait()
       if (!receipt.status) {
         throw Error(`Diamond upgrade failed: ${tx.hash}`)
       }
       result = await diamondLoupeFacet.facetFunctionSelectors(addresses[5])
       assert.sameMembers(result, getSelectors(test2Facet).get(functionsToKeep))
    });
   
    it('should remove some test1 functions', async () => {
       const test1Facet = await ethers.getContractAt('Test1Facet', diamondAddress)
       const functionsToKeep = ['test1Func2()', 'test1Func11()', 'test1Func12()']
       const selectors = getSelectors(test1Facet).remove(functionsToKeep)
       tx = await diamondCutFacet.diamondCut(
         [{
           facetAddress: ethers.constants.AddressZero,
           action: FacetCutAction.Remove,
           functionSelectors: selectors
         }],
         ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
       receipt = await tx.wait()
       if (!receipt.status) {
         throw Error(`Diamond upgrade failed: ${tx.hash}`)
       }
       result = await diamondLoupeFacet.facetFunctionSelectors(addresses[4])
       assert.sameMembers(result, getSelectors(test1Facet).get(functionsToKeep))
    });
   
    it('remove all functions and facets accept \'diamondCut\' and \'facets\'', async () => {
       let selectors = []
       let facets = await diamondLoupeFacet.facets()
       for (let i = 0; i < facets.length; i++) {
         selectors.push(...facets[i].functionSelectors)
       }
       selectors = removeSelectors(selectors, ['facets()', 'diamondCut(tuple(address,uint8,bytes4[])[],address,bytes)'])
       tx = await diamondCutFacet.diamondCut(
         [{
           facetAddress: ethers.constants.AddressZero,
           action: FacetCutAction.Remove,
           functionSelectors: selectors
         }],
         ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
       receipt = await tx.wait()
       if (!receipt.status) {
         throw Error(`Diamond upgrade failed: ${tx.hash}`)
       }
       facets = await diamondLoupeFacet.facets()
       assert.equal(facets.length, 2)
       assert.equal(facets[0][0], addresses[0])
       assert.sameMembers(facets[0][1], ['0x1f931c1c'])
       assert.equal(facets[1][0], addresses[1])
       assert.sameMembers(facets[1][1], ['0x7a0ed627'])
    });
   
    it('add most functions and facets', async () => {
       const diamondLoupeFacetSelectors = getSelectors(diamondLoupeFacet)//.remove(['supportsInterface(bytes4)'])
       const Test1Facet = await ethers.getContractFactory('Test1Facet')
       const Test2Facet = await ethers.getContractFactory('Test2Facet')
       // Any number of functions from any number of facets can be added/replaced/removed in a
       // single transaction
       const cut = [
         {
           facetAddress: addresses[1],
           action: FacetCutAction.Add,
           functionSelectors: diamondLoupeFacetSelectors.remove(['facets()'])
         },
         {
           facetAddress: addresses[2],
           action: FacetCutAction.Add,
           functionSelectors: getSelectors(ownershipFacet)
         },
         {
           facetAddress: addresses[4],
           action: FacetCutAction.Add,
           functionSelectors: getSelectors(Test1Facet)
         },
         {
           facetAddress: addresses[5],
           action: FacetCutAction.Add,
           functionSelectors: getSelectors(Test2Facet)
         }
       ]
       tx = await diamondCutFacet.diamondCut(cut, ethers.constants.AddressZero, '0x', { gasLimit: 8000000 })
       receipt = await tx.wait()
       if (!receipt.status) {
         throw Error(`Diamond upgrade failed: ${tx.hash}`)
       }
       const facets = await diamondLoupeFacet.facets()
       const facetAddresses = await diamondLoupeFacet.facetAddresses()
       assert.equal(facetAddresses.length, 5)
       assert.equal(facets.length, 5)
      assert.sameMembers(facetAddresses, addresses.filter(v => v !== addresses[ 3 ]));
       assert.equal(facets[0][0], facetAddresses[0], 'first facet')
       assert.equal(facets[1][0], facetAddresses[1], 'second facet')
       assert.equal(facets[2][0], facetAddresses[2], 'third facet')
       assert.equal(facets[3][0], facetAddresses[3], 'fourth facet')
       assert.equal(facets[4][0], facetAddresses[4], 'fifth facet')
       assert.sameMembers(facets[findIndexOfAddressInFacets(addresses[0], facets)][1], getSelectors(diamondCutFacet))
       assert.sameMembers(facets[findIndexOfAddressInFacets(addresses[1], facets)][1], diamondLoupeFacetSelectors)
       assert.sameMembers(facets[findIndexOfAddressInFacets(addresses[2], facets)][1], getSelectors(ownershipFacet))
       assert.sameMembers(facets[findIndexOfAddressInFacets(addresses[4], facets)][1], getSelectors(Test1Facet))
       assert.sameMembers(facets[findIndexOfAddressInFacets(addresses[5], facets)][1], getSelectors(Test2Facet))
    });
  });

});
