FROM node:16

RUN mkdir -p /deployment/

COPY ./ /deployment/

WORKDIR /deployment/packages/example

CMD ["/bin/bash", "-c", "node dist/main"]