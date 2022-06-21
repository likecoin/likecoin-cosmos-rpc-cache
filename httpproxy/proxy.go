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
	MultiWriter         io.Writer
	WriteHeaderCallback func(int)
}

func NewResponseWriterWrapper(responseWriter http.ResponseWriter, w io.Writer, writeHeaderCallback func(int)) *ResponseWriterWrapper {
	multiWriter := io.MultiWriter(responseWriter, w)
	return &ResponseWriterWrapper{
		ResponseWriter:      responseWriter,
		MultiWriter:         multiWriter,
		WriteHeaderCallback: writeHeaderCallback,
	}
}

func (w *ResponseWriterWrapper) Write(bz []byte) (int, error) {
	return w.MultiWriter.Write(bz)
}

func (w *ResponseWriterWrapper) WriteHeader(statusCode int) {
	w.ResponseWriter.WriteHeader(statusCode)
	if w.WriteHeaderCallback != nil {
		w.WriteHeaderCallback(statusCode)
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

func New(target *url.URL) *gin.Engine {
	engine := gin.New()
	engine.Use(func(ctx *gin.Context) {
		fmt.Printf("Method: %s\n", ctx.Request.Method)
		fmt.Printf("URI: %s\n", ctx.Request.URL)
		reverseProxy := httputil.NewSingleHostReverseProxy(target)
		r, w := io.Pipe()
		responseWriterWrapper := NewResponseWriterWrapper(ctx.Writer, w, func(statusCode int) {
			fmt.Printf("Response status: %d\n", statusCode)
		})
		reverseProxy.ModifyResponse = func(res *http.Response) error {
			res.Body = NewReadCloserWrapper(res.Body, func(error) {
				w.Close()
			})
			return nil
		}
		go func() {
			defer r.Close()
			bz, err := io.ReadAll(r)
			if err != nil {
				fmt.Printf("Error when reading response: %v\n", err)
				return
			}
			fmt.Printf("Multiplex response: '%s'\n", string(bz))
		}()
		reverseProxy.ServeHTTP(responseWriterWrapper, ctx.Request)
		// ctx.String(200, "OK")
	})
	return engine
}

func Run(target *url.URL, listenAddr []string) error {
	engine := New(target)
	return engine.Run(listenAddr...)
}
