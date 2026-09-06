FROM alpine:3.23.3@sha256:25109184c71bdad752c8312a8623239686a9a2071e8825f20acb8f2198c3f659
RUN apk add --no-cache docker=29.5.2-r0 nodejs=24.18.1-r0
COPY alpine.tar /opt/playground/alpine.tar
COPY image/ /opt/playground/
COPY bundle/ /opt/playground/
COPY workspace/ /workspace/
WORKDIR /workspace
ENTRYPOINT ["sh", "/opt/playground/boot.sh"]
