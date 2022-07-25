function match(jsonRpcRequest, matchers) {
  for (const matcher of matchers) {
    if (typeof matcher === 'number') {
      return matcher;
    }
    const result = matcher(jsonRpcRequest);
    if (result !== 0) {
      return result;
    }
  }
  return 0;
}

function method(methodName, ...subMatchers) {
  return (jsonRpcRequest) => {
    if (jsonRpcRequest.method !== methodName) {
      return 0;
    }
    return match(jsonRpcRequest, subMatchers);
  };
}

function abciQuery(path, ...subMatchers) {
  return (jsonRpcRequest) => {
    if (!jsonRpcRequest.params || jsonRpcRequest.params.path !== path) {
      return 0;
    }
    return match(jsonRpcRequest, subMatchers);
  };
}

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

module.exports = {
  match,
  method,
  abciQuery,
  getMatchersFromConfig,
};
