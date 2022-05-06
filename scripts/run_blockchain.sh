yarn add concurrently

yarn add wait-on

yarn build:contract

yarn concurrently "yarn run:blockchain" "wait-on tcp:8545 && yarn deploy:local"
