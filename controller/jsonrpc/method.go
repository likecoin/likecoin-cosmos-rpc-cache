package jsonrpc

type Method struct {
	Method         string
	TimeoutSeconds uint64
}

func (m Method) Match(req *JsonRPCRequest) (bool, uint64) {
	if req.Method != m.Method {
		return false, 0
	}
	return true, m.TimeoutSeconds
}
