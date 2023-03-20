import { ethers } from "hardhat";

export const displayError = (error: string) => {
  console.log("\nExtracted Error: \x1b[31m%s\x1b[0m", `${error}`);
}

export const parseRevertReason = (error: Error) => {
  const stringifyedError = JSON.stringify({error}.error);
  const jsonError = JSON.parse(stringifyedError);
  const errorCode = (jsonError.error.error.data).substr("Reverted ".length);
  const byteStringReasonLength = 136;
  const reason = ethers.utils.toUtf8String('0x' + errorCode.substr(byteStringReasonLength));

  return reason;
}

export const extractError = async (tx: any, provider: any) => {
    try {
        await provider.call(tx, tx.blockNumber)
    } catch (err) {
      const revertReason = parseRevertReason(err as Error);
      displayError(revertReason);
      return revertReason;
    }
    return "";
}