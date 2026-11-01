import dotenv from 'dotenv';
import pg from 'pg';
import { assertTestDatabaseTarget } from '../src/db/test-target.mjs';

dotenv.config({ path: '.env.test.local', override: true });

assertTestDatabaseTarget(process.env.DATABASE_URL);

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

try {
  await client.connect();

  const result = await client.query(
    'SELECT COUNT(id) AS total_orders FROM orders'
  );

  console.log('TOTAL ORDERS:', result.rows[0].total_orders);
} catch (error) {
  console.error('Database check failed:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
