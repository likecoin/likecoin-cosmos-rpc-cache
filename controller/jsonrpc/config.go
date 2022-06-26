package jsonrpc

type Config struct {
	AbciQuery     *AbciQuery     `json:"abci_query,omitempty"`
	Block         *Block         `json:"block,omitempty"`
	JsonRpcMethod *JsonRpcMethod `json:"jsonrpc_method,omitempty"`
}
