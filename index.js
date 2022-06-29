const express = require('express');

const { RedisCache } = require('./cache');
const { CachedJsonRpcProxy } = require('./proxy');
const { listenAddr, rpcEndpoint, redisConfig, cacheMatchers } = require('./config');

const cache = new RedisCache(redisConfig);
const proxy = new CachedJsonRpcProxy(rpcEndpoint, cache);
proxy.addMatchers(...cacheMatchers);

const app = express();

app.use(proxy.getExpressMiddleware());
app.listen(listenAddr.port, listenAddr.hostname);
