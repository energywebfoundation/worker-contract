FROM node:16

RUN mkdir -p /deployment/

COPY ./ /deployment/

WORKDIR /deployment/packages/overseer

RUN yarn add concurrently

RUN yarn add wait-on

RUN yarn build:contract

CMD ["/bin/bash", "-c", "yarn concurrently \"yarn run:blockchain\" \"wait-on tcp:8545 && yarn deploy:local\""]

