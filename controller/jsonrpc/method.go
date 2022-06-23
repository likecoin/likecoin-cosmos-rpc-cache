package jsonrpc

import (
	"time"
)

type Method struct {
	Method         string
	TimeoutSeconds uint64
}

func (m Method) Match(req *JsonRPCRequest) (bool, time.Duration) {
	if req.Method != m.Method {
		return false, 0
	}
	return true, time.Duration(m.TimeoutSeconds) * time.Second
}
