# Greenproof techspec

# Overview

`Greenproof` contract is used to issue certificates certificates assuring certain properties of electricity generator. Certificated data is verified by voting among trusted parties. Only those parties who have acquired the necessary verifiable credentials are allowed to participate in the voting. To avoid security risks no actual data is stored onchain. Identifier of generation is a hash of generation data and it is called `inputHash`, generation data is represented by its merkle tree and is called `matchResult`.

# Function requirements

## Roles

- **Owner** : The only account allowed to upgrade contract, add or remove participants of voting, cancel expired votings and enable or disable reward of voters who have reached consensus.

- **Worker** : Account who is able to determine generator data by generation identifier. Since this process requires offchain data, workers are offchain nodes. Only nodes which are able to present `workerRole` verifiable credentials are allowed to vote. This credential role is delivred via EnergyWeb Self Sovreing Idendity stack, and requires workers to be EOA's with private keys.

- **Issuer** :  Party authorized to issue energy certificates and publicly disclose their associated data.

- **Generator** : Party which generates electricity energy and requests its certification.

- **Revoker** : An EOA account holding the `revoker` verifiable credential role. This type of accounts are authorized to revoke issued certificates.

- **Claimer** : Party authorized to claim issued certificates on behalf of users.


## Features

- Create new voting for (`inputHash`, `matchResult`) on the first vote casted for this pair. (Worker

- Enabling and disabling reward feature on the contract. (Owner)

- Reward workers who voted for (`inputHash`, `matchResult`), which has reached consensus.

- Make public voting (`inputHash`, `matchResult`), which reaches consensus.

- Mint energy attribute certificate to generator when workers reach consensus about generation data (Issuer). This certificate is subject of transferring/trading.

- Claim certificate. Claiming makes certificate untransferrable. Only claimed certificate can be used to obtain benefits from certificate ownership. (Generator)

- Expire voting which lasts more than a duration specified by `Greenproof` contract configuration (votingTimeLimit).

- Authorize worker to participate in voting. (Owner)

- Forbid previously authorized worker to vote several time in the same voting session. (Owner)

- Configure credentials required to become authorized worker. (Owner)

- Configure credentials required to issue worker credentials. (Owner)

- Configure credentials required to revoke worker credentials. (Owner)

- Upgrade deployed `Greenproof` contract.

## Use cases

- Owner authorizes worker to vote. The worker should have required credentials.
- Worker casts vote for (`inputHash`, `matchResult`). Each (`inputHash`, `matchResult`) pair uniquely identifies a voting `session`. Depending on the voting state following scenarios are possible:
  - No worker has voted for this pair yet. Voting session marked as `Started` and its start timestamp is set
  - Voting has already been started
    - Voting time limit has not expired
      - New vote is not enough to reach consensus. Vote is recorded
      - Total number of votes with new vote enough to reach consensus. Voting is marked as `Completed` and has been reached consensus; If the reward feature is enabled, workers participated in this voting are added to reward list; `matchResult` is added to winning matches of `inputHash`. Further votes are rejected for this completed session.

    - Voting time limit has been expired. Voting marked as `Completed` and has not been reached consensus. Further votes are rejected for this session.

- Issuer mints certificate to generator. Prerequisite for certification is consensus about certified data
- Generator claims owned certificate

# Technical requirements

## Architecture overview

## Contract information

### Greenproof

High level contract which plays two roles:

- to proxy calls to buisness logic components.
- to initialize and configure logic components.

Proxy is implemented as EIP-2535 https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2535.md.

#### Assets

- **DiamondConfig**:

  - address contractOwner - address of the Greenproof contract owner.

- **RolesConfig** :

  - bytes32 issuerRole - name of the EWF role credentials required to issue certificate.
  - bytes32 revokerRole - name of the EWF role credentials required to revoke minted certificate.
  - bytes32 workerRole - name of the EWF role credentials required to participate in voting.
  - bytes32 claimerRole - name of the EWF role credentials required to claim certificate.
  - address claimManagerAddress - address of the ClaimManager contract (https://github.com/energywebfoundation/ew-credentials/blob/develop/packages/onchain-claims/contracts/ClaimManager.sol).
  - address claimsRevocationRegistry - address of the CredentialRevocationRegistry contract.

  **VotingConfig** :

  - uint256 votingTimeLimit - time durating which workers allowed to vote.
  - uint256 rewardAmount - amount of ethers paid to workers which reached consensus.
  - uint256 majorityPercentage - share of the workers required to vote for the consensus to be reached.
  - uint256 revocablePeriod - time durating which revoker is allowed to revoke minted certificate.
  - bool rewardsEnabled - enables/disables reward payment of the winning workers.

  ### Functions

**constructor(DiamondConfig memory diamondConfig, VotingConfig memory votingConfig, RolesConfig memory rolesConfig)** initializes internal libraries
**updateClaimManager(address newaddress)** sets new address of `ClaimManager` and returns previous address.
**updateIssuerVersion(uint256 newVersion)** sets new version of issuer role and returns previous version.
**updateRevokerVersion(uint256 newVersion)** sets new version of revoker role and returns previous version.
**updateWorkerVersion(uint256 newVersion)** sets new version of worker role and returns previous version.
**setRewardsEnabled(bool rewardsEnabled)** disables or enables reward payment.

## VotingFacet

Exposes API for driving and configuraion of the voting. Internal methods are separated into LibVoting library. Since voting is identified by input hash its been aliased as `votingID`.
**Requirements**:

- Reward per consensus. There is no final, “right” match result. Consensus can be reached for any pair of (input hash, match result) and each will be rewarded if reward feature is enabled. This requires that the majority of workers are trusted, otherwise misbehaving workers will drain reward pool.

- If reward pool balance in insufficient and reward feature is enabled, then workers elligibilble to reward are added to a reward queue. Reward must be paid :
  
  - automatically after reward pool is replenished
  - manually by calling the `payReward` function
  
- Voting duration is limited. There are two reasons for this:

  - Workers expects to be paid in time

  - Match result probably useful only for some time

  Since Solidity doesn’t provide scheduling mechanism, expiration is checked and triggered on attemp to vote. Expired votings can also be completed explicitly.

- Votes, which are casted in completed voting are reverted

- Voting results must not be exposed until voting is completed. This includes both voted workers and voting that currently taking place

### Modifiers

- **onlyEnrolledWorkers(address operator)**: checks if operator has `workerRole` credentials.

- **onlyRevokedWorkers()**: checks if operator has NOT `workerRole` credentials.

- **onlyOwner()**: checks if sender is owner of the Greenproof contract.

- **onlyIssuer()**: checks if operator has `issuerRole` credentials.

- **onlyClaimer()**: checks if operator has `claimerRole` credentials.

- **onlyRevoker()**: checks if operator has `revokerRole` credentials.

- **onlyWhitelistedWorker()**: checks if sender is authorized to vote.

- **onlyWhenEnabledRewards()**: checks if reward featuure is enabled on the contract.

### Functions

- **vote(bytes32 votingID, bytes32 matchResult)**: Increases number of votes casted for (votingID, matchResult) and checks if voting should be completed. Rejects on vote in completed voting.

- **addWorker(address payable workerAddress)**: authorizes worker to participate in votings.

- **removeWorker(address workerToRemove)**: cancels worker's right to participate in votings.

- **cancelExpiredVotings(uint256 startVotingIndex, uint256 numberOfVotingsLimit, uint256 startSessionIndex, uint256 numberOfSessionsLimit)**: completes expired votings. For gas efficiency, ranges are provinded for sessions to be canceled: 
  - [startVotingIndex; startVotingIndex + numberOfVotingsLimit] gives range for votings
  - [startSessionIndex; startSessionIndex + numberOfSessionsLimit] gives range for sessions inside each voting


- **getNumberOfWorkers()**: returns number of workers allowed to participate in votings.

- **getWorkers()**: returns list of workers allowed to participate in votings.

- **isWhitelistedWorker(address worker)**: checks if worker is allowed to participate in votings.

- **getWorkerVotes(bytes32 votingID, address worker)**: returns `matchResult`'s casted by worker for votingID in those sessions which reached consensus.

- **getWinners(bytes32 votingID, bytes32 matchResult)**: returns workers, who participated in (votingID, matchResult) session, which reached consensus.

- **getWinningMatches(bytes32 votingID)**: returns `matchResult`'s casted for `votingID`, which reached consensus.

- **numberOfVotings()**: returns number of ever started votings.

- **replenishRewardPool()**: transfers ethers to this contract in order to be able to pay reward.

- **payReward(uint256 numberOfPays)**: proceed to payement of rewards if reward feature is enabled and there are sufficient funds in the contract.

## LibVoting

Containes voting functions used by facets.

### Assets

- **Voting**: Groups sessions, which belongs to the same voting.

  - bytes32[] sessionIDs - list of sessions started in this voting.
  - mapping(bytes32 => VotingSession) sessionIDToSession - sessions belonging to this voting.

- **VotingSession**: Represents voting for pair of (`votingID`, `matchResult`).

  - uint256 votesCount - Number of votes in this voting.
  - uint256 startTimestamp - Timestamp of first voting.
  - bytes32 matchResult - Winning match result.
  - mapping(address => bool) workerToVoted - Worker address to voted flag.
  - Status status -To decide which actions are currently applicable to voting.
  - bool isConsensusReached -If count of votes is enough for consensus.

- **VotingStorage**: Shareable data of the voting facet. Keeps voting and their configuration.

  - uint256 timeLimit - Limit of duration of a voting session. The vote is considered expired after `startTimestamp` + `timeLimit`.
  - uint256 numberOfWorkers - Number of workers taking part to vote. This will determine the consensus threshold.
  - uint256 majorityPercentage - Percentage of workers that have to vote on the same result to reach the consensus.
  - address payable[] whitelistedWorkers -List workers allowed to participate in votings.
  - bytes32[] votingIDs - List of votings with at least one started session.
  - mapping(bytes32 => Voting) votingIDToVoting - Quick access to a specific voting.
  - mapping(address => uint256) workerToIndex - Quick access to a specific worker's index inside the `workers` whitelist.
  - mapping(bytes32 => mapping(bytes32 => bytes32)) matches - votingID -> sessionID -> matchResult. Match results of those sessions which has reached consensus.
  - mapping(bytes32 => mapping(bytes32 => address payable[])) winners - votingID -> sessionID -> worker[]. Records the addresses of the workers in those sessions which has reached consensus.

- **Status**: enumeration containing lifetime stages of `VotingSession`.

  - NotStarted - No votes has been cast for session yet.
  - Started - Votes may be cast.
  - Completed - Session reached consensus or expired. Votes are no longer accepted.

- **WinningMatch(bytes32 votingID, bytes32 matchResult, uint256 indexed voteCount)**: Event emitted when consensus in voting sessing has been reached.
- **VotingSessionExpired(bytes32 votingID)**: Event emitted when voting lasts more than time limit.
- **NotWhitelisted(address operator)**: reason of rejection to vote to nonauthorized worker.
- **VotingAlreadyEnded()**: reason of rejection to vote in completed session.
- **AlreadyWhitelistedWorker(address worker)**: reason of rejection to authorize to participate in votings same worker.
- **SessionCannotBeRestarted(bytes32 inputHash, bytes32 matchResult)**: reason of rejection to vote again in the same session.

### Functions

- **init(uint256 timeLimit, uint256 majorityPercentage)**: Sets vogings configuration.
- **isSessionExpired(bytes32 votingID, bytes32 sessionID) internal view returns (bool)**: Checks if a voting session has exceeded the `timeLimit`.
- **recordVote(bytes32 votingID, bytes32 sessionID)**: Persist vote and checks if this vote allowed to reach consensus.
- **startSession(bytes32 votingID, bytes32 matchResult)**: Initializes session and corresponding voting if it wasn't initialized yet.
- **completeSession(bytes32 votingID, bytes32 sessionID)**: No further votes are accounted. If consensus has been reached then reward is paid and session results are exposed.
- **getSessionID(bytes32 votingID, bytes32 matchResult)**: Returns identifier of votinng for (`votingID`, `matchResult`).
- **revealMatch(bytes32 votingID, bytes32 sessionID)**: Makes public match result corresponding to (votingID, sessionID).
- **revealVoters(bytes32 votingID, bytes32 sessionID) internal**: Makes public workers voted for (`votingID`, `sessionID`).
- **reward(address payable[] memory voters)**: Queues payments of `voters`. Reward will paid as soon reward pool balance will become sufficient.
- **hasReachedConsensus(VotingSession storage session)**: Checks if `session` completed with consensus.
- **hasMajority(uint256 numberOfWinningVotes)**: Checks if `numberOfWinningVotes` enough to reach consensus.
- **getVoters(bytes32 votingID, bytes32 sessionID)**: Returns workers voted for (`votingID`, `matchResult`), if that voting has reached consensus.
- **getSession(bytes32 votingID, bytes32 sessionID)**: Returns session structure by its and voting idenfitiers.
- **isPartOfConsensus(bytes32 votingID, bytes32 dataHash, bytes32[] memory dataProof)**: Checks if `dataHash` is part of some `matchResult` merkle tree of `votingID`, which reached consensus.
- **hasAlreadyVoted(address operator, VotingSession storage session)**: Checks if `operator` has voted in `session`.
- **compareStrings(string memory a, string memory b)**: Checks if strings `a` and `b` has same content.
- **getStorage()**: Returns voting storage.

## IssuerFacet

Contract with main purpose of minting tokens certifying energy attributes. The basis for certification is voting for (`votingID`, `matchResult`), which completed with consensus.
Second purpose of contract is token trasferring.

### Modifiers

- **onlyIssuer()**: Checks if message sender has EWF `issuerRole` credentials.

### Functions

- **requestProofIssuance(
  bytes32 voteID,
  address generator,
  bytes32 dataHash,
  bytes32[] memory dataProof,
  uint256 amount,
  bytes32[] memory amountProof,
  string memory tokenUri
  )**: Issuer issues token certifying `amount` in generation `voteID` and transfers token to `generator`. Voting (`voteID`, `dataHash`) must have reached consensus.
- **discloseData(
  string memory key,
  string memory value,
  bytes32[] memory dataProof,
  bytes32 dataHash
  )**: Issuer checks that (`key`, `value`) pair is part of data, which Merkle tree root is `dataHash` and makes this pair public by adding it to `LibIssuer` storage.
- **getCertificateOwners(uint256 certificateID)**: Returns owners of certificate with identifier `certificateID`.
- **safeTransferFrom(
  address from,
  address to,
  uint256 id,
  uint256 amount,
  bytes memory data
  )**: Certificate owner transfers `amount` of certificate with identifier `id` to `to`.
- **safeBatchTransferFrom(
  address from,
  address to,
  uint256[] memory ids,
  uint256[] memory amounts,
  bytes memory data
  )**: Certificate owner transfers `amounts` of certificates with identifiers `ids` to `to`

  ## LibIssuer

  Contains certificate functions shared by facets.

  ### Assets

  - **ISSUER_STORAGE_POSITION**: Identifies slot in contract storage where issuance data is persisted.
  - **IssuerStorage**:
    - uint256 latestCertificateId - identifier of the last issued certificate.
    - uint256 revocablePeriod - time during which revoker can revoke certificate.
    - mapping(bytes32 => uint256) dataToCertificateID - (`matchResult` -> `certificateID`). Returns identifier of certificate corresponding to `matchResult`.
    - mapping(uint256 => IGreenProof.Certificate) certificates - (`certificateID` -> Certificate). Returns certificate by id.
      mapping(uint256 => mapping(address => uint256)) claimedBalances - (`certificateID` -> owner -> balance). Balances of claimed certificates.
    - mapping(bytes32 => mapping(string => string)) disclosedData - (`dataHash` -> `key` -> `value`). Disclosed (`key`, `value`) part of data with Merkle root tree `dataHash`.
    - mapping(bytes32 => mapping(string => bool)) isDataDisclosed - (`dataHash` -> `key` -> isDisclosed). Checks that data with key `key` is disclosed in data with Merkle root tree `dataHash`.
    - mapping(bytes32 => mapping(bytes32 => uint256)) voteToCertificates (`votingID` -> `dataHash` -> `certificateID`). Maps voting session, which completed with consensus to certificate id.
  - **ProofMinted(uint256 indexed certificateID, uint256 indexed volume, address indexed receiver)**: event emitted when new certificate is created.
  - **NonExistingCertificate(uint256 certificateID)**: reason of rejection when non issued certificate is requested.
  - **TimeToRevokeElapsed(uint256 certificateID, uint256 issuanceDate, uint256 revocablePeriod)**: reason of rejection, when revoker tries to revoke certificate which revocation period has expired.
  - **NotInConsensus(bytes32 voteID)**: reason of rejection of certification of the voting, which has not reached consensus.
  - **AlreadyCertifiedData(bytes32 dataHash)**: reason of rejection to certify generation data which has already been certified.

### Functions

- **init(uint256 revocablePeriod)**: initializes `revocablePeriod`.
- **incrementProofIndex()**: generates index of next certificate, when another one issued.
- **registerProof(
  bytes32 dataHash,
  address generatorAddress,
  uint256 amount,
  uint256 certificateID,
  bytes32 voteID
  )**: issues certificate with provided generation data.
- **registerClaimedProof(
  uint256 certificateID,
  address user,
  uint256 claimedAmount
  )**: Claims `clamedAmount` of certificate owned by `user.
- **isCertified(bytes32 data)**: Checks if certified for generation data `data` was issued and was not revoked.
- **getCertificate(uint256 certificateID, uint256 volume)**: Returns certificate by its identifier. Certificate contains generation and issuance data.
- **getStorage()**: returns contract slot containing issuance data.
- **getAmountHash(uint256 volume)**: creates leaves of Merkle tree generation data containing `volume`.

## ProofManagerFacet

Contract claiming certified energy generation.

### Modifiers

- **onlyRevoker()**: Checks that message sender is authorized to revoke issued certificate.
- **onlyClaimer()**: Checks that message sender is authorized to claim certificate.

### Functions

- **_claimProofFor(uint256 certificateID, address owner, uint256 amount)**: Claims `amount` of `certificateID` of `owner`.
- **claimProofFor(uint256 certificateID, address owner, uint256 amount)**: Public version of **_claimProofFor**.
- **claimProof(uint256 certificateID, uint256 amount)**: Does the same as **claimProofFor** except that claim owner is message sender.
- **revokeProof(uint256 certificateID)**: Revoker revokes certificate `certificateID`.
- **getProof(uint256 certificateID)**: Returns certificate by id.
- **getProofIdByDataHash(bytes32 dataHash)**: Returns certificate by Merkle tree root of generation data.
- **getProofsOf(address userAddress)**: Returns all certificates of user.
- **claimedBalanceOf(address user, uint256 certificateID)**: Returns claimed balance of user certificate.
- **verifyProof(
  bytes32 rootHash,
  bytes32 leaf,
  bytes32[] memory proof
  )**: Verifies that `leaf` is part Merkle tree with root `rootHash`.

## LibProofManager

Containes claim verification functions shared by facets.

### Functions

- **isApprovedForAll(address account, address operator)**: Verifies that `operator` is allowed to transfer certificate tokens of `account`.
- **verifyProof(
  bytes32 rootHash,
  bytes32 leaf,
  bytes32[] memory proof
  )**: Internal version of `ProofManagerFacet.verifyProof`.

## LibClaimManager

Containes functions, which verifies authorization in facets.

### Assests

- **CLAIM_MANAGER_STORAGE_POSITION**: Identifies slot in contract storage containing authorization configuration.
- **Role**: Struct identifying EWF role credentials.
  - bytes32 name - name of the role credentials.
  - uint256 version - version of role credential definition.
- **ClaimManagerStorage**: Containes configuration of the claim manager.
  - address claimManagerAddress - address of the claim manager.
  - address claimsRevocationRegistry - address of the claim revocation registry.
  - Role workerRole - identifier of the worker role.
  - Role issuerRole - identifier of the issuer role.
  - Role revokerRole - identifier of the revoker role.
  - Role claimerRole - identifier of the claimer role.

### Modifiers

- **onlyOwner()**: Checks that message sender is contract owner.

### Functions

- **hasRole(
  address subject,
  bytes32 role,
  uint256 version
  )**: Checks if `subject` has `role` of version `version`.
- **init(
  address claimManagerAddress,
  bytes32 issuerRole,
  bytes32 revokerRole,
  bytes32 workerRole,
  bytes32 claimerRole,
  address claimsRevocationRegistry
  )**: Sets claim manager configuration.
- **setIssuerVersion(uint256 newVersion) internal onlyOwner returns (uint256 oldRoleVersion)**: Sets version of the issuer role.
- **setWorkerVersion(uint256 newVersion) internal onlyOwner returns (uint256 oldRoleVersion)**: Sets version of the worker role.
- **setRevokerVersion(uint256 newVersion) internal onlyOwner returns (uint256 oldRoleVersion)**: Sets version of the revoker role.
- **setClaimerVersion(uint256 newVersion) internal onlyOwner returns (uint256 oldRoleVersion)**: Sets version of the claimer role.
- **setClaimManagerAddress(address newAddress) internal onlyOwner returns (address oldAddress)**: Sets address of the claim manager contract.
- **getStorage()**: Returns slot containing configuration of the claim manager library.
- **isEnrolled(Issuer | Revoker | Claimer | Worker)(address operator)**: Checks if `operator` has required role.

## LibReward

Library managing reward payment.

### Assets

- **RewardsDisabled()**: reason of the rejection to pay reward when rewarding is disabled.
- **RewardStorage**: Configuration of reward payment.

  - bool rewardsEnabled - determines whethers reward is enabled.
  - uint256 rewardAmount - reward amount.
  - address payable[] rewardQueue - list of scheduled payments.

  ### Modifiers

  - **onlyOwner()**: Verifies that message sender is contract owner.
  - **initRewards(uint256 rewardAmount, bool rewardsEnabled)**: Sets reward payment configuration.
  - **setRewardsEnabled(bool rewardsEnabled)**: Owner enables or disables reward payment.
  - **payReward()**: VotingFacet calls this function whenever consensus is reached.
  - **getStorage()**: Returns contract slot with reward payment configuration.
