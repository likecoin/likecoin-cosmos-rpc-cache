const { PubSub } = require('@google-cloud/pubsub');
const { v4: uuidv4 } = require('uuid');
const {
  PUBSUB_TOPIC_MISC,
  PUBSUB_TOPIC_MONITOR,
} = require('./constant');

const { pubsub: config } = require('./config');

const pubsub = new PubSub();
const topics = [
  PUBSUB_TOPIC_MISC,
  PUBSUB_TOPIC_MONITOR,
];
const publisher = {};
const publisherWrapper = {};

topics.forEach((topic) => {
  publisherWrapper[topic] = pubsub.topic(topic);
  // Note: in version 0.28.x, publisher object is removed
  // messages are published in topic object now
  publisherWrapper[topic]
    .setPublishOptions({
      batching: {
        maxMessages: config.GCLOUD_PUBSUB_MAX_MESSAGES || 10,
        maxMilliseconds: config.GCLOUD_PUBSUB_MAX_WAIT || 1000,
      },
    });
});

/* istanbul ignore next */
publisher.publish = async (publishTopic, obj) => {
  if (!config.GCLOUD_PUBSUB_ENABLE) return;
  const payload = {
    ...obj,
    '@timestamp': new Date().toISOString(),
    appServer: config.APP_SERVER || 'json-rpc-cache',
    uuidv4: uuidv4(),
  }

  const data = JSON.stringify(payload);
  const dataBuffer = Buffer.from(data);
  try {
    await publisherWrapper[publishTopic].publish(dataBuffer);
  } catch (err) {
    console.error('ERROR:', err);
  }
};

function getPubsubLogger(topic) {
  let accumulatedPayload = {};
  return {
    append(payload) {
      Object.assign(accumulatedPayload, payload);
      return this;
    },
    commit() {
      const payload = accumulatedPayload;
      accumulatedPayload = {};
      if (Object.keys(payload).length > 0) {
        publisher.publishTopic(topic, payload);
      }
    },
  }
}

module.exports = {
  publisher,
  getPubsubLogger,
};