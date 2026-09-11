#!/usr/bin/env bash
# CI infra lane: lints .github/workflows with a pinned, checksummed actionlint.
# Linux/amd64 only (GitHub's Ubuntu runners and Linux workstations).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

ACTIONLINT_VERSION="${ACTIONLINT_VERSION:-1.7.12}"
ACTIONLINT_SHA256="${ACTIONLINT_SHA256:-8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8}"

if [ "$(uname -s)" != "Linux" ] || [ "$(uname -m)" != "x86_64" ]; then
  echo "scripts/ci-infra.sh pins actionlint for linux/amd64 only" >&2
  exit 1
fi

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

archive="actionlint_${ACTIONLINT_VERSION}_linux_amd64.tar.gz"
curl -fsSL -o "$workdir/$archive" \
  "https://github.com/rhysd/actionlint/releases/download/v${ACTIONLINT_VERSION}/${archive}"
printf '%s  %s\n' "$ACTIONLINT_SHA256" "$workdir/$archive" | sha256sum -c -
tar -xzf "$workdir/$archive" -C "$workdir" actionlint

"$workdir/actionlint" -version
"$workdir/actionlint" -color
