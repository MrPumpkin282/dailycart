import { kafka, TOPICS } from './kafka.js';
import { query } from './db.js';
import { syncProduct } from './search.js';

async function logEvent(topic, evt, consumer, result) {
  await query(
    `INSERT INTO event_log (topic, event_type, consumer, payload, result) VALUES ($1, $2, $3, $4, $5)`,
    [topic, evt.type, consumer, evt, result]
  );
}

const notify = (userId, message) =>
  query(`INSERT INTO notifications (user_id, message) VALUES ($1, $2)`, [userId, message]);

const time = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

/** inventory.changed -> keep the OpenSearch product index in sync with Postgres. */
async function handleInventory(evt) {
  const results = [];
  for (const id of evt.productIds) results.push(`#${id} ${await syncProduct(id)}`);
  return `search index updated: ${results.join(', ')}`;
}

/** freeze events -> confirmations for the customer, alerts for the shopkeeper. */
async function handleFreeze(evt) {
  const items = evt.items?.map((i) => `${i.qty}× ${i.name}`).join(', ');
  switch (evt.type) {
    case 'freeze.created':
      await notify(evt.userId, `Frozen at ${evt.shopName}: ${items}. Pick up and pay by ${time(evt.expiresAt)} with code ${evt.code}.`);
      await notify(evt.shopOwnerId, `New freeze ${evt.code} from ${evt.customerName}: ${items} (₹${evt.total}).`);
      return 'customer confirmation + shop alert sent';
    case 'freeze.collected':
      await notify(evt.userId, `Collected at ${evt.shopName}. Thanks for shopping local!`);
      return 'collection receipt sent';
    case 'freeze.expired':
      await notify(evt.userId, `Your freeze ${evt.code} at ${evt.shopName} expired and the items were released.`);
      await notify(evt.shopOwnerId, `Freeze ${evt.code} expired, stock returned to shelf.`);
      return 'expiry notices sent';
    case 'freeze.cancelled':
      await notify(evt.shopOwnerId, `Freeze ${evt.code} was cancelled by the customer, stock returned.`);
      return 'shop alerted of cancellation';
    default:
      return 'ignored';
  }
}

const HANDLERS = {
  [TOPICS.inventory]: { name: 'search-indexer', fn: handleInventory },
  [TOPICS.freeze]: { name: 'notifier', fn: handleFreeze },
};

let consumer;

export async function startConsumers() {
  consumer = kafka.consumer({ groupId: 'dailycart-workers' });
  await consumer.connect();
  for (const topic of Object.keys(HANDLERS)) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const handler = HANDLERS[topic];
      let evt;
      try {
        evt = JSON.parse(message.value.toString());
        const result = await handler.fn(evt);
        await logEvent(topic, evt, handler.name, result);
        console.log(`[consumer:${handler.name}] ${evt.type} -> ${result}`);
      } catch (err) {
        console.error(`[consumer:${handler.name}] failed:`, err.message);
        if (evt) await logEvent(topic, evt, handler.name, `error: ${err.message}`).catch(() => {});
      }
    },
  });
  console.log('[kafka] consumers running');
}

export async function stopConsumers() {
  if (consumer) await consumer.disconnect();
}
