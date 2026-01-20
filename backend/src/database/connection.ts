import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

export default pool;
