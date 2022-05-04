// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

enum Contract {
  MatchVoting = "MatchVoting",
  Certificate = "Certificate",
}

type DeployedContract = {
  address?: string;
  name: Contract;
};

type ContractToDeploy = {
  name: Contract;
  args: any[];
};

type DeploymentContext = {
  deployedContracts: DeployedContract[];
};

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
  (ctx) => ({
    name: Contract.MatchVoting,
    args: [getDeployedContract(ctx, Contract.Certificate).address],
  }),
];

async function main() {
  const context: DeploymentContext = {
    deployedContracts: [],
  };

  for (const deployment of deploymentPlan) {
    const contract = deployment(context);
    console.log(`Deploying ${contract.name} with args: ${contract.args}`);

    const ContractToDeploy = await ethers.getContractFactory(contract.name);
    const deployedContract = await ContractToDeploy.deploy(...contract.args);
    await deployedContract.deployed();

    console.log(`${contract.name} deployed to: ${deployedContract.address}`);

    context.deployedContracts.push({
      name: contract.name,
      address: deployedContract.address,
    });

    await fs.writeFileSync(
      path.join(__dirname, "context.json"),
      JSON.stringify(context, null, 2)
    );
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
