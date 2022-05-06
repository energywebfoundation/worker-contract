FROM node:16

RUN mkdir -p /deployment/

COPY ../ /deployment/

WORKDIR /deployment

RUN yarn purge
RUN yarn
RUN yarn build
