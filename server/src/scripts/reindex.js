// Rebuild the OpenSearch index from Postgres (the source of truth).
import { pool } from '../db.js';
import { os, ensureIndex, reindexAll } from '../search.js';
import { config } from '../config.js';

try {
  await os.indices.delete({ index: config.opensearch.index }).catch(() => {});
  await ensureIndex();
  const n = await reindexAll();
  console.log(`Indexed ${n} products into ${config.opensearch.index}`);
} finally {
  await pool.end();
}
