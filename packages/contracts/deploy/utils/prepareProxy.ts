import "@typechain/hardhat";
import { config } from "dotenv";
import { ethers, network, getNamedAccounts, deployments } from "hardhat";
import "@nomiclabs/hardhat-waffle";
import { Contract, ContractFactory } from "ethers";

import {
  InitContractOptions,
  GreenproofFacet,
  Logger,
} from "./types/config.types";

import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

config();

import {
  EWC_CLAIM_REVOKER,
  EWC_CLAIM_MANAGER,
  VOLTA_CLAIM_MANAGER,
  VOLTA_CLAIM_REVOKER,
  DEFAULT_REWARD_AMOUNT,
  DEFAULT_REVOCABLE_PERIOD,
  DEFAULT_VOTING_TIME_LIMIT,
  DEFAULT_MAJORITY_PERCENTAGE,
} from "./constants";

export const prepareProxy = async (options: InitContractOptions) => {
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
    logger = () => {},
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

  return proxyConfig;
};
