import { claimManagerABI } from "./claimManager_abi";
import { utils } from "ethers";

export const toBytes32 = (input: string) => {
  return utils.formatBytes32String(input);
};

export const claimManagerInterface = claimManagerABI;
