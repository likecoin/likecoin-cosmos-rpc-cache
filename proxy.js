const axios = require('axios');
const express = require('express');
const http = require('http');
const https = require('https');
const { createHash } = require('crypto');
const jsonStringify = require('fast-json-stable-stringify');

const { axiosOptions } = require('./config.js');

const { match } = require('./matcher.js');

function getKey(jsonRpcRequest) {
  const key = jsonStringify(jsonRpcRequest);
  if (process.env.NODE_ENV === 'development') {
    return jsonStringify(jsonRpcRequest);
  }
  const hash = createHash('sha1');
  return hash.update(key).digest('base64')
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

  async _forwardRequest(req, res) {
    const proxyRes = await this.api({
      method: req.method,
      url: req.url,
      data: req.body,
    });
    res.status(proxyRes.status).json(proxyRes.data).end();
    return proxyRes;
  }

  getExpressMiddleware() {
    return async (req, res, ) => {
      express.json()(req, res, async () => {
        if (req.method !== 'POST') {
          this._forwardRequest(req, res);
          return;
        }
        const jsonRpcRequest = { method: req.body.method, params: req.body.params };
        const key = getKey(jsonRpcRequest)
        const cachedResult = await this.cache.get(key);
        if (cachedResult) {
          const resBody = {
            jsonrpc: '2.0',
            id: req.body.id,
            result: JSON.parse(cachedResult),
          };
          res.status(200).json(resBody).end();
          return;
        }
        const proxyRes = await this._forwardRequest(req, res);
        if (proxyRes.status !== 200 || proxyRes.data.error) {
          return;
        }
        const ttlSeconds = match(jsonRpcRequest, this.matchers)
        if (ttlSeconds > 0) {
          this.cache.set(key, jsonStringify(proxyRes.data.result), ttlSeconds);
          return;
        }
      });
    }
  }
}

module.exports = {
  CachedJsonRpcProxy,
};