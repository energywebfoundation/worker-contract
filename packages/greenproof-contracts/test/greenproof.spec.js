const {
  getSelectors,
  FacetCutAction,
} = require("../scripts/deploy");
const { solidity } = require("ethereum-waffle");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const chai = require("chai");
const { roles } = require("./utils/roles.utils");
const { deployGreenproof, Facet } = require("../scripts/deploy/deployContracts");
const { initMockClaimManager } = require("./utils/claimManager.utils");
const { initMockClaimRevoker } = require("./utils/claimRevocation.utils");
const { GreenproofError } = require("./greenproof/greenproof.errors");
const { itEach } = require("mocha-it-each");

chai.use(solidity);

describe("GreenproofTest", async function() {
  let owner;
  let claimManagerMocked;
  let claimsRevocationRegistryMocked;

  before(async function() {
    [owner] = await ethers.getSigners();

    claimManagerMocked = await initMockClaimManager(owner);
    claimsRevocationRegistryMocked = await initMockClaimRevoker(owner);
  });

  describe("Deployment failure tests", () => {
    it("should revert if admin address is 0", async () => {
      await expect(
        deployGreenproof({
          claimManagerAddress: claimManagerMocked.address,
          claimRevokerAddress: claimsRevocationRegistryMocked.address,
          roles,
          contractOwner: ethers.constants.AddressZero,
        }),
      ).to.be.revertedWith(GreenproofError.InvalidOwner);
    });

    it("should revert if claimManager address is 0", async () => {
      await expect(
        deployGreenproof({
          claimManagerAddress: ethers.constants.AddressZero,
          claimRevokerAddress: claimsRevocationRegistryMocked.address,
          roles,
        }),
      ).to.be.revertedWith(GreenproofError.InvalidClaimManager);
    });

    it("should revert if claimsRevocationRegistry address is 0", async () => {
      await expect(
        deployGreenproof({
          claimManagerAddress: claimManagerMocked.address,
          claimRevokerAddress: ethers.constants.AddressZero,
        }),
      ).to.be.revertedWith(GreenproofError.InvalidClaimRevocationRegistry);
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
        }),
      ).to.be.revertedWith(GreenproofError.InvalidRevocablePeriod);
    });
  });

  describe("Proxy setting tests", () => {
    const getFacetAddress = async greenproof => {
      const [, facetAddress] = await getFacetAddresses(greenproof);
      return facetAddress;
    };
    const getFacetAddresses = greenproof => greenproof.facetAddresses();

    itEach(
      "with facets: ${value.facets} it should return proper number of facet addresses",
      [
        { facets: [Facet.IssuerFacet] },
        { facets: [Facet.VotingFacet, Facet.IssuerFacet] },
        { facets: [Facet.VotingFacet, Facet.IssuerFacet, Facet.ProofManagerFacet] },
      ],
      async ({ facets }) => {
        const { greenproofAddress } = await deployGreenproof({
          claimManagerAddress: claimManagerMocked.address,
          claimRevokerAddress: claimsRevocationRegistryMocked.address,
          roles,
          facets,
        });
        const greenproof = await ethers.getContractAt("Greenproof", greenproofAddress);

        const deployedFacets = await greenproof.facetAddresses();

        const NUMBER_OF_SOLID_GREENPROOF_FACETS = 1;
        expect(deployedFacets).to.have.length(facets.length + NUMBER_OF_SOLID_GREENPROOF_FACETS);
      });

    itEach(
      "it should properly cut ${value} selectors",
      [
        Facet.IssuerFacet,
        Facet.VotingFacet,
        Facet.ProofManagerFacet,
      ],
      async (facetName) => {
        const { greenproofAddress } = await deployGreenproof({
          claimManagerAddress: claimManagerMocked.address,
          claimRevokerAddress: claimsRevocationRegistryMocked.address,
          roles,
          facets: [facetName],
        });
        const facet = await ethers.getContractAt(facetName, greenproofAddress);
        const greenproof = await ethers.getContractAt("Greenproof", greenproofAddress);
        const expectedSelectors = getSelectors(facet);

        const [, facetAddress] = await greenproof.facetAddresses();
        const greenproofFacetSelectors = await greenproof.facetFunctionSelectors(facetAddress);
        expect(greenproofFacetSelectors).to.have.same.members(expectedSelectors);
      });

    it("selectors should be associated to facets correctly -- multiple calls to facetAddress function", async () => {
      const { greenproofAddress } = await deployGreenproof({
        claimManagerAddress: claimManagerMocked.address,
        claimRevokerAddress: claimsRevocationRegistryMocked.address,
        roles,
        facets: [Facet.IssuerFacet],
      });
      const issuerFacet = await ethers.getContractAt(Facet.IssuerFacet, greenproofAddress);
      const greenproof = await ethers.getContractAt("Greenproof", greenproofAddress);
      const facetAddress = await getFacetAddress(greenproof);

      const requestProofIssuanceSelector = issuerFacet.interface.getSighash(
        "requestProofIssuance(bytes32,address,bytes32,bytes32[],uint256,bytes32[],string)",
      );

      const resolvedFacetAddress = await greenproof.facetAddress(requestProofIssuanceSelector);
      expect(facetAddress).to.equal(resolvedFacetAddress);
    });

    it("selectors should be associated to facets correctly -- multiple calls to facetAddress function", async () => {
      const { greenproofAddress } = await deployGreenproof({
        claimManagerAddress: claimManagerMocked.address,
        claimRevokerAddress: claimsRevocationRegistryMocked.address,
        roles,
        facets: [Facet.IssuerFacet],
      });
      const issuerFacet = await ethers.getContractAt(Facet.IssuerFacet, greenproofAddress);
      const greenproof = await ethers.getContractAt("Greenproof", greenproofAddress);
      const facetAddress = await getFacetAddress(greenproof);

      const discloseDataSelector = issuerFacet.interface.getSighash(
        "discloseData(string,string,bytes32[],bytes32)",
      );

      const resolvedFacetAddress = await greenproof.facetAddress(discloseDataSelector);
      expect(facetAddress, resolvedFacetAddress);
    });

    it("should test function call", async () => {
      const { greenproofAddress } = await deployGreenproof({
        claimManagerAddress: claimManagerMocked.address,
        claimRevokerAddress: claimsRevocationRegistryMocked.address,
        roles,
        facets: [Facet.IssuerFacet],
      });
      const issuerFacet = await ethers.getContractAt(Facet.IssuerFacet, greenproofAddress);

      await issuerFacet.getCertificateOwners(1);
    });


    it("should remove some functions", async () => {
      const { greenproofAddress } = await deployGreenproof({
        claimManagerAddress: claimManagerMocked.address,
        claimRevokerAddress: claimsRevocationRegistryMocked.address,
        roles,
        facets: [Facet.IssuerFacet],
      });
      const issuerFacet = await ethers.getContractAt(Facet.IssuerFacet, greenproofAddress);
      const greenproof = await ethers.getContractAt("Greenproof", greenproofAddress);
      const facetAddress = await getFacetAddress(greenproof);
      const functionsToKeep = [Object.keys(issuerFacet.interface.functions)[1]];

      const selectors = getSelectors(issuerFacet).remove(functionsToKeep);
      const tx = await greenproof.diamondCut(
        [
          {
            target: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            selectors,
          },
        ],
        ethers.constants.AddressZero,
        "0x",
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.be.greaterThan(0);

      const resolvedSelectors = await greenproof.facetFunctionSelectors(facetAddress);
      const expectedSelectors = getSelectors(issuerFacet).get(functionsToKeep);
      expect(resolvedSelectors).to.have.same.members(expectedSelectors);
    });

    it("remove all functions from all mutable facets", async () => {
      const { greenproofAddress } = await deployGreenproof({
        claimManagerAddress: claimManagerMocked.address,
        claimRevokerAddress: claimsRevocationRegistryMocked.address,
        roles,
        facets: [Facet.IssuerFacet],
      });
      const issuerFacet = await ethers.getContractAt(Facet.IssuerFacet, greenproofAddress);
      const greenproof = await ethers.getContractAt("Greenproof", greenproofAddress);
      const selectors = getSelectors(issuerFacet);

      const tx = await greenproof.diamondCut(
        [
          {
            target: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            selectors: selectors,
          },
        ],
        ethers.constants.AddressZero,
        "0x",
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.be.greaterThan(0);

      const facets = await greenproof.facets();
      expect(facets).to.have.length(1); // SolidState facet
      const diamondCutSelector = greenproof.interface.getSighash(
        "diamondCut((address,uint8,bytes4[])[],address,bytes)",
      );
      const facetsSelector = greenproof.interface.getSighash("facets()");
      expect(facets[0][0]).to.equal((await getFacetAddresses(greenproof))[0]);
      expect(facets[0][1]).to.include.members([diamondCutSelector, facetsSelector]);
    });
  });
});
