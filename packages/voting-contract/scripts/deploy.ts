// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import {
  Contract,
  workerRole,
  throwEnvError,
  rewardAmount,
  votingTimeLimit,
  isEnvConfigured,
  ContractToDeploy,
  DeploymentContext,
  voltaClaimManagerAddress,
  // eslint-disable-next-line node/no-missing-import
} from "./deploy.utils";

const getDeployedContract = (ctx: DeploymentContext, contract: Contract) => {
  const deployedContract = ctx.deployedContracts.find(
    (contract) => contract.name === Contract.Certificate
  );

  if (!deployedContract) {
    throw new Error(`Contract ${contract} not deployed`);
  }

  return deployedContract;
};

const deploymentPlan: ((ctx: DeploymentContext) => ContractToDeploy)[] = [
  () => ({
    name: Contract.Certificate,
    args: [],
  }),
  () => ({
    name: Contract.RewardVoting,
    args: [rewardAmount],
  }),
  (ctx) => ({
    name: Contract.MatchVoting,
    args: [
      getDeployedContract(ctx, Contract.Certificate).address,
      getDeployedContract(ctx, Contract.RewardVoting).address,
      votingTimeLimit,
      voltaClaimManagerAddress,
      workerRole,
    ],
  }),
];

const deploy = async () => {
  if (isEnvConfigured()) {
    const context: DeploymentContext = {
      deployedContracts: [],
    };

    for (const deployment of deploymentPlan) {
      const contract = deployment(context);
      console.log(
        `\nDeploying ${contract.name} with args: ${
          contract.args.length ? contract.args : "No arguments"
        }`
      );

      const ContractToDeploy = await ethers.getContractFactory(contract.name);
      const deployedContract = await ContractToDeploy.deploy(...contract.args);
      await deployedContract.deployed();

      console.log(
        `\x1b[32m${contract.name} deployed to: ${deployedContract.address}\x1b[0m`
      );

      context.deployedContracts.push({
        name: contract.name,
        address: deployedContract.address,
      });

      await fs.writeFileSync(
        path.join(__dirname, "context.json"),
        JSON.stringify(context, null, 2)
      );
    }
  } else {
    throwEnvError();
  }
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deploy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
