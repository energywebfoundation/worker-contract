import { ethers } from "hardhat";
import { extractError } from "../libraries/errorManager";

const provider = new ethers.providers.JsonRpcProvider(process.env.VOLTA_RPC_URL);
const adminWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const fetchRPCTransaction = async (txHash: any) => {
    return await provider.getTransaction(txHash);
}

const newClaimManagerAddress = ethers.constants.AddressZero;



const main = async () => {
  // greenproof contract taken from https://louper.dev/diamond/0x0F4fF536A39b92950D71094a3A605A536735148f?network=volta
  const greenproofAddress = "0x0F4fF536A39b92950D71094a3A605A536735148f";
  const greenproofContract = await ethers.getContractAt("Greenproof", greenproofAddress);
  const { maxFeePerGas, maxPriorityFeePerGas } = await ethers.provider.getFeeData();
  let tx;

  try {
    //trying to update the claimManager with the  zero address 
    //this should trigger the `Cannot update to null address` error
    tx = await greenproofContract.connect(adminWallet)
      .updateClaimManager(
        newClaimManagerAddress,
        {
          maxFeePerGas,
          maxPriorityFeePerGas,
          gasLimit: 8000000
        }
    );
    await tx.wait();
    return tx;
  } catch (error) {

    const failingTx = await fetchRPCTransaction(tx.hash);
    const reason = await extractError(failingTx, provider);
    console.log("txDetails: ", failingTx)
    throw (new Error(reason));
  }
}

main().then(output => {
  console.log(
    `ClaimManager Updated :
---------------------
      new address: ${newClaimManagerAddress}
      UpdateTransaction: ${JSON.stringify(output)}`
  );
});
