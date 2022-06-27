package jsonrpc

import (
	"encoding/json"
	"os"

	"github.com/spf13/cobra"
)

type Config struct {
	AbciQuery     *AbciQuery     `json:"abci_query,omitempty"`
	Block         *Block         `json:"block,omitempty"`
	JsonRpcMethod *JsonRpcMethod `json:"jsonrpc_method,omitempty"`
}

func (c *Config) Matchers() (matchers []Matcher) {
	if c.AbciQuery != nil && len(c.AbciQuery.PathTimeoutSecondsMap) > 0 {
		matchers = append(matchers, c.AbciQuery)
	}
	if c.Block != nil {
		matchers = append(matchers, c.Block)
	}
	if c.JsonRpcMethod != nil && len(c.JsonRpcMethod.MethodTimeoutSecondsMap) > 0 {
		matchers = append(matchers, c.JsonRpcMethod)
	}
	return matchers
}

const (
	cmdConfigFilePath = "jsonrpc-config-file"
)

func AddFlagsForCmd(cmd *cobra.Command) {
	cmd.Flags().String(cmdConfigFilePath, "jsonrpc-config.json", "the path to config file")
}

func GetConfigFromCmd(cmd *cobra.Command) (*Config, error) {
	configPath, err := cmd.Flags().GetString(cmdConfigFilePath)
	if err != nil {
		return nil, err
	}
	configBz, err := os.ReadFile(configPath)
	if err != nil {
		return nil, err
	}
	config := Config{}
	err = json.Unmarshal(configBz, &config)
	if err != nil {
		return nil, err
	}
	return &config, nil
}
