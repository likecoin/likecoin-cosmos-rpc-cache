package cache

import (
	"errors"
)

type Cache interface {
	Get(key []byte) ([]byte, error)
	Set(key []byte, value []byte, timeoutSeconds uint64) error
}

var ErrNotFound error = errors.New("not found")
