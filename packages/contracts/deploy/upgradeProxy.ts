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
  await upgradeProxy(facetAddress, upgradeOperations);
  console.log(`Added ${listOfFunctions} to facet ${facetName}`);
};

export const replaceFunctionsInFacet = async (
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
  await upgradeProxy(facetAddress, upgradeOperations);
  console.log(`Replaced ${listOfFunctions} in facet ${facetName}`);
};

export const removeFunctionsFromFacet = async (
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
  await upgradeProxy(facetAddress, upgradeOperations);
  console.log(`Removed ${listOfFunctions} from facet ${facetName}`);
};

export const defaultInit = async (greenproofAddress: string) => {
  const certificateInfos = ["SAF Certificate", "SAFC"];
  const metaCertificateInfos = ["SER Certificate", "SERC"];
  const initializerContract = process.env.GREENPROOF_INITIALIZER;
  if (!initializerContract) {
    throw Error(
      "Greenproof initializer contract not found .. Make sure you correctly set it in your .env file"
    );
  }

  const greenProofInit = await ethers.getContractAt(
    "GreenproofInit",
    initializerContract
  );

  const callbackData = greenProofInit.interface.encodeFunctionData("init", [
    greenproofAddress,
    certificateInfos,
    metaCertificateInfos,
  ]);

  const upgradeOperations: FacetCut[] = [];
  const deployedFacets = getDeployedFacets();
  for (const currentFacet of deployedFacets) {
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

  await upgradeProxy(
    greenproofAddress,
    upgradeOperations,
    initializerContract,
    callbackData
  );
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
