import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pool } from './db.js';
import routes from './routes.js';
import { ensureTopics, connectProducer, disconnectProducer } from './kafka.js';
import { startConsumers, stopConsumers } from './consumers.js';
import { ensureIndex } from './search.js';
import { expireDueFreezes } from './freezes.js';
import { setKafkaUp } from './status.js';
import { applySchema } from './scripts/schema.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use('/api', routes);

// Serve the built React app in production (npm run build in client/).
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on our side' : err.message, stock: err.stock });
});

async function start() {
  await applySchema();
  console.log('[postgres] schema ready');

  await ensureIndex();

  try {
    await ensureTopics();
    await connectProducer();
    await startConsumers();
    setKafkaUp(true);
  } catch (err) {
    console.error('[kafka] could not connect:', err.message);
    console.error('[kafka] the app will run, but events and search sync are off until Kafka is reachable.');
  }

  setInterval(() => {
    expireDueFreezes()
      .then((n) => n && console.log(`[expiry] released ${n} freeze(s)`))
      .catch((e) => console.error('[expiry]', e.message));
  }, 15_000);

  app.listen(config.port, () => console.log(`DailyCart API on http://localhost:${config.port}`));
}

async function shutdown() {
  await stopConsumers().catch(() => {});
  await disconnectProducer().catch(() => {});
  await pool.end().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
