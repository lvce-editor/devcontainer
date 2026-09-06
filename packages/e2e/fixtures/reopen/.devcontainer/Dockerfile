FROM mcr.microsoft.com/devcontainers/base:ubuntu24.04
RUN mkdir /container-workspace && printf 'built inside the devcontainer\n' > /container-workspace/container-only.txt
RUN printf '\000\377\200\101' > /container-workspace/binary.bin
