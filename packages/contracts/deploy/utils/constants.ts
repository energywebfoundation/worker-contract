import { ethers } from "ethers";

export const EWC_CLAIM_MANAGER =
  process.env.EWC_CLAIM_MANAGER ?? "0x23b026631A6f265d17CFee8aa6ced1B244f3920C";

export const EWC_CLAIM_REVOKER =
  process.env.EWC_CLAIMS_REVOCATION_REGISTRY ??
  "0xd72B4c8D5B1a1A4C7085259548bDF1A175CFc48D";

export const VOLTA_CLAIM_MANAGER =
  process.env.VOLTA_CLAIM_MANAGER ??
  "0x5339adE9332A604A1c957B9bC1C6eee0Bcf7a031";

export const VOLTA_CLAIM_REVOKER =
  process.env.VOLTA_CLAIMS_REVOCATION_REGISTRY ??
  "0x9876d992D124f8E05e3eB35132226a819aaC840A";

export const DEFAULT_REVOCABLE_PERIOD = 60 * 60 * 24 * 7 * 4 * 12; // aprox. 12 months

export const DEFAULT_VOTING_TIME_LIMIT = 15 * 60;

export const DEFAULT_MAJORITY_PERCENTAGE = 51;

export const DEFAULT_REWARD_AMOUNT = ethers.utils.parseEther(
  process.env.REWARD_AMOUNT_IN_ETHER ?? "1"
);
