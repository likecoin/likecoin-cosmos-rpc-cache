package cache

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/likecoin/likecoin-cosmos-rpc-cache/httpproxy"
)

type Storage struct {
	Header http.Header
	Body   []byte
}

var _ httpproxy.HTTPCacheHandler = &HTTPHandler{}

type HTTPHandler struct {
	Cache Cache
}

func NewCacheHTTPAdaptor(cache Cache) *HTTPHandler {
	return &HTTPHandler{
		Cache: cache,
	}
}

func (c *HTTPHandler) HandleRequest(req *http.Request, writer http.ResponseWriter) bool {
	key := httpproxy.RequestToKey(req)
	bz, err := c.Cache.Get(key)
	if err != nil {
		return false
	}
	storage := Storage{}
	err = json.Unmarshal(bz, &storage)
	if err != nil {
		return false
	}
	for k, v := range storage.Header {
		writer.Header()[k] = v
	}
	writer.WriteHeader(200)
	body := storage.Body
	for len(body) > 0 {
		n, err := writer.Write(body)
		if err != nil {
			// already handling response so return true
			return true
		}
		body = body[n:]
	}
	return true
}

func (c *HTTPHandler) ShouldCache(req *http.Request, res *http.Response) bool {
	// TODO: may need to cache POST and with request body
	return req.Method == "GET" && res.StatusCode == 200
}

func (c *HTTPHandler) DoCache(req *http.Request, res *http.Response, bodyReader io.ReadCloser) {
	defer bodyReader.Close()
	bodyBytes, err := io.ReadAll(bodyReader)
	if err != nil {
		return
	}
	key := httpproxy.RequestToKey(req)
	value, err := json.Marshal(Storage{
		Header: res.Header,
		Body:   bodyBytes,
	})
	if err != nil {
		return
	}
	c.Cache.Set(key, value, 0)
}
