package jsonrpc

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/likecoin/likecoin-cosmos-rpc-cache/cache"
	"github.com/likecoin/likecoin-cosmos-rpc-cache/httpproxy"
)

type JsonRPCRequest struct {
	Version string                 `json:"jsonrpc"`
	Method  string                 `json:"method"`
	Params  map[string]interface{} `json:"params"`
	ID      interface{}            `json:"id"`
}

type JsonRPCResponse struct {
	Version string                 `json:"jsonrpc"`
	Result  map[string]interface{} `json:"result"`
	Error   map[string]interface{} `json:"error"`
	ID      interface{}            `json:"id"`
}

func ParseJsonRPCRequestBody(bz []byte) (*JsonRPCRequest, error) {
	jsonRPCReq := JsonRPCRequest{}
	err := json.Unmarshal(bz, &jsonRPCReq)
	if err != nil {
		return nil, err
	}
	if jsonRPCReq.Version != "2.0" {
		return nil, fmt.Errorf("not JSON RPC request (expect '2.0' at 'version' field, got '%s')", jsonRPCReq.Version)
	}
	return &jsonRPCReq, nil
}

func ParseJsonRPCResponseBody(bz []byte) (*JsonRPCResponse, error) {
	jsonRPCRes := JsonRPCResponse{}
	err := json.Unmarshal(bz, &jsonRPCRes)
	if err != nil {
		return nil, err
	}
	return &jsonRPCRes, nil
}

type Matcher interface {
	Match(*JsonRPCRequest) (shouldCache bool, timeout time.Duration)
}

type CacheController struct {
	Cache     cache.Cache
	Marshaler Marshaler
	Matchers  []Matcher
}

var _ httpproxy.HTTPCacheController = &CacheController{}

func NewCacheController(cache cache.Cache) *CacheController {
	return &CacheController{
		Cache:     cache,
		Marshaler: DefaultMarshaler{},
	}
}

func (m *CacheController) WithKeyMarshaler(keyMarshaler Marshaler) *CacheController {
	m.Marshaler = keyMarshaler
	return m
}

func (m *CacheController) AddMatchers(matchers ...Matcher) *CacheController {
	for _, matcher := range matchers {
		if matcher != nil {
			m.Matchers = append(m.Matchers, matcher)
		}
	}
	return m
}

func (m *CacheController) GetCache(reqContent *httpproxy.RequestContent) *httpproxy.ResponseContent {
	if reqContent.Method != "POST" {
		return nil
	}
	if reqContent.URL.Path != "" && reqContent.URL.Path != "/" {
		return nil
	}
	jsonRPCRequest, err := ParseJsonRPCRequestBody(reqContent.Body)
	if err != nil {
		return nil
	}
	key, err := m.Marshaler.MarshalKey(jsonRPCRequest)
	if err != nil {
		return nil
	}
	jsonRPCResponseBytes, err := m.Cache.Get(key)
	if err != nil {
		return nil
	}
	resContent, err := m.Marshaler.UnmarshalValue(jsonRPCRequest, jsonRPCResponseBytes)
	if err != nil {
		return nil
	}
	return resContent
}

func (m *CacheController) DoCache(reqContent *httpproxy.RequestContent, resContent *httpproxy.ResponseContent) {
	if resContent.StatusCode != 200 {
		return
	}
	jsonRPCRequest, err := ParseJsonRPCRequestBody(reqContent.Body)
	if err != nil {
		return
	}
	for _, matcher := range m.Matchers {
		shouldCache, timeoutSeconds := matcher.Match(jsonRPCRequest)
		if shouldCache {
			key, err := m.Marshaler.MarshalKey(jsonRPCRequest)
			if err != nil {
				return
			}
			value, err := m.Marshaler.MarshalValue(resContent)
			if err != nil {
				return
			}
			m.Cache.Set(key, value, timeoutSeconds)
			return
		}
	}
}

type All struct {
	TimeoutSeconds uint64
}

func (m All) Match(req *JsonRPCRequest) (bool, time.Duration) {
	fmt.Printf("Matching JSON RPC request: %v\n", req)
	return true, time.Duration(m.TimeoutSeconds) * time.Second
}
