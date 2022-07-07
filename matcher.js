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
  }
}

function abciQuery(path, ...subMatchers) {
  return (jsonRpcRequest) => {
    if (jsonRpcRequest.params?.path !== path) {
      return 0;
    }
    return match(jsonRpcRequest, subMatchers);
  }
}

module.exports = {
  match,
  method,
  abciQuery,
}
