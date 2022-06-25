package jsonrpc

import (
	"time"
)

type AbciQuery struct {
	PathTimeoutSecondsMap map[string]uint64
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
	if !ok {
		return false, 0
	}
	timeoutSeconds, ok := m.PathTimeoutSecondsMap[queryPathStr]
	if !ok {
		timeoutSeconds, ok = m.PathTimeoutSecondsMap[""]
		if !ok {
			return false, 0
		}
	}
	return true, time.Duration(timeoutSeconds) * time.Second
}
