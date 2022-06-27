package jsonrpc

import (
	"encoding/json"
	"time"
)

type JsonRpcMethod struct {
	MethodTimeoutSecondsMap map[string]uint64
}

func (m JsonRpcMethod) Match(req *JsonRPCRequest) (bool, time.Duration) {
	timeoutSeconds, ok := m.MethodTimeoutSecondsMap[req.Method]
	if !ok {
		timeoutSeconds, ok = m.MethodTimeoutSecondsMap[""]
		if !ok {
			return false, 0
		}
	}
	return true, time.Duration(timeoutSeconds) * time.Second
}

func (m JsonRpcMethod) MarshalJSON() ([]byte, error) {
	return json.Marshal(m.MethodTimeoutSecondsMap)
}

func (m *JsonRpcMethod) UnmarshalJSON(bz []byte) error {
	return json.Unmarshal(bz, &m.MethodTimeoutSecondsMap)
}
