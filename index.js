const express = require('express');

const { RedisCache } = require('./cache');
const { CachedJsonRpcProxy } = require('./proxy');
const { listenAddr, rpcEndpoint, redisConfig, cache: matchersConfig } = require('./config');
const { method, abciQuery } = require('./matcher.js');
const config = require('./config');

function getMatchersFromConfig(matchersConfig) {
  const matchers = [];
  if (matchersConfig.method) {
    for (const [methodName, ...subMatchers] of Object.entries(matchersConfig.method)) {
      matchers.push(method(methodName, ...subMatchers));
    }
  }
  if (matchersConfig.abciQuery) {
    for (const [path, ...subMatchers] of Object.entries(matchersConfig.abciQuery)) {
      matchers.push(abciQuery(path, ...subMatchers));
    }
  }
  if (matchersConfig.default) {
    matchers.push(matchersConfig.default);
  }
  return matchers;
}

const cache = new RedisCache(redisConfig);
const proxy = new CachedJsonRpcProxy(rpcEndpoint, cache);
proxy.addMatchers(...getMatchersFromConfig(matchersConfig));

const app = express();

app.get('/healthz', (req, res) => res.sendStatus(200));
app.use(proxy.getExpressMiddleware());
app.listen(listenAddr.port, listenAddr.hostname);
