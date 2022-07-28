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
    console.log(`Warning: cannot parse unregistered typeUrl ${typeUrl}`);
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
    sender = getPubKeyAddress(authInfo.signerInfos[0].publicKey);
  } catch (err) {
    const error = err.stack || err;
    // eslint-disable-next-line no-console
    console.log('Warning: error when parsing transaction sender');
    // eslint-disable-next-line no-console
    console.log(error);
  }
  authInfo.fee.gasLimit = authInfo.fee.gasLimit.toString();
  return {
    sender,
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
