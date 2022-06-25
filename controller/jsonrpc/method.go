package jsonrpc

import (
	"time"
)

type Method struct {
	MethodTimeoutSecondsMap map[string]uint64
}

func (m Method) Match(req *JsonRPCRequest) (bool, time.Duration) {
	timeoutSeconds, ok := m.MethodTimeoutSecondsMap[req.Method]
	if !ok {
		timeoutSeconds, ok = m.MethodTimeoutSecondsMap[""]
		if !ok {
			return false, 0
		}
	}
	return true, time.Duration(timeoutSeconds) * time.Second
}
