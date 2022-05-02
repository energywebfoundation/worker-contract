FROM node:16

RUN mkdir -p /deployment/worker

COPY ./ /deployment/worker
COPY ../node_modules/ /deployment/node_modules

WORKDIR /deployment/worker

# RUN yarn

# RUN yarn build

CMD ["/bin/bash", "-c", "node dist/main"]