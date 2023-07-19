import "@typechain/hardhat";
import { config } from "dotenv";
import { ethers, hardhatArguments } from "hardhat";
import "@nomiclabs/hardhat-waffle";
import { Greenproof__factory } from "../src";
import {
  GreenproofFacet,
  InitContractOptions,
} from "./utils/types/config.types";
import { defaultInit } from "./upgradeProxy";

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

export const deployGreenproof = async (
  options: InitContractOptions,
  shouldInit: boolean = false
) => {
  const contractOwner =
    options.contractOwner ?? (await ethers.getSigners())[0].address;

  const {
    votingTimeLimit = DEFAULT_VOTING_TIME_LIMIT,
    revocablePeriod = DEFAULT_REVOCABLE_PERIOD,
    claimManagerAddress = VOLTA_CLAIM_MANAGER,
    claimRevokerAddress = VOLTA_CLAIM_REVOKER,
    roles = {},
    batchConfig = {
      batchIssuanceSize: 20,
      batchTransferSize: 20,
      batchClaimingSize: 20,
      batchRevocationSize: 20,
    },
    rewardAmount = DEFAULT_REWARD_AMOUNT,
    majorityPercentage = DEFAULT_MAJORITY_PERCENTAGE,
    rewardsEnabled = true,
    isMetaCertificateEnabled = true,
    facets = Object.values(GreenproofFacet),
  } = options;

  const {
    issuerRole = ethers.utils.namehash(process.env.ISSUER_ROLE ?? "issuer"),
    revokerRole = ethers.utils.namehash(process.env.REVOKER_ROLE ?? "revoker"),
    workerRole = ethers.utils.namehash(process.env.WORKER_ROLE ?? "worker"),
    claimerRole = ethers.utils.namehash(process.env.CLAIMER_ROLE ?? "claimer"),
    approverRole = ethers.utils.namehash(
      process.env.APPROVER_ROLE ?? "approver"
    ),
  } = roles;

  const GreenproofContract = await ethers.getContractFactory("Greenproof");
  const args: Parameters<Greenproof__factory["deploy"]> = [contractOwner];
  const greenproof = await GreenproofContract.deploy(...args);
  await greenproof.deployed();
  console.log(`\tGreenproof Diamond deployed to ${greenproof.address}`);

  if (shouldInit) {
    const certificateName = "SAF Certificate";
    const certificateSymbol = "SAFC";
    const metaCertificateName = "SER Certificate";
    const metaCertificateSymbol = "SERC";

    const votingConfig = {
      votingTimeLimit,
      rewardAmount,
      majorityPercentage,
      revocablePeriod,
      rewardsEnabled,
    };

    const rolesConfig = {
      claimManagerAddress,
      issuerRole,
      revokerRole,
      workerRole,
      claimerRole,
      approverRole,
      claimsRevocationRegistry: claimRevokerAddress,
    };

    const proxyConfig = {
      isMetaCertificateEnabled,
      certificateName,
      certificateSymbol,
      metaCertificateName,
      metaCertificateSymbol,
      votingConfig,
      batchConfig,
      rolesConfig,
    };

    await defaultInit(greenproof.address, proxyConfig);
  }

  return greenproof.address;
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (IS_RUNNING_FROM_CLI) {
  console.log(
    `Deploying Greenproof Diamond proxy on ${hardhatArguments.network?.toUpperCase()} network ...`
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
    .then((diamondAddress) => {
      console.log(
        `\tGreenproof Diamond deployed to address "${diamondAddress}"`
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
