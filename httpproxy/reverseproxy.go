package httpproxy

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/likecoin/likecoin-cosmos-rpc-cache/log"
)

type ResponseWriterWrapper struct {
	http.ResponseWriter
	StatusCode int
	BodyBuffer *bytes.Buffer
}

func NewResponseWriterWrapper(writer http.ResponseWriter) *ResponseWriterWrapper {
	return &ResponseWriterWrapper{
		ResponseWriter: writer,
		BodyBuffer:     &bytes.Buffer{},
	}
}

func (w *ResponseWriterWrapper) Write(buf []byte) (int, error) {
	n, err := w.ResponseWriter.Write(buf)
	if n > 0 {
		w.BodyBuffer.Write(buf[:n])
	}
	return n, err
}

func (w *ResponseWriterWrapper) WriteHeader(statusCode int) {
	w.ResponseWriter.WriteHeader(statusCode)
	w.StatusCode = statusCode
}

type ResponseContent struct {
	StatusCode int
	Header     http.Header
	Body       []byte
}

func (w *ResponseWriterWrapper) GetResponseContent() ResponseContent {
	return ResponseContent{
		StatusCode: w.StatusCode,
		Header:     w.Header().Clone(),
		Body:       w.BodyBuffer.Bytes(),
	}
}

func ServeHTTPReverseProxy(req *http.Request, writer http.ResponseWriter, target *url.URL) ResponseContent {
	reverseProxy := httputil.NewSingleHostReverseProxy(target)
	proxyWriter := NewResponseWriterWrapper(writer)
	reverseProxy.ServeHTTP(proxyWriter, req)
	return proxyWriter.GetResponseContent()
}

func ServeResponseContent(writer http.ResponseWriter, content *ResponseContent) error {
	header := writer.Header()
	body := content.Body
	for k := range header {
		delete(header, k)
	}
	for k, v := range content.Header {
		header[k] = v
	}
	header.Set("Content-Length", fmt.Sprintf("%d", len(body)))
	writer.WriteHeader(content.StatusCode)
	log.L.Debugw("reverse proxy serving content", "length", len(body), "content", string(body))
	for len(body) > 0 {
		n, err := writer.Write(body)
		if err != nil {
			return err
		}
		body = body[n:]
	}
	return nil
}
