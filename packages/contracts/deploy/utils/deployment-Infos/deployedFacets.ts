import { Facet } from "utils/types/config.types";

let DeployedFacets: Facet[] = [
  {
    name: "IssuerFacet",
    deployInfos: [
      {
        networkID: 73799,
        address: "0xda83c0a8654460886c4b1Fe9114f0dA698EAc418",
      },
    ],
  },
  {
    name: "VotingFacet",
    deployInfos: [
      {
        networkID: 73799,
        address: "0xbf02aF5Ff9044804298a406b9818A8a28cc8cA30",
      },
    ],
  },
  {
    name: "MetaTokenFacet",
    deployInfos: [
      {
        networkID: 73799,
        address: "0xB1988065817F813D3171a45281BE499a224f104E",
      },
    ],
  },
  {
    name: "ProofManagerFacet",
    deployInfos: [
      {
        networkID: 73799,
        address: "0xD3F0Cf7bF504964DF2a80720Ca3C204a32E2CDA9",
      },
    ],
  },
];

const parseFacetAddress = (facet: Facet, networkID: number) => {
  const deployInfo = facet.deployInfos.find(
    (deployInfo) => deployInfo.networkID === networkID
  );
  if (!deployInfo) {
    throw new Error(`Facet ${facet.name} not deployed on network ${networkID}`);
  }
  console.log(
    `\t\t${facet.name} facet is deployed at ${deployInfo.address} on network ${networkID}`
  );
  return deployInfo.address;
};

const parseNetworkID = (networkID: string | number) => {
  if (typeof networkID === "number") {
    return networkID;
  }
  const networkName = networkID.toLowerCase();
  switch (networkName) {
    case "volta":
      return 73799;
    case "ewc":
      return 246;
    default:
      return null;
  }
};

export const getFacetAddress = (
  facetName: string,
  network: string | number
) => {
  const netID = parseNetworkID(network);
  if (!netID) {
    throw new Error(`Network ${network} not found`);
  }
  const facet = DeployedFacets.find(
    (deployedFacet) => deployedFacet.name === facetName
  );
  if (!facet) {
    throw new Error(`Facet ${facetName} not found`);
  }

  return parseFacetAddress(facet, netID);
};

export const getDeployedFacets = () => DeployedFacets;

export const addDeployedFacet = (
  name: string,
  address: string,
  networkID: number
) => {
  DeployedFacets.push({
    name,
    deployInfos: [
      {
        networkID,
        address,
      },
    ],
  });
};
