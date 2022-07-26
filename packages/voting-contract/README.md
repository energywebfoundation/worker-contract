# Voting contract

### Usage
1. Run local node using `npx hardhard node`
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
         "address": "0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf"
      },
      {
         "name": "MatchVoting",
         "address": "0x9d4454B023096f34B160D6B654540c56A1F81688"
      }
   ]
}
```