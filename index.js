const express = require('express');
const helmet = require("helmet");

const { RedisCache } = require('./cache');
const { CachedJsonRpcProxy } = require('./proxy');
const {
  listenAddr,
  rpcEndpoint,
  redisConfig,
  cache: matchersConfig,
} = require('./config');
const { method, abciQuery } = require('./matcher');

function getMatchersFromConfig(config) {
  const matchers = [];
  if (config.method) {
    for (const [methodName, ...subMatchers] of Object.entries(config.method)) {
      matchers.push(method(methodName, ...subMatchers));
    }
  }
  if (config.abciQuery) {
    for (const [path, ...subMatchers] of Object.entries(config.abciQuery)) {
      matchers.push(abciQuery(path, ...subMatchers));
    }
  }
  if (config.default) {
    matchers.push(config.default);
  }
  return matchers;
}

const cache = new RedisCache(redisConfig);
const proxy = new CachedJsonRpcProxy(rpcEndpoint, cache);
proxy.addMatchers(...getMatchersFromConfig(matchersConfig));

const app = express();
app.use(helmet());
app.get('/healthz', (req, res) => res.sendStatus(200));
app.use(proxy.getExpressMiddleware());
app.listen(listenAddr.port, listenAddr.hostname);
