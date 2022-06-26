package main

import (
	"encoding/json"
	"fmt"
	"net/http"
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
	cmdConfigPath    = "config"
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
		configPath, err := cmd.Flags().GetString(cmdConfigPath)
		if err != nil {
			return err
		}

		rpcEndpointURL, err := url.Parse(rpcEndpoint)
		if err != nil {
			return err
		}

		configBz, err := os.ReadFile(configPath)
		if err != nil {
			return err
		}
		config := jsonrpc.Config{}
		err = json.Unmarshal(configBz, &config)
		if err != nil {
			return err
		}

		redisClient := redis.NewClient(&redis.Options{
			Addr: redisEndpoint,
		})
		redisCache := cache.NewRedisCache(redisClient)
		controller := jsonrpc.NewCacheController(redisCache).
			AddMatchers(config.AbciQuery, config.Block, config.JsonRpcMethod)

		proxy := httpproxy.NewCachedReverseProxy(rpcEndpointURL, controller)

		server := http.Server{
			Addr:    webListenAddr,
			Handler: proxy,
		}
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
	rootCmd.Flags().String(cmdConfigPath, "config.json", "the path to config file")
}

func main() {
	setupFlags()
	err := rootCmd.Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "exiting with error: %v\n", err)
		os.Exit(1)
	}
}
