import { GreenproofFacet } from "./utils/types/config.types";

import { ethers, hardhatArguments } from "hardhat";

const IS_RUNNING_FROM_CLI = require.main === module;
const defaultFacetsList = Object.values(GreenproofFacet);
let deployedFacets: { facetName: string; facetAddress: string }[] = [];

export const deployFacets = async (
  facetsNames: string[] = defaultFacetsList
) => {
  for (const facetName of facetsNames) {
    console.log(`\n\tDeploying ${facetName} facet ...`);
    const Facet = await ethers.getContractFactory(facetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    deployedFacets.push({ facetName, facetAddress: facet.address });
    console.log(`\t\t${facetName} facet deployed at ${facet.address}`);
  }

  return deployedFacets;
};

if (IS_RUNNING_FROM_CLI) {
  console.log(
    `Deploying Greenproof facets on ${hardhatArguments.network?.toUpperCase()} network ...`
  );

  // deployFacets(["VotingFacet", "IssuerFacet"])
  deployFacets()
    .then(() => {
      console.log("\nDeployed facets ==> ", deployedFacets);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
