const {
  TxRaw, TxBody, AuthInfo,
} = require('cosmjs-types/cosmos/tx/v1beta1/tx');
const { pubkeyToAddress, pubkeyType: AminoPubKeyType } = require('@cosmjs/amino');
const {
  messageRegistryMap,
  messageRegistry,
} = require('./registry');
const { bech32Prefix } = require('../config/config');

function parseAny(any) {
  const { typeUrl, value } = any;
  const T = messageRegistryMap[typeUrl];
  if (!T) {
    // eslint-disable-next-line no-console
    console.warn(`Warning: cannot parse unregistered typeUrl ${typeUrl}`);
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

function parseBuffer(buf) {
  return buf.toString('utf-8');
}

const messageHandlers = {};

function parseMsgs(msgs) {
  const parsedMsgs = [];
  for (const msg of msgs) {
    const { parsed, typeUrl, result: anyParsedMsg } = parseAny(msg);
    let processedMsg = anyParsedMsg;
    if (parsed) {
      const handlers = messageHandlers[typeUrl];
      if (handlers) {
        for (const handler of handlers) {
          processedMsg = handler(processedMsg);
        }
      }
    }
    parsedMsgs.push(processedMsg);
  }
  return parsedMsgs;
}

function parsePubKey(pubKey) {
  const { parsed, typeUrl, result: parsedPubKey } = parseAny(pubKey);
  if (!parsed) {
    return pubKey;
  }
  // TODO: if public key types increased, better handle using registry form
  switch (typeUrl) {
    case '/cosmos.crypto.secp256k1.PubKey':
    case '/cosmos.crypto.ed25519.PubKey':
    case '/cosmos.crypto.sr25519.PubKey': {
      parsedPubKey.key = Buffer.from(parsedPubKey.key).toString('base64');
      break;
    }
    case '/cosmos.crypto.multisig.LegacyAminoPubKey': {
      parsedPubKey.publicKeys = parsedPubKey.publicKeys.map(parsePubKey);
      break;
    }
    default:
      break;
  }
  return parsedPubKey;
}

function pubKeyToAmino(pubKey) {
  const typeUrl = pubKey['@type'];
  switch (typeUrl) {
    case '/cosmos.crypto.secp256k1.PubKey': {
      return {
        type: AminoPubKeyType.secp256k1,
        value: pubKey.key,
      };
    }
    case '/cosmos.crypto.ed25519.PubKey': {
      return {
        type: AminoPubKeyType.ed25519,
        value: pubKey.key,
      };
    }
    case '/cosmos.crypto.sr25519.PubKey': {
      return {
        type: AminoPubKeyType.sr25519,
        value: pubKey.key,
      };
    }
    case '/cosmos.crypto.multisig.LegacyAminoPubKey': {
      return {
        type: AminoPubKeyType.multisigThreshold,
        value: {
          threshold: pubKey.threshold.toString(),
          pubkeys: pubKey.publicKeys.map(pubKeyToAmino),
        },
      };
    }
    default:
      throw new Error(`Unknown public key type: ${typeUrl}`);
  }
}

function getPubKeyAddress(pubKey) {
  return pubkeyToAddress(pubKeyToAmino(pubKey), bech32Prefix);
}

const broadcastTxParser = (params) => {
  const tx = Buffer.from(params.tx, 'base64');
  const txRaw = TxRaw.decode(tx);
  const txBody = TxBody.decode(txRaw.bodyBytes);
  const { messages } = txBody;
  const parsedMsgs = parseMsgs(messages);
  txBody.messages = parsedMsgs;
  txBody.timeoutHeight = txBody.timeoutHeight.toString();
  const authInfo = AuthInfo.decode(txRaw.authInfoBytes);
  for (const signerInfo of authInfo.signerInfos) {
    signerInfo.publicKey = parsePubKey(signerInfo.publicKey);
    signerInfo.sequence = signerInfo.sequence.toString();
  }
  let sender = '';
  try {
    if (authInfo.signerInfos[0].publicKey) {
      sender = getPubKeyAddress(authInfo.signerInfos[0].publicKey);
    }
  } catch (err) {
    const error = err.stack || err;
    // eslint-disable-next-line no-console
    console.error('Warning: error when parsing transaction sender');
    // eslint-disable-next-line no-console
    console.error(error);
  }
  authInfo.fee.gasLimit = authInfo.fee.gasLimit.toString();
  return {
    sender,
    txBody,
    authInfo,
  };
};

function registerMessageHandlers(typeUrl, ...parsers) {
  if (messageHandlers[typeUrl] === undefined) {
    messageHandlers[typeUrl] = parsers;
  } else {
    messageHandlers[typeUrl] = messageHandlers[typeUrl].concat(parsers);
  }
}

function deepCopy(obj) {
  if (typeof obj !== 'object') {
    return obj;
  }
  if (Buffer.isBuffer(obj)) {
    return Buffer.from(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(deepCopy);
  }
  if (obj.constructor === Date) {
    return new Date(obj);
  }
  const result = Object.create(Object.getPrototypeOf(obj));
  for (const [key, value] of Object.entries(obj)) {
    result[key] = deepCopy(value);
  }
  return result;
}

function parseField(parseFunc, ...fieldPath) {
  const fieldName = fieldPath.pop();
  return (msg) => {
    const output = deepCopy(msg);
    let target = output;
    for (const pathName of fieldPath) {
      target = target[pathName];
      if (!target) {
        return output;
      }
    }
    if (target[fieldName]) {
      target[fieldName] = parseFunc(target[fieldName]);
    }
    return output;
  };
}

function parseFieldAny(...fieldPath) {
  return parseField((any) => {
    const { result } = parseAny(any);
    return result;
  }, ...fieldPath);
}

function parseFieldBuffer(...fieldPath) {
  return parseField(parseBuffer, ...fieldPath);
}

registerMessageHandlers('/cosmos.gov.v1beta1.MsgSubmitProposal', parseFieldAny('content'));
registerMessageHandlers('/cosmos.authz.v1beta1.MsgGrant', parseFieldAny('grant', 'authorization'));
registerMessageHandlers('/cosmos.authz.v1beta1.MsgExec', (msgExec) => {
  const output = deepCopy(msgExec);
  const { msgs } = output;
  if (msgs) {
    output.msgs = parseMsgs(msgs);
  }
  return output;
});
registerMessageHandlers('/cosmos.feegrant.v1beta1.MsgGrantAllowance', parseFieldAny('allowance'));
registerMessageHandlers('/likechain.iscn.MsgCreateIscnRecord', (msg) => {
  const output = deepCopy(msg);
  const { record } = output;
  if (record) {
    if (record.contentMetadata) {
      record.contentMetadata = JSON.parse(record.contentMetadata.toString('utf-8'));
    }
    if (record.stakeholders) {
      record.stakeholders = record.stakeholders.map((s) => JSON.parse(s.toString('utf-8')));
    }
  }
  return output;
});

registerMessageHandlers(
  '/likechain.likenft.v1.MsgNewClass',
  parseFieldBuffer('input', 'metadata'),
  parseField((n) => n.toString(), 'input', 'config', 'maxSupply'),
  parseField(
    (periods) => periods.map((period) => ({ ...period, mintPrice: period.mintPrice.toString() })),
    ...['input', 'config', 'blindBoxConfig', 'mintPeriods'],
  ),
);

module.exports = {
  broadcastTxParser,
  registerMessageHandlers,
};
