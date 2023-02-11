# Energyweb Green Proof

Collection of packages from Energyweb *Green Proof* project used to create Green Proof applications.

List of packages:

1. [@energyweb/greenproof-algorithms](./packages/algorithms/)
2. [@energyweb/greenproof-ddhub-client](./packages/ddhub-client/)
3. [@energyweb/greenproof-contracts](./packages/greenproof-contracts/)
4. [@energyweb/greenproof-merkle-tree](./packages/merkle-tree/)
5. [@energyweb/greenproof-overseer](./packages/overseer/)
6. [@energyweb/greenproof-worker](./packages/worker/)

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
