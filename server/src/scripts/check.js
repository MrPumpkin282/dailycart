// Checks the connection to PostgreSQL, Kafka and OpenSearch using .env.
// Prints which service works and, if not, a hint about what to fix. Never prints passwords.
import { config } from '../config.js';
import { pool } from '../db.js';
import { kafka } from '../kafka.js';
import { os } from '../search.js';

const hide = (s) => s.replace(/\/\/([^:@/]+):([^@]+)@/, '//$1:****@');
const results = [];

async function check(name, target, fn, hint) {
  process.stdout.write(`- ${name} (${target}) ... `);
  try {
    const info = await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('timed out after 20 s')), 20000))]);
    console.log(`OK${info ? ` (${info})` : ''}`);
    results.push(true);
  } catch (err) {
    console.log(`FAILED\n    ${err.message}\n    Hint: ${hint(err)}`);
    results.push(false);
  }
}

console.log('Checking services from .env\n');

await check(
  'PostgreSQL',
  hide(config.pg.connectionString),
  async () => {
    const { rows: [r] } = await pool.query('SELECT version()');
    return r.version.split(' ').slice(0, 2).join(' ');
  },
  (e) =>
    /self.signed|certificate/i.test(e.message)
      ? 'Download the CA certificate from the PostgreSQL service page and set PG_CA_CERT=certs/pg-ca.pem'
      : /password|auth/i.test(e.message)
        ? 'Copy the Service URI again from the PostgreSQL Overview page into DATABASE_URL'
        : 'Check DATABASE_URL and that the service is "Running" in the Aiven console'
);

await check(
  'Kafka',
  config.kafka.brokers.join(','),
  async () => {
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    await admin.disconnect();
    return `${topics.filter((t) => !t.startsWith('__')).length} topic(s)`;
  },
  (e) =>
    /certificate|SSL|handshake/i.test(e.message)
      ? 'Download CA certificate, Access certificate and Access key from the Kafka page into certs/ and set KAFKA_CA_CERT, KAFKA_ACCESS_CERT, KAFKA_ACCESS_KEY'
      : 'Check KAFKA_BROKERS is the host:port from the Kafka Overview page and the service is "Running"'
);

await check(
  'OpenSearch',
  hide(config.opensearch.url),
  async () => {
    const { body } = await os.info();
    return `${body.version.distribution || 'opensearch'} ${body.version.number}`;
  },
  () => 'Copy the Service URI from the OpenSearch Overview page into OPENSEARCH_URL (it includes the username and password)'
);

await pool.end().catch(() => {});
const ok = results.every(Boolean);
console.log(ok ? '\nAll three services are reachable.' : '\nFix the failed service(s) above and run this again.');
process.exit(ok ? 0 : 1);
