package cache

import (
	"errors"
	"time"
)

type Cache interface {
	Get(key []byte) ([]byte, error)
	Set(key []byte, value []byte, timeout time.Duration) error
}

var ErrNotFound error = errors.New("not found")
