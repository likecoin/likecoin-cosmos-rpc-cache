const { publisher } = require('../gcloudPub');
const { PUBSUB_TOPIC_MISC } = require('../constant');

const logTypes = {
  '/likechain.iscn.MsgCreateIscnRecord': 'eventNewCreateISCNTx',
  '/likechain.likenft.v1.MsgNewClass': 'eventNewNFTClassTx',
};

// TODO: separete into registry form
function logBroadcastTx(parsedRequest) {
  if (parsedRequest.jsonRpcMethod.match(/^broadcast/)) {
    for (const msg of parsedRequest.jsonRpcParams.txBody.messages) {
      const logType = logTypes[msg['@type']];
      if (logType) {
        const { '@type': _, ...filteredMsg } = msg;
        publisher.publish(PUBSUB_TOPIC_MISC, {
          logType,
          ...filteredMsg,
        });
      }
    }
  }
}

module.exports = { logBroadcastTx };
