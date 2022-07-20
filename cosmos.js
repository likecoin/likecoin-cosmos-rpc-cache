const { TxRaw, TxBody } = require('cosmjs-types/cosmos/tx/v1beta1/tx');
const {
  messageRegistryMap,
  messageRegistry,
} = require('@likecoin/iscn-js/dist/messages/registry');

const jsonRpcMethodParser = {};
jsonRpcMethodParser.broadcast_tx_commit = (jsonRpcRequest) => {
  const tx = Buffer.from(jsonRpcRequest.params.tx, 'base64');
  const txRaw = TxRaw.decode(tx);
  const txBody = TxBody.decode(txRaw.bodyBytes);
  const { messages } = txBody;
  const messageParsers = {};
  messageParsers['/likechain.iscn.MsgCreateIscnRecord'] = (msg) => {
    const { record } = msg;
    if (record) {
      if (record.contentMetadata) {
        record.contentMetadata = JSON.parse(record.contentMetadata.toString('utf-8'));
      }
      if (record.stakeholders) {
        record.stakeholders = record.stakeholders.map((s) => JSON.parse(s.toString('utf-8')));
      }
    }
  };
  const parsedMessages = [];
  for (const msg of messages) {
    const { typeUrl, value } = msg;
    const parsedMessage = {
      '@type': typeUrl,
    };
    const T = messageRegistryMap[typeUrl];
    if (T) {
      const decodedMessage = messageRegistry.decode({ typeUrl, value });
      const parser = messageParsers[typeUrl];
      if (parser) {
        parser(decodedMessage);
      }
      Object.assign(parsedMessage, decodedMessage);
    }
    parsedMessages.push(parsedMessage);
  }
  txBody.messages = parsedMessages;
  return {
    jsonRpcMethod: 'broadcast_tx_commit',
    jsonRpcParams: {
      tx: txBody,
    },
  };
};

function parseJsonRpcRequest(jsonRpcRequest) {
  const parser = jsonRpcMethodParser[jsonRpcRequest.method];
  if (!parser) {
    return {
      jsonRpcMethod: jsonRpcRequest.method,
      jsonRpcParams: jsonRpcRequest.params,
    };
  }
  return parser(jsonRpcRequest);
}

module.exports = {
  parseJsonRpcRequest,
};
