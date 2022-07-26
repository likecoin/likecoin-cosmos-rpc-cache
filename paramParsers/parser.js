const { broadcastTxParser } = require('./tx');

const parsers = {};

function parseJsonRpcParams(method, params) {
  const parser = parsers[method];
  if (!parser) {
    return params;
  }
  return parser(params);
}

function registerParser(method, parser) {
  if (parsers[method] !== undefined) {
    throw new Error(`Parser for JSON RPC method ${method} already registered`);
  }
  parsers[method] = parser;
}

registerParser('broadcast_tx_sync', broadcastTxParser);
registerParser('broadcast_tx_async', broadcastTxParser);
registerParser('broadcast_tx_commit', broadcastTxParser);

module.exports = {
  registerParser,
  parseJsonRpcParams,
};
