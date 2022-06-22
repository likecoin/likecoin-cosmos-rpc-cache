package httpproxy

import (
	"fmt"
	"net/http"
)

func KeyByMethodAndURI(method string, uri string) []byte {
	return []byte(fmt.Sprintf("%s!%s", method, uri))
}

func RequestToKey(req *http.Request) []byte {
	if req.Method == "GET" {
		return KeyByMethodAndURI(req.Method, req.URL.String())
	}
	// TODO: include request body for POST
	return KeyByMethodAndURI(req.Method, req.URL.String())
}
