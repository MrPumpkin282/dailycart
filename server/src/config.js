import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, '..', '..');

// .env lives at the repo root so client and server share one file.
dotenv.config({ path: path.join(rootDir, '.env') });

/**
 * A certificate from an env var: either the PEM text itself (handy on hosting
 * platforms where you can't upload files) or a path to a file.
 * Literal "\n" sequences are turned into newlines, since some dashboards
 * only accept single-line values.
 */
function readFileEnv(name) {
  const v = process.env[name];
  if (!v) return undefined;
  if (v.includes('-----BEGIN')) return v.replace(/\\n/g, '\n');
  const full = path.isAbsolute(v) ? v : path.join(rootDir, v);
  return fs.readFileSync(full, 'utf8');
}

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

const isProduction = process.env.NODE_ENV === 'production';

const jwtSecret = process.env.JWT_SECRET;
if (isProduction && (!jwtSecret || jwtSecret.length < 32 || /change-me/.test(jwtSecret))) {
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
}

export const config = {
  isProduction,
  port: num(process.env.PORT, 4000),
  jwtSecret: jwtSecret || 'dev-only-secret-not-for-production',
  // Public URL of the site, e.g. https://dailycart.onrender.com. Locks CORS to it.
  appOrigin: process.env.APP_ORIGIN || '',
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  // Customers whose freezes expire this many times in a week can't freeze for a day.
  noShowLimit: num(process.env.NO_SHOW_LIMIT, 3),

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
