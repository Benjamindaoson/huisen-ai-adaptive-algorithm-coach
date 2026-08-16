import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { applyMigrations, loadMigrations } from './migrations.js';
import { validateProductionEnvironment } from './production-config.js';

const production = validateProductionEnvironment(process.env);
const pool = production.production
  ? new Pool({ connectionString: production.databaseUrl })
  : new Pool({
    host: process.env.IDENTITY_PG_HOST ?? process.env.POSTGRES_HOST ?? '127.0.0.1', port: Number(process.env.POSTGRES_PORT ?? 5432),
    database: process.env.POSTGRES_DB, user: process.env.POSTGRES_USER, password: process.env.POSTGRES_PASSWORD,
  });

try {
  const result = await applyMigrations(pool, await loadMigrations(fileURLToPath(new URL('../migrations', import.meta.url))));
  console.log(JSON.stringify(result));
} finally { await pool.end(); }
