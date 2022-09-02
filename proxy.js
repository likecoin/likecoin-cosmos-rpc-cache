const axios = require('axios');
const express = require('express');
const http = require('http');
const https = require('https');
const { createHash } = require('crypto');
const jsonStringify = require('fast-json-stable-stringify');

const { axiosOptions } = require('./config/config');
const { match } = require('./matcher');
const { publisher } = require('./gcloudPub');
const { PUBSUB_TOPIC_MISC, PUBSUB_TOPIC_MONITOR } = require('./constant');
const { parseJsonRpcParams } = require('./paramParsers/parser');
const { logBroadcastTx } = require('./logger/broadcast');

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

  async tryProcessFromCache(req, res, jsonRpcRequest) {
    const key = getKey(jsonRpcRequest);
    const value = await this.cache.get(key);
    if (value) {
      const resBody = {
        jsonrpc: '2.0',
        id: req.body.id,
        result: JSON.parse(value),
      };
      res.status(200).json(resBody).end();
    }
    return value;
  }

  async cacheProxyResult(proxyRes, jsonRpcRequest) {
    if (proxyRes.status !== 200 || proxyRes.data.error) {
      return;
    }
    const { result } = proxyRes.data;
    if (result) {
      const ttlSeconds = match(jsonRpcRequest, this.matchers);
      if (ttlSeconds > 0) {
        const key = getKey(jsonRpcRequest);
        const value = jsonStringify(result);
        try {
          await this.cache.set(key, value, ttlSeconds);
        } catch (err) {
          const error = err.stack || err;
          publisher.publish(PUBSUB_TOPIC_MISC, {
            logType: 'eventCacheSetError',
            error,
            key,
            value,
          });
          // eslint-disable-next-line no-console
          console.error(`Cannot set cache key ${key} to ${value}`);
          // eslint-disable-next-line no-console
          console.error(error);
        }
      }
    }
  }

  async forwardRequest(req, res) {
    const t = Date.now();
    const { method, url, body } = req;
    const config = {
      method,
      url,
    };
    if (method === 'POST') {
      config.data = body;
    }
    const proxyRes = await this.api(config);
    const contentType = proxyRes.headers['content-type'];
    res.status(proxyRes.status);
    if (contentType) {
      res.set('content-type', contentType);
    }
    res.send(proxyRes.data);
    return {
      proxyRes,
      log: {
        forwardDurationMs: Date.now() - t,
        proxyResponseCode: proxyRes.status,
      },
    };
  }

  getExpressMiddleware() {
    const bodyParser = express.json({
      limit: '100mb',
      type: () => true,
    });
    return async (req, res) => {
      bodyParser(req, res, async () => {
        const monitorLog = {
          logType: 'eventProxyRequest',
          httpMethod: req.method,
          httpURL: req.url.toString(),
        };
        const startTime = Date.now();
        try {
          if (req.method !== 'POST') {
            const { log } = await this.forwardRequest(req, res);
            Object.assign(monitorLog, log);
            return;
          }
          const { method, params } = req.body;
          const parsedParams = parseJsonRpcParams(method, params);
          const parsedRequest = {
            jsonRpcMethod: method,
            jsonRpcParams: parsedParams,
          };
          Object.assign(monitorLog, parsedRequest);
          logBroadcastTx(parsedRequest);
          const jsonRpcRequest = { method, params };
          const cachedValue = await this.tryProcessFromCache(req, res, jsonRpcRequest);
          Object.assign(monitorLog, { cacheHit: !!cachedValue });
          if (cachedValue) {
            return;
          }
          const { proxyRes, log } = await this.forwardRequest(req, res);
          Object.assign(monitorLog, log);
          await this.cacheProxyResult(proxyRes, jsonRpcRequest);
        } catch (err) {
          const error = err.stack || err;
          publisher.publish(PUBSUB_TOPIC_MISC, {
            ...monitorLog,
            logType: 'eventProxyError',
            error,
          });
        } finally {
          Object.assign(monitorLog, { processDurationMs: Date.now() - startTime });
          publisher.publish(PUBSUB_TOPIC_MONITOR, monitorLog);
        }
      });
    };
  }
}

module.exports = {
  CachedJsonRpcProxy,
};
