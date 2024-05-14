#!/bin/bash

set -e

VERSION="$1"

if [[ -z "$VERSION" ]]; then
  echo "Need a version"
  exit 1
fi

if [[ "$VERSION" == v* ]]; then
    VERSION="${VERSION#v}"
fi

echo "Building version $VERSION"

GOOS_LIST="darwin linux windows"
GOARCH_LIST="amd64 arm64"

rm -rf ./bin/*
for goos in $GOOS_LIST; do
  for goarch in $GOARCH_LIST; do
    echo "Building ssme for $goos-$goarch"
    CGO_ENABLED=0 GOOS="$goos" GOARCH="$goarch" go build -ldflags="-s -w -X main.Version=$VERSION" -o "bin/ssme-${goos}-${goarch}" cmd/ssme/main.go
  done
done

echo "Generating package.json"
cat << EOF > package.json
{
  "name": "ssme",
  "version": "$VERSION",
  "main": "node/index.js",
  "bin": {
    "ssme": "node/index.js"
  },
  "description": "AWS SSM ParameterStore editor",
  "repository": {
    "type": "git",
    "url": "https://github.com/chanyeinthaw/ssme"
  },
  "keywords": [
    "cli",
    "ssm",
    "aws",
    "parameter-store"
  ],
  "author": "Chan Nyein Thaw",
  "license": "MIT",
  "files": [
    "bin"
  ]
}
EOF


