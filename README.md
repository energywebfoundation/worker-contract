# Energyweb Green Proof

Collection of packages from Energyweb *Green Proof* project used to create Green Proof applications.

List of packages:

1. [@energyweb/greenproof-algorithms](./packages/algorithms/)
2. [@energyweb/greenproof-ddhub-client](./packages/ddhub-client/)
3. [@energyweb/greenproof-contracts](./packages/greenproof-contracts/)
4. [@energyweb/greenproof-merkle-tree](./packages/merkle-tree/)
5. [@energyweb/greenproof-overseer](./packages/overseer/)
6. [@energyweb/greenproof-worker-base](./packages/worker/)
7. [@energyweb/greenproof-24/7-worker](./packages/worker-example/)

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
note over E: Green Proofs Contract
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
note over Issuer Facet: Green Proof Contract
participant Issuer Facet
participant Voting Facet
note over Voting Facet: Green Proof Contract

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
