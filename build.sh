#!/usr/bin/env bash

PWD=`pwd`
WD=`cd $(dirname "$0") && pwd -P`

cd "${WD}"

docker buildx build . -t like-cosmos-rpc-cache --platform linux/amd64
docker tag like-cosmos-rpc-cache:latest us.gcr.io/likecoin-foundation/like-cosmos-rpc-cache:latest
docker -- push us.gcr.io/likecoin-foundation/like-cosmos-rpc-cache:latest

cd "${PWD}"
