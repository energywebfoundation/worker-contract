import "@typechain/hardhat";
import { config } from "dotenv";
import { ethers, hardhatArguments } from "hardhat";
import "@nomiclabs/hardhat-waffle";
import { Greenproof__factory } from "../src";
import { Contract, ContractFactory } from "ethers";
import { FacetCutAction, getSelectors } from "./libraries/greenproof";
import {
  InitContractOptions,
  GreenproofFacet,
  Logger,
} from "./utils/types/config.types";

import {
  EWC_CLAIM_REVOKER,
  EWC_CLAIM_MANAGER,
  VOLTA_CLAIM_MANAGER,
  VOLTA_CLAIM_REVOKER,
  DEFAULT_REWARD_AMOUNT,
  DEFAULT_REVOCABLE_PERIOD,
  DEFAULT_VOTING_TIME_LIMIT,
  DEFAULT_MAJORITY_PERCENTAGE,
} from "./utils/constants";

config();

const IS_RUNNING_FROM_CLI = require.main === module;
let deployedFacets: { facetName: string; facetAddress: string }[] = [];

export const deployGreenproof = async (options: InitContractOptions) => {
  const contractOwner =
    options.contractOwner ?? (await ethers.getSigners())[0].address;

  const batchQueueSize = options.batchQueueSize ?? 20;

  const {
    votingTimeLimit = DEFAULT_VOTING_TIME_LIMIT,
    revocablePeriod = DEFAULT_REVOCABLE_PERIOD,
    claimManagerAddress = VOLTA_CLAIM_MANAGER,
    claimRevokerAddress = VOLTA_CLAIM_REVOKER,
    roles = {},
    rewardAmount = DEFAULT_REWARD_AMOUNT,
    majorityPercentage = DEFAULT_MAJORITY_PERCENTAGE,
    rewardsEnabled = true,
    facets = Object.values(GreenproofFacet),
    logger = () => {},
  } = options;

  const facetsList = facets as string[];

  const deploy = createDeployer(logger, facetsList);

  const {
    issuerRole = ethers.utils.namehash(process.env.ISSUER_ROLE ?? "issuer"),
    revokerRole = ethers.utils.namehash(process.env.REVOKER_ROLE ?? "revoker"),
    workerRole = ethers.utils.namehash(process.env.WORKER_ROLE ?? "worker"),
    claimerRole = ethers.utils.namehash(process.env.CLAIMER_ROLE ?? "claimer"),
    approverRole = ethers.utils.namehash(
      process.env.APPROVER_ROLE ?? "approver"
    ),
  } = roles;

  // deploy GreenproofInit
  // GreenproofInit provides a function that is called when the Greenproof is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const greeproofInit = await deploy("GreenproofInit");
  const greenproof = await deploy("Greenproof", (factory) => {
    const args: Parameters<Greenproof__factory["deploy"]> = [
      { contractOwner, batchQueueSize },
      {
        votingTimeLimit,
        rewardAmount,
        majorityPercentage,
        revocablePeriod,
        rewardsEnabled,
      },
      {
        claimManagerAddress,
        issuerRole,
        revokerRole,
        workerRole,
        claimerRole,
        approverRole,
        claimsRevocationRegistry: claimRevokerAddress,
      },
    ];
    return factory.deploy(...args);
  });

  logger("Deploying facets...");
  console.log("Deploying facets...");
  console.log("All greenproof facets --> ", facets);

  const cuts = [];
  for (const facetName of facets) {
    const facet = await deploy(facetName);

    cuts.push({
      target: facet.address,
      action: FacetCutAction.Add,
      selectors: getSelectors(facet),
    });
  }

  logger("List of Cuts to execute", cuts);
  const certificateInfos = ["SAF Certificate", "SAFC"];
  const metaCertificateInfos = ["SER Certificate", "SERC"];

  // call to init function
  const functionCall = greeproofInit.interface.encodeFunctionData("init", [
    greenproof.address,
    certificateInfos,
    metaCertificateInfos,
  ]);
  const tx = await greenproof.diamondCut(
    cuts,
    greeproofInit.address,
    functionCall
  );

  logger("Diamond cuts tx", tx.hash);
  const receipt = await tx.wait();

  if (!receipt.status) {
    throw Error(`Greenproof upgrade failed: ${tx.hash}`);
  }

  logger("Completed diamond cuts");
  console.log("Completed diamond cuts");
  return { greenproofAddress: greenproof.address };
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (IS_RUNNING_FROM_CLI) {
  console.log(
    `Deploying Greenproof contracts on ${hardhatArguments.network?.toUpperCase()} network ...`
  );

  const claimManager =
    hardhatArguments.network === "volta"
      ? VOLTA_CLAIM_MANAGER
      : EWC_CLAIM_MANAGER;
  const claimsRevoker =
    hardhatArguments.network === "volta"
      ? VOLTA_CLAIM_REVOKER
      : EWC_CLAIM_REVOKER;

  deployGreenproof({
    claimManagerAddress: claimManager,
    claimRevokerAddress: claimsRevoker,
  })
    .then(() => {
      console.log("\nDeployed facets ==> ", deployedFacets);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

const createDeployer =
  (logger: Logger, facetsList: string[] = []) =>
  async (
    contractName: string,
    deployFn: (factory: ContractFactory) => Promise<Contract> = (factory) =>
      factory.deploy()
  ): Promise<Contract> => {
    const factory = await ethers.getContractFactory(contractName);

    const contract = await deployFn(factory);
    await contract.deployed();
    if (facetsList.includes(contractName)) {
      deployedFacets.push({
        facetName: contractName,
        facetAddress: contract.address,
      });
    } else {
      logger(`\tContract: ${contractName} deployed to `, contract.address);
      console.log(`\t${contractName} deployed to`, contract.address);
    }

    return contract;
  };
