# GREENPROOF-CONTRACTS

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

- `greenproof.spec.js` runs tests on the [proxy management](https://eip2535diamonds.substack.com/i/38730553/diamond-upgrades) and the [diamond inspection](https://eip2535diamonds.substack.com/p/why-on-chain-loupe-functions-are)

```
npm run greenproof:test

```

To run `coverage` test :

```
npm run coverage:test
```
