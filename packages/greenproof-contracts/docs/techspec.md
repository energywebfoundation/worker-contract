# Greenproof techspec

# Overview

`Diamond` contract is used to issue certificates certificates assuring certain properties of electricity generator. Certificated data is verified by voting among trusted parties. Only those parties who have acquired the necessary verifiable credentials are allowed to participate in the voting. To avoid security risks no actual data is stored onchain. Identifier of generation is a hash of generation data and it is called `inputHash`, generation data is represented by its merkle tree and is called `matchResult`

# Function requirements

## Roles

**Owner** The only account allowed to upgrade contract, add or remove participants of voting, cancel expired votings and enable or disable reward of voters, who has reached consensus
**Worker** Account who able to determine generator data by generation identifier. Since this process requires offchain data workers are offchain nodes. Only node which are able to present certain verifiable credentials are allowed to vote
**Issuer** Party authorized to mint energy certificates and make their data public

## Features

- Create new voting for (`inputHahs`, `matchResult`) on the first vote casted for this pair (Worker)
- Reward workers who voted for (`inputHahs`, `matchResult`), which has reaches consensus
- Make public voting (`inputHahs`, `matchResult`), which reaches consensus
- Expire voting which lasts more then it is specified by `Diamond` contract configuration
- Authorize worker to participate in voting (Owner)
- Forbid previously authorized worker to participate in voting (Owner)
- Configure credentials required by become authorized worker (Owner)
- Configure credentials required to issue worker credentials (Owner)
- Configure credentials required to revoke worker credentials (Owner)
- Upgrade deployed `Diamond` contract

## Use cases

- Owner authorizes worker to vote. The worker should have required credentials
