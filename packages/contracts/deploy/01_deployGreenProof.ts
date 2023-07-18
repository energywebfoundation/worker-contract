import { prepareProxy } from "./utils/prepareProxy";
import { getNamedAccounts, deployments } from "hardhat";
import { GreenproofFacet } from "./utils/types/config.types";

import { VOLTA_CLAIM_REVOKER, VOLTA_CLAIM_MANAGER } from "./utils/constants";

const claimManager = VOLTA_CLAIM_MANAGER;
const claimsRevoker = VOLTA_CLAIM_REVOKER;
const facets = process.env.npm_config_facets || "all";

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

const deployGreenproof = async () => {
  const { diamond } = deployments;
  const { owner, deployer } = await getNamedAccounts();

  const proxyConfig = await prepareProxy({
    claimManagerAddress: claimManager,
    claimRevokerAddress: claimsRevoker,
  });

  console.log("Deploying Greenproof contracts ...");

  const result = await diamond.deploy("Greenproof", {
    from: deployer,
    owner: owner,
    facets:
      facets === "all" ? Object.values(GreenproofFacet) : facets.split(","),
    excludeSelectors: {
      IssuerFacet: ["supportsInterface"], // Needed to prevent shadowing of ERC165's supportsInterface
      // This issue is described here >> https://github.com/wighawag/hardhat-deploy/pull/461
    },
    execute: {
      contract: "GreenproofInit",
      methodName: "init",
      args: [proxyConfig],
    },
    log: true,
  });

  return result;
};

deployGreenproof.id = "Greenproof";
deployGreenproof.tags = ["Greenproof"];

export default deployGreenproof;
