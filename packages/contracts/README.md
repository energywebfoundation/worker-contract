# Green Proof blockchain contracts

## Description
---

The present package is the onchain module of the Greenproof core SDK of Energyweb Foundation.

## Architecture
---
The on-chain component of the greenProof core module is an upgradable proxied module, implementing the [EIP-2535](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2535.md) standard, which is a standard recommended in the [upgrades section](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1155.md#upgrades) of the EIP-1155 token standard documentation.

This upgradable pattern is called a Diamond standard architecture, where all smart contracts are organized as different facets of one single diamond.
It ultimately allows users to trigger any on-chain function of any Greenroof component using one single and stable contract address.

As mentioned in the [Ethereum documentation](https://ethereum.org/en/developers/docs/smart-contracts/upgrading/#diamond-pattern) :

> The diamond pattern can be considered an improvement on the proxy pattern. Diamond patterns differ from proxy patterns because the diamond proxy contract can delegates function calls to more than one logic contract.
>
> The diamond upgrade pattern has some advantages over traditional proxy upgrade patterns:
>
> - It allows you to upgrade a small part of the contract without changing all of the code. Using the proxy pattern for upgrades requires creating an entirely new logic contract, even for minor upgrades.
>
> - All smart contracts (including logic contracts used in proxy patterns) have a 24KB size limit, which can be a limitation—especially for complex contracts requiring more functions. The diamond pattern makes it easy to solve this problem by splitting functions across multiple logic contracts.
>
> - Proxy patterns adopt a catch-all approach to access controls. An entity with access to upgrade functions can change the entire contract. But the diamond pattern enables a modular permissions approach, where you can restrict entities to upgrading certain functions within a smart contract.

Each smartcontract component provided in `contracts/facets` directory is then a facet of this greenproof Diamond.

- Voting component : the voting logic is implemented in the [VotingFacet.sol](https://github.com/energywebfoundation/greenproof-sdk/blob/master/packages/greenproof-contracts/contracts/facets/VotingFacet.sol) contract

- NFT Issuer component : the issuance component is encapsulated inside the [IssuerFacet.sol](https://github.com/energywebfoundation/greenproof-sdk/blob/master/packages/greenproof-contracts/contracts/facets/IssuerFacet.sol) contract

Additional utility facets are provided by the [Solidstate diamond implementation](https://github.com/solidstate-network/solidstate-solidity/tree/master/contracts/proxy/diamond), which help conforming to the EIP-2535 standard specification

---

## Quickstart
---
- Install dependencies:
```
npm install
```

### Running tests

- end-to-end tests

```
npm run test:e2e
```

This command will run unit tests for the whole `greenproof-contracts` components. You can target one specific component to test inside the greenproof core module :
- `issuerFacet.spec.js` handles unit tests for the Issuance component. 

```
npm run issuer:test
```

- `test/voting handles unit tests for the Voting component`

```
npm run voting:test
```
- `proxy.spec.js` runs tests on the [proxy management](https://eip2535diamonds.substack.com/i/38730553/diamond-upgrades) and the [diamond inspection](https://eip2535diamonds.substack.com/p/why-on-chain-loupe-functions-are)

```
npm run proxy:test

```
To run `coverage` test :
 
```
npm run coverage:test
```

## Diamond Proxy Deployment and Upgrade

The `contracts/deploy` repository contains scripts used for deploying, upgrading and maintaining a greenproof project. 

The key scripts included in the repository are:

- `deployFacets.ts`: This script is used to deploy all facets of the diamond contract.
- `deployProxy.ts`: This script is used to deploy the diamond proxy contract.
- `upgradeProxy.ts`: This script is used to upgrade the diamond proxy contract.

### 1. Deploying facets

Since the diamond proxy pattern is designed to re-use already deployed facets in a proxy, this step is only necessary the first time you set a greenproof project or whenever you want to extand the available feature by providing new facets.

If the necessary facets are already deployed, jump to the proxy deployment section to configure a new diamond proxy contract.

1. Make sure you followed the setup and install steps above.

2. Navigate to the `deploy` repository:

```bash
cd worker-contract/packages/contracts/deploy
```

3. Run the `deployFacets.ts` script to deploy the facets of the diamond contract on volta or energy web chain (ewc) :

```bash
npm run deployFacets:volta
```
or

```bash
npm run deployFacets:ewc
```

Make sure to keep the facets informations up to date. The `deploy/utils/types/deployedFacets.ts` file provides the `DeployedFacets` variable that allows you to track the facets names, the network IDs on which they have been deployed and the deployed addresses on each network.

The DeployedFacets infos are structured as follows:

```json
 [
  {
    name: "IssuerFacet",
    deployInfos: [
      {
        networkID: 73799,
        address: "0xda83c0a8654460886c4b1Fe9114f0dA698EAc418",
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
        address: "0xbf02aF5Ff9044804298a406b9818A8a28cc8cA30",
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
        address: "0xB1988065817F813D3171a45281BE499a224f104E",
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
        address: "0xD3F0Cf7bF504964DF2a80720Ca3C204a32E2CDA9",
      },
      {
        networkID: 246,
        address: "",
      },
    ],
  },
]
```


### 2. Deploying a new greenproof instance (Diamond Proxy)

Before deploying a new greenproof instance, make sure you provided a `.env` file exposing the different variables needed to set the DID-based roles needed for your project:
- ISSUER_ROLE
- REVOKER_ROLE
- WORKER_ROLE
- CLAIMER_ROLE
- APPROVER_ROLE

In order to set each greenproof parameter, make sure to have them provided in the `.env` file (please refer to the provided [.env.example](https://github.com/energywebfoundation/worker-contract/blob/master/packages/contracts/.env.example)). Otherwise, default parameters defined into the [constant file](https://github.com/energywebfoundation/worker-contract/blob/master/packages/contracts/deploy/utils/constants.ts) will be used.

The `deployProxy.ts` script provides the logic used to deploy the diamond proxy contract.

Depending on the network you want to deploy your project on, run the following scripts command in your terminal :

- Deploying on volta:

```bash
npm run deployProxy:volta
```

- Deploying on mainnet (Energy Web Chain)

```bash
npm run deployProxy:ewc
```
### 3. Upgrading the Diamond Proxy Contract

The Diamond Pattern (EIP-2535) is a smart contract upgrade pattern that provides a more flexible and efficient way of managing functions within a smart contract. Unlike the proxy pattern, the diamond pattern allows for the upgrade of a small part of the contract without changing all of the code.

The `upgradeProxy.ts` script is used to upgrade the diamond proxy contract.

```bash
npm run upgradeProxy:volta
```

or 

```bash
npm run upgradeProxy:ewc
```

## Questions and Support

For questions and support please use Energy Web's [Discord channel](https://discord.com/channels/706103009205288990/843970822254362664)

Or reach out to us via email: 247enquiries@energyweb.org

## EW-DOS

The Energy Web Decentralized Operating System is a blockchain-based, multi-layer digital infrastructure.

The purpose of EW-DOS is to develop and deploy an open and decentralized digital operating system for the energy sector in support of a low-carbon, customer-centric energy future.

We develop blockchain technology, full-stack applications and middleware packages that facilitate participation of Distributed Energy Resources on the grid and create open market places for transparent and efficient renewable energy trading.

-   To learn about more about the EW-DOS tech stack, see our [documentation](https://app.gitbook.com/@energy-web-foundation/s/energy-web/).

-   For an overview of the energy-sector challenges our use cases address, go [here](https://app.gitbook.com/@energy-web-foundation/s/energy-web/our-mission).

For a deep-dive into the motivation and methodology behind our technical solutions, we encourage you to read our White Papers:

-   [Energy Web White Paper on Vision and Purpose](https://www.energyweb.org/reports/EWDOS-Vision-Purpose/)
-   [Energy Web White Paper on Technology Detail](https://www.energyweb.org/wp-content/uploads/2020/06/EnergyWeb-EWDOS-PART2-TechnologyDetail-202006-vFinal.pdf)

## Connect with Energy Web

-   [Twitter](https://twitter.com/energywebx)
-   [Discord](https://discord.com/channels/706103009205288990/843970822254362664)
-   [Telegram](https://t.me/energyweb)