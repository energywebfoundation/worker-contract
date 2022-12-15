import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import { ethers } from "hardhat";
import { config } from "dotenv";
import { FacetCutAction, getSelectors } from "./libraries/greenproof";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { GreenProofInit } from '../src';

config();

export const VOLTA_CLAIM_MANAGER = "0x5339adE9332A604A1c957B9bC1C6eee0Bcf7a031";
export const VOLTA_CLAIM_REVOKER = "0x9876d992D124f8E05e3eB35132226a819aaC840A";
export const DEFAULT_REVOCABLE_PERIOD = 60 * 60 * 24 * 7 * 4 * 12; // aprox. 12 months
export const DEFAULT_VOTING_TIME_LIMIT = 15 * 60;
export const DEFAULT_MAJORITY_PERCENTAGE = 51;
export const DEFAULT_REWARD_AMOUNT = ethers.utils.parseEther(
  process.env.REWARD_AMOUNT_IN_ETHER ?? "1"
);

const runningFromCLI = () => require.main === module;

type Logger = (...msg: any[]) => void;
type DeployGreeproofOptions = {
  votingTimeLimit?: number;
  rewardAmount?: BigNumber;
  claimManagerAddress: string;
  claimRevokerAddress: string;
  facets?: Facet[];
  roles?: {
    workerRole?: string;
    issuerRole?: string;
    revokerRole?: string;
    claimerRole?: string;
  };
  contractOwner?: string;
  revocablePeriod?: number;
  majorityPercentage?: number;
  rewardsEnabled?: boolean;
  logger?: Logger;
};

export enum Facet {
  IssuerFacet = "IssuerFacet",
  VotingFacet = "VotingFacet",
  ProofManagerFacet = "ProofManagerFacet",
}

export const deployGreenproof = async (options: DeployGreeproofOptions) => {
  const contractOwner =
    options.contractOwner ?? (await ethers.getSigners())[0].address;
  const {
    votingTimeLimit = DEFAULT_VOTING_TIME_LIMIT,
    revocablePeriod = DEFAULT_REVOCABLE_PERIOD,
    claimManagerAddress = VOLTA_CLAIM_MANAGER,
    claimRevokerAddress = VOLTA_CLAIM_REVOKER,
    roles = {},
    rewardAmount = DEFAULT_REWARD_AMOUNT,
    majorityPercentage = DEFAULT_MAJORITY_PERCENTAGE,
    rewardsEnabled = true,
    facets = Object.values(Facet),
    logger = () => {},
  } = options;
  const deploy = createDeployer(logger);
  const {
    issuerRole = ethers.utils.namehash(process.env.ISSUER_ROLE ?? "issuer"),
    revokerRole = ethers.utils.namehash(process.env.REVOKER_ROLE ?? "revoker"),
    workerRole = ethers.utils.namehash(process.env.WORKER_ROLE ?? "worker"),
    claimerRole = ethers.utils.namehash(process.env.CLAIMER_ROLE ?? "claimer"),
  } = roles;

  // deploy GreenproofInit
  // GreenproofInit provides a function that is called when the Greenproof is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const greeproofInit = await deploy("GreenproofInit");
  const greenproof = await deploy("Greenproof", (factory) => factory.deploy());

  logger("Deploying facets...");
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
  const args: Parameters<GreenproofInit["init"]> = [
    { contractOwner },
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
      claimsRevocationRegistry: claimRevokerAddress,
    },
  ];
  const tx = await greenproof.diamondCut(
    cuts,
    greeproofInit.address,
    greeproofInit.interface.encodeFunctionData('init', args),
  );

  logger("Diamond cuts tx", tx.hash);
  const receipt = await tx.wait();

  if (!receipt.status) {
    throw Error(`Greenproof upgrade failed: ${tx.hash}`);
  }

  logger("Completed diamond cuts");
  return { greenproofAddress: greenproof.address };
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (runningFromCLI()) {
  deployGreenproof({
    claimManagerAddress: VOLTA_CLAIM_MANAGER,
    claimRevokerAddress: VOLTA_CLAIM_REVOKER,
  })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

const createDeployer =
  (logger: Logger) =>
  async (
    contractName: string,
    deployFn: (factory: ContractFactory) => Promise<Contract> = (factory) =>
      factory.deploy()
  ): Promise<Contract> => {
    const factory = await ethers.getContractFactory(contractName);

    const contract = await deployFn(factory);
    await contract.deployed();
    logger(`Contract: ${contractName} deployed to `, contract.address);

    return contract;
  };
