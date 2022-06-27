package jsonrpc

import (
	"encoding/json"
	"time"

	"github.com/likecoin/likecoin-cosmos-rpc-cache/log"
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
	log.L.Debugw("matched abci_query", "path", queryPathStr)
	timeoutSeconds, ok := m.PathTimeoutSecondsMap[queryPathStr]
	if !ok {
		timeoutSeconds, ok = m.PathTimeoutSecondsMap[""]
		if !ok {
			return false, 0
		}
	}
	return true, time.Duration(timeoutSeconds) * time.Second
}

func (m AbciQuery) MarshalJSON() ([]byte, error) {
	return json.Marshal(m.PathTimeoutSecondsMap)
}

func (m *AbciQuery) UnmarshalJSON(bz []byte) error {
	return json.Unmarshal(bz, &m.PathTimeoutSecondsMap)
}
