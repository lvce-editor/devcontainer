FROM alpine:3.23.3
COPY bridge.sh /usr/local/bin/playground-bridge
COPY workspace /workspace
RUN chmod 755 /usr/local/bin/playground-bridge /workspace/hello.sh
WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/playground-bridge"]
