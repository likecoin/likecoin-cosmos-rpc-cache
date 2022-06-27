package cache

import (
	"time"
)

type MemoryCache struct {
	Map map[string][]byte
}

var _ Cache = &MemoryCache{}

func NewMemoryCache() *MemoryCache {
	return &MemoryCache{
		Map: make(map[string][]byte),
	}
}

func (cache *MemoryCache) Get(key []byte) ([]byte, error) {
	bz, ok := cache.Map[string(key)]
	if !ok {
		return nil, ErrNotFound
	}
	return bz, nil
}

func (cache *MemoryCache) Set(key []byte, value []byte, _ time.Duration) error {
	cache.Map[string(key)] = value
	return nil
}
