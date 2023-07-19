import { Facet } from "utils/types/config.types";

let DeployedFacets: Facet[] = [
  {
    name: "IssuerFacet",
    deployInfos: [
      {
        networkID: 73799,
        address: "0x2f18C7695C149e16542bbAd1671E190AdbB37770",
      },
      {
        networkID: 246,
        address: "",
      },
    ],
  },
  {
    name: "VotingFacet",
    deployInfos: [
      {
        networkID: 73799,
        address: "0x0802b13b4164CA43A2201E7fE1556C0b07A30e2C",
      },
      {
        networkID: 246,
        address: "",
      },
    ],
  },
  {
    name: "MetaTokenFacet",
    deployInfos: [
      {
        networkID: 73799,
        address: "0xaAFe7294a2Bf85ba13028Da9867E958903F58118",
      },
      {
        networkID: 246,
        address: "",
      },
    ],
  },
  {
    name: "ProofManagerFacet",
    deployInfos: [
      {
        networkID: 73799,
        address: "0xE03634eEaF190cF914d7Bc0049A7A741e0eDBfFE",
      },
      {
        networkID: 246,
        address: "",
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
    `\t\tReusing ${facet.name} deployed at ${deployInfo.address} on network ${networkID}`
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

export const getDeployedFacets = (facets?: string) => {
  if (facets == "all" || facets === undefined) {
    return DeployedFacets;
  }

  const listOfFacets = facets.split(",");

  const filteredFacets = DeployedFacets.filter((currentFacet) =>
    listOfFacets.includes(currentFacet.name)
  );

  console.log(filteredFacets);
  return filteredFacets;
};

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
