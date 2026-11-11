import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from '../db.js';

const schemaFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'schema.sql');

export async function applySchema() {
  await query(fs.readFileSync(schemaFile, 'utf8'));
}
