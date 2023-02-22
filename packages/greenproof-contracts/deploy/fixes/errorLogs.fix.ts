import "@typechain/hardhat";
import { ethers } from "hardhat";

const provider = new ethers.providers.JsonRpcProvider(process.env.VOLTA_RPC_URL);
const adminWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const displayError = (error: string) => {
  console.log("\nExtracted Error: \x1b[31m%s\x1b[0m", `${error}`);
}

const fetchRPCTransaction = async (txHash: any) => {
    return await provider.getTransaction(txHash);
}

const parseRevertReason = (error: Error) => {
  const stringifyedError = JSON.stringify({error}.error);
  const jsonError = JSON.parse(stringifyedError);
  const code = (jsonError.error.error.data).substr("Reverted ".length);
  // console.log("\nExtracted ErrorCode to decode :: ", code, "\n");
  const byteStringReasonLength = 136;
  const reason = ethers.utils.toUtf8String('0x' + code.substr(byteStringReasonLength));

  return reason;
}

const extractError = async (tx: any) => {
    try {
        await provider.call(tx, tx.blockNumber)
    } catch (err) {
      const revertReason = parseRevertReason(err as Error);
      displayError(revertReason);
      return revertReason;
    }
    return "";
}

const main = async () => {
  // conttract taken from https://louper.dev/diamond/0x0F4fF536A39b92950D71094a3A605A536735148f?network=volta
  const greenproofAddress = "0x0F4fF536A39b92950D71094a3A605A536735148f";
  const greenproofContract = await ethers.getContractAt("Greenproof", greenproofAddress);
  const addressZero = ethers.constants.AddressZero;
  const { maxFeePerGas, maxPriorityFeePerGas } = await ethers.provider.getFeeData();
  let tx;

  try {
    //trying to update the claimManager with the  zero address 
    //this should trigger the `Cannot update to null address` error
    tx = await greenproofContract.connect(adminWallet)
      .updateClaimManager(
        addressZero,
        {
          maxFeePerGas,
          maxPriorityFeePerGas,
          gasLimit: 8000000
        }
    );
    await tx.wait();
  } catch (error) {

    const failingTx = await fetchRPCTransaction(tx.hash);
    const reason = await extractError(failingTx);
    console.log("txDetails: ", failingTx)
    throw (new Error(reason));
  }
}

main().then(output => {
  console.log("main output --> ", output);
});
