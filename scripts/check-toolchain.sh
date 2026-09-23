#!/usr/bin/env bash
# Toolchain parity gate — the release image and CI must be able to build the
# module.
#
# The API ships from ./Dockerfile (Render service + the OCI VM); CI uses
# actions/setup-go. Official golang images run with GOTOOLCHAIN=local, so the
# moment go.mod's `go` directive moves past the Dockerfile's `FROM golang:`
# tag, the image build dies on its very first step:
#
#   go: go.mod requires go >= 1.25.0 (running go 1.22.12; GOTOOLCHAIN=local)
#
# CI stays green in that state, so the breakage only surfaces on the deploy
# (CD is gated on CI, so it surfaces as "CI passed but nothing shipped") —
# the worst place to find it. CI runs this in the backend job; locally it is
# `make toolchain-check`.
set -euo pipefail

cd "$(dirname "$0")/.."

# major*1000 + minor so versions compare numerically: 1.26 -> 1026, 1.25.0 -> 1025.
ver() { awk -F. '{ printf "%d\n", $1 * 1000 + $2 }' <<<"$1"; }

mod=$(awk '/^go[[:space:]]+[0-9]/{ print $2; exit }' go.mod)
[ -n "$mod" ] || { echo "::error::could not read the 'go' directive from go.mod"; exit 1; }

img=$(grep -m1 -oE 'FROM[[:space:]]+golang:[0-9]+\.[0-9]+' Dockerfile | awk -F: '{ print $2 }')
[ -n "$img" ] || { echo "::error::could not read the Go image tag from Dockerfile"; exit 1; }

ci=$(grep -m1 -oE 'go-version:[[:space:]]*"[0-9]+\.[0-9]+' .github/workflows/ci.yml | tr -dc '0-9.')
[ -n "$ci" ] || { echo "::error::could not read go-version from .github/workflows/ci.yml"; exit 1; }

mod_v=$(ver "$mod")
img_v=$(ver "$img")
ci_v=$(ver "$ci")

if [ "$img_v" -lt "$mod_v" ]; then
  echo "::error::Dockerfile builds with Go $img but go.mod requires go >= $mod — the API image cannot build, so the Render/OCI deploy fails. Bump 'FROM golang:$img-alpine' to golang:${mod%.*}-alpine (or newer)."
  exit 1
fi

if [ "$ci_v" -lt "$mod_v" ]; then
  echo "::error::CI uses Go $ci but go.mod requires go >= $mod — bump go-version in .github/workflows/ci.yml."
  exit 1
fi

if [ "$img" != "$ci" ]; then
  echo "::warning::Dockerfile builds with Go $img while CI uses Go $ci — keep them in lockstep so a green CI means a deployable image."
fi

echo "toolchain OK — go.mod requires go >= $mod; Dockerfile image $img; CI $ci"
