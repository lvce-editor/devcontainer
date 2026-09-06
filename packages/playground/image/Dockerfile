FROM alpine:3.23.3@sha256:25109184c71bdad752c8312a8623239686a9a2071e8825f20acb8f2198c3f659
COPY bridge.sh /usr/local/bin/playground-bridge
COPY workspace /workspace
RUN chmod 755 /usr/local/bin/playground-bridge /workspace/hello.sh
WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/playground-bridge"]
