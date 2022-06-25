package httpproxy

import (
	"fmt"
)

type DummyController struct{}

var _ HTTPCacheController = DummyController{}

func (DummyController) GetCache(req *RequestContent) *ResponseContent {
	fmt.Printf("GetCache, method = %s, URL = %s, header = %v, body = '%s'\n", req.Method, req.URL.String(), req.Header, string(req.Body))
	return nil
}

func (DummyController) DoCache(req *RequestContent, res *ResponseContent) {
}
