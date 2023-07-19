import { ethers } from "hardhat";
import {
  getDeployedFacets,
  getFacetAddress,
} from "./utils/deployment-Infos/deployedFacets";

import { FacetCutAction, getSelectors, FacetCut } from "./libraries/greenproof";

import { UpgradeOperations } from "./utils/types/config.types";

const defaultCallBackData = "0x";
const defaultCallBackContract = ethers.constants.AddressZero;

export const upgradeProxy = async (
  proxyAddress: string,
  operations: UpgradeOperations, // list of all cuts to perfom on the diamond proxy
  callbackContract: string = defaultCallBackContract,
  callbackData: string = defaultCallBackData
) => {
  const greenproof = await ethers.getContractAt("Greenproof", proxyAddress);

  const upgradeTx = await greenproof.diamondCut(
    operations,
    callbackContract,
    callbackData
  );

  const upgradeTxReceipt = await upgradeTx.wait();
  if (!upgradeTxReceipt.status) {
    throw Error(`Upgrade transaction failed: ${upgradeTx.hash}`);
  }
  console.log("Upgrade completed on diamond proxy");
};

export const addFunctionsToFacet = async (
  proxyAddress: string,
  facetName: string,
  listOfFunctions: string[],
  network: string | number = "volta"
) => {
  const facetAddress = getFacetAddress(facetName, network);

  const upgradeOperations = [
    {
      target: facetAddress,
      action: FacetCutAction.Add,
      selectors: listOfFunctions,
    },
  ];
  await upgradeProxy(proxyAddress, upgradeOperations);
  console.log(`Added ${listOfFunctions} to facet ${facetName}`);
};

export const replaceFunctionsInFacet = async (
  proxyAddress: string,
  facetName: string,
  listOfFunctions: string[],
  network: string | number = "volta"
) => {
  const facetAddress = getFacetAddress(facetName, network);

  const upgradeOperations = [
    {
      target: facetAddress,
      action: FacetCutAction.Replace,
      selectors: listOfFunctions,
    },
  ];
  await upgradeProxy(proxyAddress, upgradeOperations);
  console.log(`Replaced ${listOfFunctions} in facet ${facetName}`);
};

export const removeFunctionsFromFacet = async (
  proxyAddress: string,
  facetName: string,
  listOfFunctions: string[],
  network: string | number = "volta"
) => {
  const facetAddress = getFacetAddress(facetName, network);

  const upgradeOperations = [
    {
      target: facetAddress,
      action: FacetCutAction.Remove,
      selectors: listOfFunctions,
    },
  ];
  await upgradeProxy(proxyAddress, upgradeOperations);
  console.log(`Removed ${listOfFunctions} from facet ${facetName}`);
};

export const defaultInit = async (
  greenproofAddress: string,
  proxyConfig?: any
) => {
  const initializerContract =
    proxyConfig !== undefined
      ? process.env.GREENPROOF_INITIALIZER
      : defaultCallBackContract;
  if (!initializerContract) {
    throw Error(
      "Greenproof initializer contract not found .. Make sure you correctly set it in your .env file"
    );
  }

  const greenProofInit = await ethers.getContractAt(
    "GreenproofInit",
    initializerContract
  );

  const callbackData =
    proxyConfig !== undefined
      ? greenProofInit.interface.encodeFunctionData("init", [proxyConfig])
      : "0x";

  const upgradeOperations: FacetCut[] = [];

  const filteredFacets = getDeployedFacets(process.env.npm_config_facets);

  if (filteredFacets.length !== 0) {
    console.log("greenProof proxyAddress -->", greenproofAddress);
    for (const currentFacet of filteredFacets) {
      console.log(`\n\tFetching ${currentFacet.name} facet ...`);

      const targetContract = await ethers.getContractAt(
        currentFacet.name,
        greenproofAddress
      );
      const target = getFacetAddress(currentFacet.name, "volta");
      upgradeOperations.push({
        target,
        action: FacetCutAction.Add,
        selectors: getSelectors(targetContract),
      });
    }
    console.log("Upgrade operations --> ", upgradeOperations, "\n");
    await upgradeProxy(
      greenproofAddress,
      upgradeOperations,
      initializerContract,
      callbackData
    );
  } else {
    //TODO : When a facet is not recoreded, deploy it and update the diamond
    console.log("Facet(s) not found ..");
    console.log(process.env.npm_config_facets);
  }
};

if (require.main === module) {
  console.log("Upgrading Greenproof ...");

  if (!process.env.GREENPROOF_ADDRESS) {
    throw Error(
      "Greenproof address not found .. Make sure you correctly set it in your .env file"
    );
  }
  defaultInit(process.env.GREENPROOF_ADDRESS!);
}
