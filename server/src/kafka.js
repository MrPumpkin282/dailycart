import { Kafka, logLevel } from 'kafkajs';
import { config } from './config.js';

const k = config.kafka;

function connectionOptions() {
  if (k.saslUsername) {
    return {
      ssl: k.ca ? { ca: [k.ca] } : true,
      sasl: { mechanism: 'scram-sha-256', username: k.saslUsername, password: k.saslPassword },
    };
  }
  if (k.cert && k.key) {
    return { ssl: { ca: k.ca ? [k.ca] : undefined, cert: k.cert, key: k.key } };
  }
  return {}; // local plaintext broker
}

export const kafka = new Kafka({
  clientId: k.clientId,
  brokers: k.brokers,
  logLevel: logLevel.WARN,
  retry: { retries: 8, initialRetryTime: 300 },
  ...connectionOptions(),
});

export const TOPICS = k.topics;

const producer = kafka.producer({ allowAutoTopicCreation: false });
let producerReady = false;

/** Create our topics if they don't exist (Aiven disables auto-create by default). */
export async function ensureTopics() {
  const admin = kafka.admin();
  await admin.connect();
  try {
    const existing = new Set(await admin.listTopics());
    const missing = Object.values(TOPICS).filter((t) => !existing.has(t));
    if (missing.length) {
      await admin.createTopics({
        waitForLeaders: true,
        topics: missing.map((topic) => ({ topic, numPartitions: 1 })),
      });
      console.log('[kafka] created topics:', missing.join(', '));
    }
  } finally {
    await admin.disconnect();
  }
}

export async function connectProducer() {
  await producer.connect();
  producerReady = true;
}

/**
 * Publish an event. Called after the Postgres transaction commits, so the
 * database is always the source of truth; a failed publish is logged, and the
 * reindex script can repair the search index.
 */
export async function publish(topic, type, payload, key) {
  if (!producerReady) {
    console.warn(`[kafka] producer not ready, dropped ${type}`);
    return;
  }
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: key != null ? String(key) : undefined,
          value: JSON.stringify({ type, at: new Date().toISOString(), ...payload }),
        },
      ],
    });
  } catch (err) {
    console.error(`[kafka] failed to publish ${type}:`, err.message);
  }
}

export async function disconnectProducer() {
  if (producerReady) await producer.disconnect();
}
