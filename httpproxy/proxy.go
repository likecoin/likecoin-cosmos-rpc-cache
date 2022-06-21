package httpproxy

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
)

var _ http.ResponseWriter = &ResponseWriterWrapper{}

type ResponseWriterWrapper struct {
	http.ResponseWriter
	AdditionalWriter    io.Writer
	WriteHeaderCallback func(int) io.Writer
}

func NewResponseWriterWrapper(responseWriter http.ResponseWriter, writeHeaderCallback func(int) io.Writer) *ResponseWriterWrapper {
	return &ResponseWriterWrapper{
		ResponseWriter:      responseWriter,
		AdditionalWriter:    nil,
		WriteHeaderCallback: writeHeaderCallback,
	}
}

func (w *ResponseWriterWrapper) Write(bz []byte) (int, error) {
	n, err := w.ResponseWriter.Write(bz)
	if w.AdditionalWriter != nil {
		w.AdditionalWriter.Write(bz[:n])
	}
	return n, err
}

func (w *ResponseWriterWrapper) WriteHeader(statusCode int) {
	w.ResponseWriter.WriteHeader(statusCode)
	if w.WriteHeaderCallback != nil {
		w.AdditionalWriter = w.WriteHeaderCallback(statusCode)
	}
}

type ReadCloserWrapper struct {
	io.ReadCloser
	CloseCallback func(error)
}

func NewReadCloserWrapper(readCloser io.ReadCloser, closeCallback func(error)) *ReadCloserWrapper {
	return &ReadCloserWrapper{
		ReadCloser:    readCloser,
		CloseCallback: closeCallback,
	}
}

func (c *ReadCloserWrapper) Close() error {
	err := c.ReadCloser.Close()
	if c.CloseCallback != nil {
		c.CloseCallback(err)
	}
	return err
}

type InterceptReverseProxy struct {
	Callback func(req *http.Request, body []byte)
}

func NewInterceptReverseProxy(callback func(*http.Request, []byte)) *InterceptReverseProxy {
	return &InterceptReverseProxy{
		Callback: callback,
	}
}

func (proxy *InterceptReverseProxy) Serve(req *http.Request, writer http.ResponseWriter, target *url.URL) {
	reverseProxy := httputil.NewSingleHostReverseProxy(target)
	var r io.ReadCloser
	var w io.WriteCloser
	closeBody := func(error) {
		if w != nil {
			w.Close()
		}
	}
	responseWriterWrapper := NewResponseWriterWrapper(writer, func(statusCode int) io.Writer {
		if statusCode != 200 {
			return nil
		}
		r, w = io.Pipe()
		go func() {
			defer r.Close()
			bz, err := io.ReadAll(r)
			if err != nil {
				fmt.Printf("Error when reading response: %v\n", err)
				return
			}
			proxy.Callback(req, bz)
		}()
		return w
	})
	reverseProxy.ModifyResponse = func(res *http.Response) error {
		res.Body = NewReadCloserWrapper(res.Body, closeBody)
		return nil
	}
	reverseProxy.ServeHTTP(responseWriterWrapper, req)
}

func NewRouterWithProxy(target *url.URL, proxy *InterceptReverseProxy) *gin.Engine {
	engine := gin.New()
	engine.Use(func(ctx *gin.Context) {
		proxy.Serve(ctx.Request, ctx.Writer, target)
	})
	return engine
}

func Run(target *url.URL, listenAddr []string, proxy *InterceptReverseProxy) error {
	engine := NewRouterWithProxy(target, proxy)
	return engine.Run(listenAddr...)
}
