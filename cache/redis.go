package cache

import (
	"context"
	"time"

	"github.com/go-redis/redis/v8"
)

type RedisCache struct {
	Client         *redis.Client
	ContextCreator func() context.Context
}

var _ Cache = &RedisCache{}

func NewRedisCache(client *redis.Client) *RedisCache {
	return &RedisCache{
		Client:         client,
		ContextCreator: context.Background,
	}
}

func (cache *RedisCache) WithContextCreator(f func() context.Context) *RedisCache {
	cache.ContextCreator = f
	return cache
}

func (cache *RedisCache) Get(key []byte) ([]byte, error) {
	value, err := cache.Client.Get(cache.ContextCreator(), string(key)).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, ErrNotFound
		}
		// TODO: log
		return nil, err
	}
	return []byte(value), nil
}

func (cache *RedisCache) Set(key []byte, value []byte, timeout time.Duration) error {
	return cache.Client.SetEX(cache.ContextCreator(), string(key), value, timeout).Err()
}
