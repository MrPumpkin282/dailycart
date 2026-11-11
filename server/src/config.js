import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, '..', '..');

// .env lives at the repo root so client and server share one file.
dotenv.config({ path: path.join(rootDir, '.env') });

/** Read a file path from an env var (relative paths resolve from the repo root). */
function readFileEnv(name) {
  const p = process.env[name];
  if (!p) return undefined;
  const full = path.isAbsolute(p) ? p : path.join(rootDir, p);
  return fs.readFileSync(full, 'utf8');
}

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

export const config = {
  port: num(process.env.PORT, 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',

  freeze: {
    minutes: num(process.env.FREEZE_MINUTES, 30),
    maxActivePerUser: num(process.env.MAX_ACTIVE_FREEZES, 3),
    maxQtyPerItem: num(process.env.MAX_QTY_PER_ITEM, 5),
  },

  // Customers only see shops inside this walking radius (metres).
  radius: {
    min: 500,
    max: 750,
    default: 750,
  },

  pg: {
    connectionString:
      process.env.DATABASE_URL || 'postgres://dailycart:dailycart@localhost:5433/dailycart',
    ca: readFileEnv('PG_CA_CERT'),
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',').map((s) => s.trim()),
    clientId: 'dailycart',
    // Aiven default: TLS client certificate auth
    ca: readFileEnv('KAFKA_CA_CERT'),
    cert: readFileEnv('KAFKA_ACCESS_CERT'),
    key: readFileEnv('KAFKA_ACCESS_KEY'),
    // Alternative: SASL (enable it on the Aiven service)
    saslUsername: process.env.KAFKA_SASL_USERNAME,
    saslPassword: process.env.KAFKA_SASL_PASSWORD,
    topics: {
      freeze: 'dailycart.freeze-events',
      inventory: 'dailycart.inventory-changed',
    },
  },

  opensearch: {
    url: process.env.OPENSEARCH_URL || 'http://localhost:9200',
    index: process.env.OPENSEARCH_INDEX || 'dailycart-products',
  },
};
