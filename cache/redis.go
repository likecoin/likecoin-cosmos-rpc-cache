package cache

type RedisCache struct {
	// TODO
}

var _ Cache = &RedisCache{}

func NewRedisCache() *RedisCache {
	// TODO
	return &RedisCache{}
}

func (cache *RedisCache) Get(key []byte) ([]byte, error) {
	// TODO
	return nil, ErrNotFound
}

func (cache *RedisCache) Set(key []byte, value []byte, timeoutSeconds uint64) error {
	// TODO
	return nil
}
