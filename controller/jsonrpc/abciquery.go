package jsonrpc

type AbciQuery struct {
	Path           string
	TimeoutSeconds uint64
}

func (m AbciQuery) Match(req *JsonRPCRequest) (bool, uint64) {
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
	return true, m.TimeoutSeconds
}
