const { createClient } = require('redis');

class RedisCache {
  constructor(redisConfig) {
    this.client = createClient(redisConfig);
    this.clientConnectPromise = this.client.connect();
  }

  async get(key) {
    await this.clientConnectPromise;
    return this.client.get(key);
  }

  async set(key, value, ttlSeconds) {
    await this.clientConnectPromise;
    return this.client.setEx(key, ttlSeconds, value);
  }
}

module.exports = {
  RedisCache,
};
