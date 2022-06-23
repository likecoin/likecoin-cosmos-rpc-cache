package jsonrpc

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/likecoin/likecoin-cosmos-rpc-cache/httpproxy"
)

type Marshaler interface {
	MarshalKey(*JsonRPCRequest) ([]byte, error)
	MarshalValue(*httpproxy.ResponseContent) ([]byte, error)
	UnmarshalValue(*JsonRPCRequest, []byte) (*httpproxy.ResponseContent, error)
}

type JsonMarshaler struct{}

func (JsonMarshaler) MarshalKey(req *JsonRPCRequest) ([]byte, error) {
	return json.Marshal(map[string]interface{}{
		"method": req.Method,
		"params": req.Params,
	})
}

type JsonRPCResponseStorage struct {
	StatusCode int
	Header     http.Header
	Result     map[string]interface{}
}

func (JsonMarshaler) MarshalValue(resContent *httpproxy.ResponseContent) ([]byte, error) {
	jsonRPCResponse, err := ParseJsonRPCResponseBody(resContent.Body)
	if err != nil {
		return nil, err
	}
	if len(jsonRPCResponse.Error) > 0 {
		return nil, fmt.Errorf("not catching JSON RPC errors")
	}
	storage := JsonRPCResponseStorage{
		StatusCode: resContent.StatusCode,
		Header:     resContent.Header,
		Result:     jsonRPCResponse.Result,
	}
	return json.Marshal(storage)
}

func (JsonMarshaler) UnmarshalValue(req *JsonRPCRequest, bz []byte) (*httpproxy.ResponseContent, error) {
	storage := JsonRPCResponseStorage{}
	err := json.Unmarshal(bz, &storage)
	if err != nil {
		return nil, err
	}
	realJsonRPCResponse := map[string]interface{}{
		"jsonrpc": req.Version,
		"result":  storage.Result,
		"id":      req.ID,
	}
	body, err := json.Marshal(realJsonRPCResponse)
	if err != nil {
		return nil, err
	}
	resContent := httpproxy.ResponseContent{
		StatusCode: storage.StatusCode,
		Header:     storage.Header,
		Body:       body,
	}
	return &resContent, nil
}

type DefaultMarshaler = JsonMarshaler
