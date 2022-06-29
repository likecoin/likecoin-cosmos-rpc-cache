const { createClient } = require('redis');

class RedisCache {
  constructor(redisConfig) {
    this.client = createClient(redisConfig);
    this.clientConnectPromise = this.client.connect();
  }

  async get(key) {
    await this.clientConnectPromise;
    return await this.client.get(key);
  }

  async set(key, value, timeout) {
    await this.clientConnectPromise;
    return await this.client.setEx(key, timeout, value);
  }
}

module.exports = {
  RedisCache,
};
