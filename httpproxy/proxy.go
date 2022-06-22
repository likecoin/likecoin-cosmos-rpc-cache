package httpproxy

import (
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
)

type ReadCloserWrapper struct {
	io.ReadCloser
	CopyWriter    *io.PipeWriter
	CloseCallback func(error)
}

func NewReadCloserWrapper(readCloser io.ReadCloser) *ReadCloserWrapper {
	return &ReadCloserWrapper{
		ReadCloser: readCloser,
	}
}

func (c *ReadCloserWrapper) SetCloseCallback(closeCallback func(error)) *ReadCloserWrapper {
	c.CloseCallback = closeCallback
	return c
}

func (c *ReadCloserWrapper) SetCopyWriter(w *io.PipeWriter) *ReadCloserWrapper {
	c.CopyWriter = w
	return c
}

func (c *ReadCloserWrapper) Read(buf []byte) (n int, readErr error) {
	n, readErr = c.ReadCloser.Read(buf)
	if c.CopyWriter == nil {
		return
	}
	if readErr != nil && readErr != io.EOF {
		// when read error happens, the pipe should also get it so it can abort the cache
		c.CopyWriter.CloseWithError(readErr)
		return
	}
	buf = buf[:n]
	for len(buf) > 0 {
		w, writeErr := c.CopyWriter.Write(buf)
		if writeErr != nil {
			return
		}
		buf = buf[w:]
	}
	return
}

func (c *ReadCloserWrapper) Close() error {
	err := c.ReadCloser.Close()
	if c.CloseCallback != nil {
		c.CloseCallback(err)
	}
	return err
}

type CachedReverseProxyHandler interface {
	// Run before forwarding the request to backend
	// If returned true, then the returned bytes
	PreHook(req *http.Request) ([]byte, bool)
	ShouldCache(req *http.Request, statusCode int) bool
	Cache(req *http.Request, statusCode int, body []byte)
}

type HTTPCacheHandler interface {
	HandleRequest(req *http.Request, writer http.ResponseWriter) bool
	ShouldCache(req *http.Request, res *http.Response) bool
	DoCache(req *http.Request, res *http.Response, bodyReader io.ReadCloser)
}

type CachedReverseProxy struct {
	Target       *url.URL
	CacheHandler HTTPCacheHandler
}

func NewCachedReverseProxy(target *url.URL, handler HTTPCacheHandler) *CachedReverseProxy {
	return &CachedReverseProxy{
		Target:       target,
		CacheHandler: handler,
	}
}

func (proxy *CachedReverseProxy) Serve(req *http.Request, writer http.ResponseWriter) {
	if proxy.CacheHandler.HandleRequest(req, writer) {
		return
	}
	reverseProxy := httputil.NewSingleHostReverseProxy(proxy.Target)
	reverseProxy.ModifyResponse = func(res *http.Response) error {
		if !proxy.CacheHandler.ShouldCache(req, res) {
			return nil
		}
		r, w := io.Pipe()
		res.Body = NewReadCloserWrapper(res.Body).
			SetCopyWriter(w).
			SetCloseCallback(func(error) {
				w.Close()
			})
		go func() {
			defer r.Close()
			proxy.CacheHandler.DoCache(req, res, r)
		}()
		return nil
	}
	reverseProxy.ServeHTTP(writer, req)
}

func NewRouterWithProxy(proxy *CachedReverseProxy) *gin.Engine {
	// TODO: remove gin and use builtin net/http handle func
	engine := gin.New()
	engine.Use(func(ctx *gin.Context) {
		proxy.Serve(ctx.Request, ctx.Writer)
	})
	return engine
}

func Run(proxy *CachedReverseProxy, listenAddr []string) error {
	engine := NewRouterWithProxy(proxy)
	return engine.Run(listenAddr...)
}
