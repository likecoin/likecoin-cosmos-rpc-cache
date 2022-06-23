package httpproxy

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
)

type RequestContent struct {
	Method string
	URL    *url.URL
	Header http.Header
	Body   []byte
}
type HTTPCacheController interface {
	GetCache(reqContent *RequestContent) *ResponseContent
	DoCache(reqContent *RequestContent, resContent *ResponseContent)
}

type CachedReverseProxy struct {
	Target          *url.URL
	CacheController HTTPCacheController
}

func NewCachedReverseProxy(target *url.URL, handler HTTPCacheController) *CachedReverseProxy {
	return &CachedReverseProxy{
		Target:          target,
		CacheController: handler,
	}
}

type BufferReadCloser struct {
	*bytes.Buffer
}

func (b BufferReadCloser) Close() error {
	return nil
}

func CloneReadCloser(r io.ReadCloser) ([]byte, io.ReadCloser, error) {
	bz, err := io.ReadAll(r)
	if err != nil {
		return nil, nil, err
	}
	buf := &bytes.Buffer{}
	buf.Write(bz)
	return bz, BufferReadCloser{buf}, nil
}

func CloneRequestContent(req *http.Request) (*RequestContent, error) {
	method := req.Method
	url := req.URL
	header := req.Header.Clone()
	body, reader, err := CloneReadCloser(req.Body)
	if err != nil {
		return nil, err
	}
	req.Body.Close()
	req.Body = reader
	return &RequestContent{
		Method: method,
		URL:    url,
		Header: header,
		Body:   body,
	}, nil
}

func (proxy *CachedReverseProxy) Serve(ctx *gin.Context) {
	fmt.Printf("Request method: %s\n", ctx.Request.Method)
	fmt.Printf("Request URL: %s\n", ctx.Request.URL.String())
	reqContent, err := CloneRequestContent(ctx.Request)
	if err != nil {
		ctx.AbortWithError(500, err)
		return
	}
	cachedResContent := proxy.CacheController.GetCache(reqContent)
	if cachedResContent != nil {
		ServeResponseContent(ctx.Writer, cachedResContent)
		return
	}
	resContent := ServeHTTPReverseProxy(ctx.Request, ctx.Writer, proxy.Target)
	proxy.CacheController.DoCache(reqContent, &resContent)
}

func Run(proxy *CachedReverseProxy, listenAddr []string) error {
	engine := gin.New()
	engine.Use(proxy.Serve)
	return engine.Run(listenAddr...)
}
