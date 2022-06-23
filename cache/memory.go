package cache

import "fmt"

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
		fmt.Println("MemoryCache.Get returning ErrNotFound")
		return nil, ErrNotFound
	}
	fmt.Printf("MemoryCache.Get returning bytes '%s'\n", string(bz))
	return bz, nil
}

func (cache *MemoryCache) Set(key []byte, value []byte, _ uint64) error {
	fmt.Printf("MemoryCache.Set, key='%s', value='%s'\n", string(key), string(value))
	cache.Map[string(key)] = value
	return nil
}
