import { GreenproofFacet } from "./utils/types/config.types";

import { ethers, hardhatArguments } from "hardhat";

const IS_RUNNING_FROM_CLI = require.main === module;
const defaultFacetsList = Object.values(GreenproofFacet);
let deployedFacets: { facetName: string; facetAddress: string }[] = [];

export const deployFacets = async (
  facetsNames: string[] = defaultFacetsList
) => {
  // Retrieve facets from the "--facets" CLI option
  const CLIParams = process.env.npm_config_facets?.split(",") || [];
  console.log("CLI PARAMS :: ", CLIParams);
  const toDeployFacets = CLIParams?.length == 0 ? facetsNames : CLIParams;

  for (const facetName of toDeployFacets) {
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
