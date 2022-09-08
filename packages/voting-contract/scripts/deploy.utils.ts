import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

/* -------------------- env checker utils functions *----- */

const logError = (envKey: string) => {
  console.log(`\t\x1b[33m${envKey} is not set\x1b[0m`);
};

const isEnvSet = (envKey: string) => {
  const notSet = undefined || "";
  let result = true;
  switch (envKey) {
    case "REWARD_ETHER_AMOUNT":
      if (process.env.REWARD_ETHER_AMOUNT === notSet) {
        logError(envKey);
        result = false;
      }
      break;
    case "WORKER_ROLE_VOLTA":
      if (process.env.WORKER_ROLE_VOLTA === notSet) {
        logError(envKey);
        result = false;
      }
      break;
    case "VOLTA_CLAIM_MANAGER_ADDRESS":
      if (process.env.VOLTA_CLAIM_MANAGER_ADDRESS === notSet) {
        logError(envKey);
        result = false;
      }
      break;
    case "PRIVATE_KEY":
      if (process.env.PRIVATE_KEY === notSet) {
        logError(envKey);
        result = false;
      }
      break;
  }
  return result;
};

export const isEnvConfigured = () => {
  return (
    isEnvSet("REWARD_ETHER_AMOUNT") &&
    isEnvSet("WORKER_ROLE_VOLTA") &&
    isEnvSet("VOLTA_CLAIM_MANAGER_ADDRESS") &&
    isEnvSet("PRIVATE_KEY")
  );
};

export const throwEnvError = () => {
  console.log("\n");
  throw new Error(
    "\x1b[31m SOME VALUES ARE MISSING IN YOUR .ENV CONFIG FILE\n\n\x1b[36m"
  );
};

/* -------------------- deploy params settings *----- */

const workerRoleVolta = process.env.WORKER_ROLE_VOLTA as string;
export const workerRole = ethers.utils.namehash(workerRoleVolta);
const rewardEtherAmount = process.env.REWARD_ETHER_AMOUNT
  ? (process.env.REWARD_ETHER_AMOUNT as string)
  : undefined;
export const rewardAmount = rewardEtherAmount
  ? ethers.utils.parseEther(rewardEtherAmount)
  : undefined;
export const votingTimeLimit = 15 * 50;
export const voltaClaimManagerAddress = process.env.VOLTA_CLAIM_MANAGER_ADDRESS;

/* -----  Type definitions ---------- */

export enum Contract {
  MatchVoting = "MatchVoting",
  Certificate = "Certificate",
  RewardVoting = "RewardFixed",
}

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
