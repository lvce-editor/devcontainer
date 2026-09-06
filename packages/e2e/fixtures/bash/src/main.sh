#!/usr/bin/env bash
set -euo pipefail
message=$(<src/message.txt)
printf "%s\n" "$message"
