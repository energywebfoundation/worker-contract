# Energy Web Worker Contract

Collection of packages from Energy Web to create Green Proof applications.

The Worker Contract enables anyone to build and run a digital tracking system for clean energy by leveraging decentralization easily and quickly. Primary components in this repo include  
1. Example of a decentralized logic execution for verifying data input and logic for creating digital proofs of clean energy
2. Smart contracts on Energy Web Chain (EWC) for creating verifiable digital proofs representing clean energy

An ideal user of Green Proofs is a platform operator with the following problem: “I am an organization trying to generate a digital representation of proof of greenness  but I cannot generate a green proof that is trusted by the community because there is no system that efficiently identifies and authorizes actors AND enables trusted data to enter the system.”

List of packages:

1. [@energyweb/algorithms-24-7](./packages/algorithms/)
2. [@energyweb/ddhub-client](./packages/ddhub-client/)
3. [@energyweb/contracts](./packages/contracts/)
4. [@energyweb/merkle-tree](./packages/merkle-tree/)
5. [@energyweb/overseer](./packages/overseer/)
6. [@energyweb/worker](./packages/worker/)

Examples of decentralized worker implementation:

1. [24/7 Energy Matching](./packages/worker-example/)

Smart Contract successfully passed a smart contract [audit](./docs/smart_contract_audit.pdf) by Hacken in February 2023.

## Flows

### 1. Reaching Consensus

```mermaid
sequenceDiagram

actor A as Data Provider
participant B as Broadcaster
participant C as Off-chain Worker 1
note over C: Worker Pool
participant D as Off-Chain Worker ...n
note over D: Worker Pool

Participant E as Voting Facet
note over E: Worker Contract
Participant F as Energy Web Chain
Participant H as Event Listener Node (overseer)

A->>B: Sends Data
B->>C: Multicast Data
B->>D: Multicast Data

C->>C: Executes Decentralized Logic
C->>C: Derives Merkle Tree Root Hash
D->>D: Executes Decentralized Logic
D->>D: Derives Merkle Tree Root Hash

C->>E: Cast Vote
D->>E: Cast Vote
E->>E: Reaches Consensus
E->>F: Notarize "Consensus Reached" Event
F->>H: Listens for Events
H->>H: Process Result of Voting
```

### 2. Green Proof Issuance
```mermaid
sequenceDiagram

actor Issuer
note over Issuer Facet: Worker Contract
participant Issuer Facet
participant Voting Facet
note over Voting Facet: Worker Contract

actor Token Holder



Issuer->>Issuer Facet: Request Token Issuance
activate Issuer Facet
Issuer Facet->>Voting Facet: Verification Request
Voting Facet->>Voting Facet: Verify if data is part of consensus
Voting Facet->>Issuer Facet: Verification Response
alt verification successful
    Issuer Facet->>Issuer Facet: Volume verification 
    alt verification successful
      Issuer Facet->>Token Holder: Issue Certificate
    end
else invalid data
    Issuer Facet->>Issuer: Reject Request
end    
deactivate Issuer Facet

```
## Development

### Prepare workspace packages
```shell
yarn purge && yarn && yarn build
```

## Release

We maintain two distribution channels: *latest* and *next*.
*next* can be treated as *alpha*. To release particular channel use branch:

Channel | Branch
--- | ---
next | `next`
master | `master`

### Local

1. Create personal access token on GitHub: https://github.com/settings/tokens
2. Set this token as `GH_TOKEN` env variable (or just prefix command below with `GH_TOKEN=xxxxx [...]`)
2. Run `yarn release`

### Github

1. Go to Github Actions
2. Select "Release" from the workflow list  
3. Run it manually using "Run workflow" button, and select branch for given channel (see above)
