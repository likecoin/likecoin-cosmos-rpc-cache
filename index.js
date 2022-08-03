const express = require('express');
const helmet = require('helmet');

const { RedisCache } = require('./cache');
const { CachedJsonRpcProxy } = require('./proxy');
const {
  listenAddr,
  rpcEndpoint,
  redisConfig,
  cache: matchersConfig,
} = require('./config/config');
const { getMatchersFromConfig } = require('./matcher');

const cache = new RedisCache(redisConfig);
const proxy = new CachedJsonRpcProxy(rpcEndpoint, cache);
proxy.addMatchers(...getMatchersFromConfig(matchersConfig));

const app = express();
app.use(helmet());
app.get('/healthz', (req, res) => res.sendStatus(200));
app.use(proxy.getExpressMiddleware());
app.listen(listenAddr.port, listenAddr.hostname);
