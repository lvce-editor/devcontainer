FROM alpine:3.23.3@sha256:25109184c71bdad752c8312a8623239686a9a2071e8825f20acb8f2198c3f659 AS seed-builder
RUN apk add --no-cache build-base
COPY image/seed-random.c /seed-random.c
RUN cc -Os -Wall -Wextra -Werror /seed-random.c -o /seed-random

FROM alpine:3.23.3@sha256:25109184c71bdad752c8312a8623239686a9a2071e8825f20acb8f2198c3f659
RUN apk add --no-cache docker-engine=29.5.2-r0 docker-cli=29.5.2-r0 nodejs=24.18.1-r0
COPY alpine.tar /opt/playground/alpine.tar
COPY image/ /opt/playground/
COPY --from=seed-builder /seed-random /opt/playground/seed-random
COPY bundle/ /opt/playground/
COPY workspace/ /workspace/
WORKDIR /workspace
ENTRYPOINT ["sh", "/opt/playground/boot.sh"]
