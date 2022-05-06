FROM node:16-alpine

RUN mkdir -p /deployment/

COPY ../ /deployment/

WORKDIR /deployment

RUN yarn purge && yarn && yarn build
