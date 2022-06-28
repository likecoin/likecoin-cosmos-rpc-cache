# LikeCoin Cosmos RPC cache

A tool for caching RPC calls using Redis.

## Build

`go build -o BINARY_OUTPUT cmd/main/main.go`

## Run

`main --rpc RPC_ENDPOINT --redis REDIS_ADDRESS --listen WEB_SERVING_ADDRESS_AND_PORT --jsonrpc-config-file CACHE_CONFIG_PATH`

See `docker-compose.yml` for example.

## RPC config

There are currently 3 types of caches:

- ABCI query: caching calls to the `abci_query` JSON RPC method.
  - configurate by a JSON object, where keys are ABCI query paths and values are cache timeout in seconds.
- block: caching calls to the `block` and `block_result` JSON RPC method.
  - configurate by a JSON object, where `latest_block` is cache timeout for latest block in seconds, `specific_block` is cache timeout for specific blocks in seconds.
- method: caching other JSON RPC methods.
  - configurate by a JSON object, where keys are JSON RPC method names and values are cache timeout in seconds.

Set timeout to `0` (or simply delete the key for JSON objects) to disable caching.

If a JSON object has empty string (`""`) as key, then it will act as the default matcher, i.e. matching every requests didn't get matched from more specific matchers.
