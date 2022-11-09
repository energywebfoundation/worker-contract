import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import { ethers } from "hardhat";
import { config } from "dotenv";
import { FacetCutAction, getSelectors } from "./libraries/diamond";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { Diamond__factory } from "../src";

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
type DeployDiamondOptions = {
  votingTimeLimit?: number;
  rewardAmount?: BigNumber;
  claimManagerAddress: string;
  claimRevokerAddress: string;
  facets?: Facet[];
  roles?: {
    workerRole?: string;
    issuerRole?: string;
    revokerRole?: string;
  };
  contractOwner?: string;
  revocablePeriod?: number;
  majorityPercentage?: number;
  logger?: Logger;
};

export enum Facet {
  DiamondLoupeFacet = "DiamondLoupeFacet",
  OwnershipFacet = "OwnershipFacet",
  IssuerFacet = "IssuerFacet",
  VotingFacet = "VotingFacet",
  ProofManagerFacet = "ProofManagerFacet",
}

export const deployDiamond = async (options: DeployDiamondOptions) => {
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
    facets = Object.values(Facet),
    logger = () => {},
  } = options;
  const deploy = createDeployer(logger);
  const {
    issuerRole = ethers.utils.namehash(process.env.ISSUER_ROLE ?? "issuer"),
    revokerRole = ethers.utils.namehash(process.env.REVOKER_ROLE ?? "revoker"),
    workerRole = ethers.utils.namehash(process.env.WORKER_ROLE ?? "worker"),
  } = roles;

  // deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const diamondInit = await deploy("DiamondInit");
  const diamondCutFacet = await deploy("DiamondCutFacet");
  const diamond = await deploy("Diamond", (factory) => {
    const args: Parameters<Diamond__factory["deploy"]> = [
      { diamondCutFacet: diamondCutFacet.address, contractOwner },
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
        claimsRevocationRegistry: claimRevokerAddress,
      },
    ];
    return factory.deploy(...args);
  });

  logger("Deploying facets...");
  const cuts = [];
  for (const facetName of facets) {
    const facet = await deploy(facetName);

    cuts.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
    });
  }

  logger("List of Cuts to execute :", cuts);
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
  // call to init function
  const functionCall = diamondInit.interface.encodeFunctionData("init");
  const tx = await diamondCut.diamondCut(
    cuts,
    diamondInit.address,
    functionCall
  );
  logger("Diamond cuts tx: ", tx.hash);
  const receipt = await tx.wait();

  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }

  logger("Completed diamond cuts");
  return { diamondAddress: diamond.address };
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (runningFromCLI()) {
  deployDiamond({
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
    logger(`Contract: ${contractName} deployed to ${contract.address}`);

    return contract;
  };
