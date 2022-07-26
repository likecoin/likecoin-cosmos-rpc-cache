const { TxRaw, TxBody, AuthInfo } = require('cosmjs-types/cosmos/tx/v1beta1/tx');
const {
  messageRegistryMap,
  messageRegistry,
} = require('./registry');

function parseAny(any) {
  const { typeUrl, value } = any;
  const T = messageRegistryMap[typeUrl];
  if (!T) {
    // TODO: log?
    return {
      parsed: false,
      typeUrl,
      result: any,
    };
  }
  const decoded = messageRegistry.decode({ typeUrl, value });
  const result = {
    '@type': typeUrl,
    ...decoded,
  };
  return {
    parsed: true,
    typeUrl,
    result,
  };
}

const messageHandler = {};

function parseMsgs(msgs) {
  const parsedMsgs = [];
  for (const msg of msgs) {
    const { parsed, typeUrl, result: parsedMessage } = parseAny(msg);
    if (parsed) {
      const handler = messageHandler[typeUrl];
      if (handler) {
        handler(parsedMessage);
      }
    }
    parsedMsgs.push(parsedMessage);
  }
  return parsedMsgs;
}

const broadcastTxParser = (params) => {
  const tx = Buffer.from(params.tx, 'base64');
  const txRaw = TxRaw.decode(tx);
  const txBody = TxBody.decode(txRaw.bodyBytes);
  const { messages } = txBody;
  const parsedMsgs = parseMsgs(messages);
  txBody.messages = parsedMsgs;
  const authInfo = AuthInfo.decode(txRaw.authInfoBytes);
  // TODO: parse sender info from pubkey
  return {
    txBody,
    authInfo,
  };
};

function registerMessageHandler(typeUrl, parser) {
  if (messageHandler[typeUrl] !== undefined) {
    throw new Error(`Message handler for type URL ${typeUrl} already registered`);
  }
  messageHandler[typeUrl] = parser;
}

function parseFieldAny(...fieldPath) {
  const fieldName = fieldPath.pop();
  return (msg) => {
    let target = msg;
    for (const pathName of fieldPath) {
      target = target[pathName];
      if (!target) {
        return;
      }
    }
    if (target[fieldName]) {
      const { result } = parseAny(target[fieldName]);
      target[fieldName] = result;
    }
  };
}

registerMessageHandler('/cosmos.gov.v1beta1.MsgSubmitProposal', parseFieldAny('content'));
registerMessageHandler('/cosmos.authz.v1beta1.MsgGrant', parseFieldAny('grant', 'authorization'));
registerMessageHandler('/cosmos.authz.v1beta1.MsgExec', (msgExec) => {
  const { msgs } = msgExec;
  if (!msgs) {
    return;
  }
  const target = msgExec;
  target.msgs = parseMsgs(msgs);
});
registerMessageHandler('/cosmos.feegrant.v1beta1.MsgGrantAllowance', parseFieldAny('allowance'));
registerMessageHandler('/likechain.iscn.MsgCreateIscnRecord', (msg) => {
  const { record } = msg;
  if (record) {
    if (record.contentMetadata) {
      record.contentMetadata = JSON.parse(record.contentMetadata.toString('utf-8'));
    }
    if (record.stakeholders) {
      record.stakeholders = record.stakeholders.map((s) => JSON.parse(s.toString('utf-8')));
    }
  }
});

module.exports = {
  broadcastTxParser,
  registerMessageHandler,
};
