import pg from 'pg';
import { config } from './config.js';

// NUMERIC -> JS number (prices are small, no precision risk here)
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
// DATE -> keep as 'YYYY-MM-DD' string instead of a timezone-shifted Date
pg.types.setTypeParser(1082, (v) => v);

function sslOptions() {
  const url = config.pg.connectionString;
  if (config.pg.ca) return { ca: config.pg.ca, rejectUnauthorized: true };
  if (/sslmode=require/.test(url)) return { rejectUnauthorized: false };
  return undefined;
}

// Strip sslmode from the URL so our ssl object is the one that applies.
const connectionString = config.pg.connectionString.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, '');

export const pool = new pg.Pool({ connectionString, ssl: sslOptions(), max: 10 });

export const query = (text, params) => pool.query(text, params);

/** Run fn inside a transaction; rolls back on any thrown error. */
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
