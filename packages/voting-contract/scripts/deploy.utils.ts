import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const workerRoleVolta = process.env.WORKER_ROLE_VOLTA as string;
export const workerRole = ethers.utils.namehash(workerRoleVolta);
const rewardEtherAmount = process.env.REWARD_ETHER_AMOUNT as string;
export const rewardAmount = ethers.utils.parseEther(rewardEtherAmount);
export const votingTimeLimit = 15 * 50;
export const voltaClaimManagerAddress = process.env.VOLTA_CLAIM_MANAGER_ADDRESS;

export enum Contract {
  MatchVoting = "MatchVoting",
  Certificate = "Certificate",
  RewardVoting = "RewardFixed",
}

/* -----  Type definitions ---------- */

type DeployedContract = {
  address?: string;
  name: Contract;
};

export type ContractToDeploy = {
  name: Contract;
  args: any[];
};

export type DeploymentContext = {
  deployedContracts: DeployedContract[];
};
