## GreenProof Diamond architecture

The on-chain component of the greenProof core module is an upgradable proxied module, implementing the EIP-2535 standard, which is a standard recommended in the upgrades section of the EIP-1155 token standard documentation.

This upgradable pattern is called a Diamond standard architecture, where all smart contracts are organized as different facets of one single diamond. It ultimately allows users to trigger any on-chain function of any greePproof component using one single and stable contract address.

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

- Voting component : the voting logic is implemented in the [VotingFacet.sol](https://github.com/energywebfoundation/greenproof-sdk/blob/feat/GP-134/Issuer-Contract/packages/ew-greenProof-core-Diamond/contracts/facets/VotingFacet.sol) contract

- NFT Issuer component : the issuance component is encapsulated inside the [IssuerFacet.sol](https://github.com/energywebfoundation/greenproof-sdk/blob/feat/GP-134/Issuer-Contract/packages/ew-greenProof-core-Diamond/contracts/facets/IssuerFacet.sol) contract

Additional utility facets are provided by the [Diamond-2 reference implementation](https://github.com/mudgen/diamond-2-hardhat), which help conforming to the EIP-2535 standard specification:

- The [DiamondCutFacet.sol](https://github.com/energywebfoundation/greenproof-sdk/blob/feat/GP-134/Issuer-Contract/packages/ew-greenProof-core-Diamond/contracts/facets/DiamondCutFacet.sol) contract is a facet handling all the upgrading logic. (A cut, in the diamond’s industrie, is an action resulting in new facets creation, removal. This facet will be used to add, replace or remove granularly logic to the greenProof Diamond)

- A dedicated facet is provided with the [OwnershipFacet.sol](https://github.com/energywebfoundation/greenproof-sdk/blob/feat/GP-134/Issuer-Contract/packages/ew-greenProof-core-Diamond/contracts/facets/OwnershipFacet.sol) contract, which handles the implementation of the IEP-173 standard for the Diamond ownership.

- A [DiamondLoupeFacet.sol]() provides all standard [loupe functions](https://dev.to/mudgen/why-loupe-functions-for-diamonds-1kc3) for showing what facets and functions the diamond has.
