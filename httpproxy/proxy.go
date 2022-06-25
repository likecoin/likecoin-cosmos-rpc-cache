package httpproxy

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
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

func (proxy *CachedReverseProxy) ServeHTTP(writer http.ResponseWriter, req *http.Request) {
	fmt.Printf("Request method: %s\n", req.Method)
	fmt.Printf("Request URL: %s\n", req.URL.String())
	reqContent, err := CloneRequestContent(req)
	if err != nil {
		writer.WriteHeader(500)
		writer.Write([]byte(err.Error()))
		return
	}
	cachedResContent := proxy.CacheController.GetCache(reqContent)
	if cachedResContent != nil {
		ServeResponseContent(writer, cachedResContent)
		return
	}
	resContent := ServeHTTPReverseProxy(req, writer, proxy.Target)
	proxy.CacheController.DoCache(reqContent, &resContent)
}
