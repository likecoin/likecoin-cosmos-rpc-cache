const axios = require('axios');
const express = require('express');
const http = require('http');
const https = require('https');
const { createHash } = require('crypto');
const jsonStringify = require('fast-json-stable-stringify');

const { axiosOptions } = require('./config/config');
const { match } = require('./matcher');
const { getPubsubLogger } = require('./gcloudPub');
const { PUBSUB_TOPIC_MISC, PUBSUB_TOPIC_MONITOR } = require('./constant');

function getKey(jsonRpcRequest) {
  const key = jsonStringify(jsonRpcRequest);
  if (process.env.NODE_ENV === 'development') {
    return jsonStringify(jsonRpcRequest);
  }
  const hash = createHash('sha1');
  return hash.update(key).digest('base64');
}

class CachedJsonRpcProxy {
  constructor(rpcEndpoint, cache) {
    this.api = axios.create({
      baseURL: rpcEndpoint,
      validateStatus: false,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
      ...axiosOptions,
    });
    this.cache = cache;
    this.matchers = [];
  }

  addMatchers(...matchers) {
    for (const matcher of matchers) {
      if (matcher) {
        this.matchers.push(matcher);
      }
    }
    return this;
  }

  async forwardRequest(req, res) {
    const { method, url, body } = req;
    const config = {
      method,
      url,
    };
    if (method === 'POST') {
      config.data = body;
    }
    const proxyRes = await this.api(config);
    const contentType = proxyRes.headers['content-type']
    res.status(proxyRes.status)
    if (contentType) res.set('content-type', contentType)
    res.send(proxyRes.data);
    return proxyRes;
  }

  getExpressMiddleware() {
    const bodyParser = express.json({
      limit: '100mb',
    });
    return async (req, res) => {
      const miscLogger = getPubsubLogger(PUBSUB_TOPIC_MISC);
      const monitorLogger = getPubsubLogger(PUBSUB_TOPIC_MONITOR);
      const startTime = Date.now();
      bodyParser(req, res, async () => {
        try {
          monitorLogger.append({
            logType: 'eventProxyRequest',
            httpMethod: req.method,
            httpURL: req.url.toString(),
          });
          if (req.method !== 'POST') {
            await this.forwardRequest(req, res);
            return;
          }
          const jsonRpcRequest = { method: req.body.method, params: req.body.params };
          monitorLogger.append({
            jsonRpcMethod: jsonRpcRequest.method,
            // TODO: parse jsonRpcRequest
          });
          const key = getKey(jsonRpcRequest);
          const cachedResult = await this.cache.get(key);
          monitorLogger.append({ cacheHit: !!cachedResult });
          if (cachedResult) {
            const resBody = {
              jsonrpc: '2.0',
              id: req.body.id,
              result: JSON.parse(cachedResult),
            };
            res.status(200).json(resBody).end();
            return;
          }
          const forwardStart = Date.now();
          const proxyRes = await this.forwardRequest(req, res);
          monitorLogger.append({
            forwardDurationMs: Date.now() - forwardStart,
          });
          if (proxyRes.status !== 200 || proxyRes.data.error) {
            return;
          }
          const { result } = proxyRes.data;
          if (result) {
            const ttlSeconds = match(jsonRpcRequest, this.matchers);
            if (ttlSeconds > 0) {
              const value = jsonStringify(result);
              try {
                await this.cache.set(key, value, ttlSeconds);
              } catch (error) {
                miscLogger.append({
                  logType: 'eventCacheError',
                  error,
                  // TODO: more details of the request
                });
                /* eslint-disable no-console */
                console.error(`cannot set key ${key} to ${value}`);
                console.error(error);
                /* eslint-enable no-console */
              }
              return;
            }
          }
        } finally {
          monitorLogger.append({ processDurationMs: Date.now() - startTime });
          miscLogger.commit();
          monitorLogger.commit();
        }
      });
    };
  }
}

module.exports = {
  CachedJsonRpcProxy,
};
