#!/usr/bin/env bash
# Sync the vendored praxis OpenAPI contract from the upstream repo at a pinned
# tag, then regenerate the typed client. praxis is PRIVATE, so the contract is
# pulled with the authenticated `gh` CLI (a public raw URL cannot be used in
# package.json/CI without leaking a token). The contract is the single source of
# truth; the committed snapshot must always match the pinned tag (see ADR-0016
# and the `praxis-upstream-source` provenance note).
#
# Usage:
#   ./scripts/sync-praxis-contract.sh            # sync to the pinned tag
#   ./scripts/sync-praxis-contract.sh --check    # verify snapshot matches tag (no write)
set -euo pipefail

REPO="nathan-tsien/praxis"
TAG="${PRAXIS_TAG:-openapi-v0.3.0}"
CONTRACT_DIR="$(cd "$(dirname "$0")/.." && pwd)/src/lib/praxis/contract"

fetch() { # $1 = repo path, writes to stdout
  gh api "repos/${REPO}/contents/$1?ref=${TAG}" -H "Accept: application/vnd.github.raw"
}

if [[ "${1:-}" == "--check" ]]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  fetch "openapi/praxis.yaml" > "$tmp/praxis.yaml"
  fetch "openapi/schemas.json" > "$tmp/schemas.json"
  if ! diff -q "$CONTRACT_DIR/praxis.yaml" "$tmp/praxis.yaml" || \
     ! diff -q "$CONTRACT_DIR/schemas.json" "$tmp/schemas.json"; then
    echo "ERROR: vendored praxis contract drifted from upstream tag ${TAG}." >&2
    echo "Run: pnpm --filter @ash/web sync:praxis" >&2
    exit 1
  fi
  echo "vendored praxis contract matches upstream tag ${TAG}"
  exit 0
fi

echo "Syncing praxis contract from ${REPO}@${TAG} ..."
fetch "openapi/praxis.yaml" > "$CONTRACT_DIR/praxis.yaml"
fetch "openapi/schemas.json" > "$CONTRACT_DIR/schemas.json"
echo "Wrote contract to $CONTRACT_DIR. Regenerate with: pnpm --filter @ash/web gen:praxis"
