package jsonrpc

import (
	"time"
)

type Block struct {
	LatestBlockTimeoutSeconds   uint64
	SpecificBlockTimeoutSeconds uint64
}

func (m Block) getLatestHeight() (bool, time.Duration) {
	return true, time.Duration(m.LatestBlockTimeoutSeconds) * time.Second
}

func (m Block) getSpecificHeight() (bool, time.Duration) {
	return true, time.Duration(m.SpecificBlockTimeoutSeconds) * time.Second
}

func (m Block) Match(req *JsonRPCRequest) (bool, time.Duration) {
	if req.Method != "block" {
		return false, 0
	}
	queryHeight, ok := req.Params["height"]
	if !ok {
		return m.getLatestHeight()
	}
	queryHeightStr, ok := queryHeight.(string)
	if !ok {
		// ???
		return m.getLatestHeight()
	}
	if queryHeightStr == "0" {
		return m.getLatestHeight()
	}
	return m.getSpecificHeight()
}
