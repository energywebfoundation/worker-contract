FROM greenproofs:latest

ARG DIRECTORY

WORKDIR ${DIRECTORY}

CMD ["/bin/bash", "-c", "node dist/main"]
