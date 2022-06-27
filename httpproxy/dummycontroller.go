package httpproxy

import (
	"github.com/likecoin/likecoin-cosmos-rpc-cache/log"
)

type DummyController struct{}

var _ HTTPCacheController = DummyController{}

func (DummyController) GetCache(req *RequestContent) *ResponseContent {
	log.L.Debugw("in DummyController.GetCache", "header", req.Header, "body", string(req.Body))
	return nil
}

func (DummyController) DoCache(req *RequestContent, res *ResponseContent) {
	log.L.Debugw("in DummyController.DoCache", "status_code", res.StatusCode, "response_header", res.Header, "response_body", string(res.Body))
}
