# Green proof voting manager

### Prerequisites
1. This package depends on `voting-contract` package. Make sure to build `voting-contract` by using `yarn build` in the root of the repository.
2. Blockchain node set up and running (for development) 
3. Metamask extension to interact with the voting contract

### Development
1. Set copy `.env.example` file to `.env` and fill in env variables.
2. Run `yarn start`
3. App should be accessible on `http://localhost:3000`

If you happen to restart your blockchain node make sure to reset the test accounts:
1. Open metamask extension
2. Click on account avatar in the right top corner
3. Click settings and select "Reset accounts" option.
