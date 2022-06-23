package jsonrpc

import (
	"time"
)

type AbciQuery struct {
	Path           string
	TimeoutSeconds uint64
}

func (m AbciQuery) Match(req *JsonRPCRequest) (bool, time.Duration) {
	if req.Method != "abci_query" {
		return false, 0
	}
	queryPath, ok := req.Params["path"]
	if !ok {
		return false, 0
	}
	queryPathStr, ok := queryPath.(string)
	if !ok || queryPathStr != m.Path {
		return false, 0
	}
	return true, time.Duration(m.TimeoutSeconds) * time.Second
}
