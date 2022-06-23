package main

import (
	"fmt"
	"net/url"
	"os"

	"github.com/go-redis/redis/v8"
	"github.com/spf13/cobra"

	"github.com/likecoin/likecoin-cosmos-rpc-cache/cache"
	"github.com/likecoin/likecoin-cosmos-rpc-cache/controller/jsonrpc"
	"github.com/likecoin/likecoin-cosmos-rpc-cache/httpproxy"
)

const (
	cmdRPCEndpoint   = "rpc"
	cmdRedisEndpoint = "redis"
	cmdWebListenAddr = "listen"
)

var rootCmd = &cobra.Command{
	RunE: func(cmd *cobra.Command, args []string) error {
		redisEndpoint, err := cmd.Flags().GetString(cmdRedisEndpoint)
		if err != nil {
			panic(err)
		}
		rpcEndpoint, err := cmd.Flags().GetString(cmdRPCEndpoint)
		if err != nil {
			panic(err)
		}
		rpcEndpointURL, err := url.Parse(rpcEndpoint)
		if err != nil {
			panic(err)
		}
		webListenAddrs, err := cmd.Flags().GetStringSlice(cmdWebListenAddr)
		if err != nil {
			panic(err)
		}
		fmt.Printf("%s, %s, %v\n", redisEndpoint, rpcEndpoint, webListenAddrs)
		redisClient := redis.NewClient(&redis.Options{
			Addr: redisEndpoint,
		})
		redisCache := cache.NewRedisCache(redisClient)
		controller := jsonrpc.NewCacheController("/", redisCache).
			AddMatchers(jsonrpc.All{60})

		proxy := httpproxy.NewCachedReverseProxy(rpcEndpointURL, controller)
		return httpproxy.Run(proxy, webListenAddrs)
	},
}

func setupFlags() {
	rootCmd.Flags().String(cmdRPCEndpoint, "localhost:26657", "the Tendermint RPC endpoint")
	rootCmd.Flags().String(cmdRedisEndpoint, "localhost:6379", "the Redis server endpoint")
	rootCmd.Flags().StringSlice(cmdWebListenAddr, []string{"0.0.0.0:8080"}, "the address and port for providing web service")
}

func main() {
	setupFlags()
	err := rootCmd.Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "exiting with error: %v\n", err)
		os.Exit(1)
	}
}
