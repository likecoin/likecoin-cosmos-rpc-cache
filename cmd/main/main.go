package main

import (
	"fmt"
	"net/http"
	"net/url"
	"os"

	"github.com/go-redis/redis/v8"
	"github.com/spf13/cobra"

	"github.com/likecoin/likecoin-cosmos-rpc-cache/cache"
	"github.com/likecoin/likecoin-cosmos-rpc-cache/controller/jsonrpc"
	"github.com/likecoin/likecoin-cosmos-rpc-cache/httpproxy"
	"github.com/likecoin/likecoin-cosmos-rpc-cache/log"
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
			return err
		}
		rpcEndpoint, err := cmd.Flags().GetString(cmdRPCEndpoint)
		if err != nil {
			return err
		}
		webListenAddr, err := cmd.Flags().GetString(cmdWebListenAddr)
		if err != nil {
			return err
		}
		err = log.SetupFromCmd(cmd)
		if err != nil {
			return err
		}

		rpcEndpointURL, err := url.Parse(rpcEndpoint)
		if err != nil {
			return err
		}
		jsonRpcConfig, err := jsonrpc.GetConfigFromCmd(cmd)
		if err != nil {
			return err
		}
		redisClient := redis.NewClient(&redis.Options{
			Addr: redisEndpoint,
		})
		redisCache := cache.NewRedisCache(redisClient)
		controller := jsonrpc.NewCacheController(redisCache).
			AddMatchers(jsonRpcConfig.Matchers()...)

		proxy := httpproxy.NewCachedReverseProxy(rpcEndpointURL, controller)

		server := http.Server{
			Addr:    webListenAddr,
			Handler: proxy,
		}

		log.L.Debugw("app initialized", "config", jsonRpcConfig)

		err = server.ListenAndServe()
		if err != http.ErrServerClosed {
			return err
		}
		return nil
	},
}

func setupFlags() {
	rootCmd.Flags().String(cmdRPCEndpoint, "localhost:26657", "the Tendermint RPC endpoint")
	rootCmd.Flags().String(cmdRedisEndpoint, "localhost:6379", "the Redis server endpoint")
	rootCmd.Flags().String(cmdWebListenAddr, "0.0.0.0:8080", "the address and port for providing web service")
	log.AddFlagsForCmd(rootCmd)
	jsonrpc.AddFlagsForCmd(rootCmd)
}

func main() {
	setupFlags()
	err := rootCmd.Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "exiting with error: %v\n", err)
		os.Exit(1)
	}
}
