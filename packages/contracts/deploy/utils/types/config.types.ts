import { BigNumber } from "ethers";

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

export enum GreenproofFacet {
  IssuerFacet = "IssuerFacet",
  VotingFacet = "VotingFacet",
  MetaTokenFacet = "MetaTokenFacet",
  ProofManagerFacet = "ProofManagerFacet",
}
