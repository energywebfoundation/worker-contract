import { BigNumber } from "ethers";
import { FacetCut } from "libraries/greenproof";

export type Logger = (...msg: any[]) => void;
export type InitContractOptions = {
  votingTimeLimit?: number;
  rewardAmount?: BigNumber;
  claimManagerAddress: string;
  claimRevokerAddress: string;
  facets?: GreenproofFacet[];
  roles?: {
    workerRole?: string;
    issuerRole?: string;
    revokerRole?: string;
    claimerRole?: string;
    approverRole?: string;
  };
  contractOwner?: string;
  revocablePeriod?: number;
  majorityPercentage?: number;
  rewardsEnabled?: boolean;
  logger?: Logger;
};

export type DeployInfos =
  // a facet can be deployed on multiple networks
  {
    networkID: number; // network id
    address: string; // address of the deployed facet
    usedBy?: string[]; // diamonds or contracts that use this facet
  };

export type Facet = {
  name: string; // name of the facet
  deployInfos: DeployInfos[];
};

export enum GreenproofFacet {
  IssuerFacet = "IssuerFacet",
  VotingFacet = "VotingFacet",
  MetaTokenFacet = "MetaTokenFacet",
  ProofManagerFacet = "ProofManagerFacet",
}

export type UpgradeOperations = FacetCut[];
