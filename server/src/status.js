// Tracks whether the Kafka producer/consumers came up, for /api/health.
const state = { kafka: false };

export const setKafkaUp = (v) => { state.kafka = v; };
export const kafkaStatus = () => state.kafka;
