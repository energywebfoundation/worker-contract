# Voting contract

### Usage
1. Run local node using `yarn node:start`
2. Build package using `yarn build`
3. Run tests using `yarn test`. Test command automatically rebuilds the project.
4. Deploy contract using `yarn deploy`
    - Build context is saved into `scripts/context.json`. You can find all the addresses in there.


Currently deployed contracts:
Commit SHA: `cd529a93f59fcf4d0c2a6d7d26e9a4058d0b73a8`
```json
{
  "deployedContracts": [
    {
      "name": "Certificate",
      "address": "0x998abeb3E57409262aE5b751f60747921B33613E"
    },
    {
      "name": "MatchVoting",
      "address": "0x70e0bA845a1A0F2DA3359C97E0285013525FFC49"
    }
  ]
}
```