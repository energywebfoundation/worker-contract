import { BigNumber } from "ethers"

export type Logger = (...msg: any[]) => void;

export enum GreenproofFacet {
  IssuerFacet = "IssuerFacet",
  VotingFacet = "VotingFacet",
  ProofManagerFacet = "ProofManagerFacet",
}

export type DeployGreeproofOptions = {
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
  };
  contractOwner?: string;
  revocablePeriod?: number;
  majorityPercentage?: number;
  rewardsEnabled?: boolean;
  logger?: Logger;
};
