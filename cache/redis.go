package cache

import (
	"context"
	"time"

	"github.com/go-redis/redis/v8"

	"github.com/likecoin/likecoin-cosmos-rpc-cache/log"
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
		log.L.Warnw("error when getting from Redis cache", "error", err, "key", string(key))
		return nil, err
	}
	return []byte(value), nil
}

func (cache *RedisCache) Set(key []byte, value []byte, timeout time.Duration) error {
	err := cache.Client.SetEX(cache.ContextCreator(), string(key), value, timeout).Err()
	if err != nil {
		log.L.Warnw("error when setting Redis cache", "error", err, "key", string(key), "value", string(value), "timeout", timeout.String())
	}
	return err
}
