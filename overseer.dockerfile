FROM node:16

RUN mkdir -p /deployment/

COPY ./ /deployment/

WORKDIR /deployment/packages/overseer

RUN yarn build

CMD ["/bin/bash", "-c", "node dist/main"]