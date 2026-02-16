#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'stxact',
  user: process.env.POSTGRES_USER || 'stxact',
  password: process.env.POSTGRES_PASSWORD,
});

const MIGRATIONS_DIR = path.join(__dirname, '..', 'infra', 'migrations');

async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await pool.query(query);
  console.log('✅ Migrations table ready');
}

async function getExecutedMigrations() {
  const result = await pool.query('SELECT filename FROM migrations ORDER BY id');
  return result.rows.map((row) => row.filename);
}

async function executeMigration(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`✅ Executed migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to execute migration ${filename}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function rollbackMigration(filename) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM migrations WHERE filename = $1', [filename]);
    await client.query('COMMIT');
    console.log(`✅ Rolled back migration: ${filename}`);
    console.warn('⚠️  Note: SQL was not reversed. Manual cleanup may be required.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to rollback migration ${filename}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function migrateUp() {
  await createMigrationsTable();

  const executed = await getExecutedMigrations();
  const allMigrations = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pending = allMigrations.filter((m) => !executed.includes(m));

  if (pending.length === 0) {
    console.log('✅ No pending migrations');
    return;
  }

  console.log(`📋 Found ${pending.length} pending migration(s)`);

  for (const migration of pending) {
    await executeMigration(migration);
  }

  console.log('✅ All migrations completed');
}

async function migrateDown() {
  const executed = await getExecutedMigrations();

  if (executed.length === 0) {
    console.log('✅ No migrations to roll back');
    return;
  }

  const lastMigration = executed[executed.length - 1];
  console.log(`📋 Rolling back: ${lastMigration}`);

  await rollbackMigration(lastMigration);
  console.log('✅ Rollback completed');
}

async function main() {
  const command = process.argv[2];

  try {
    if (command === 'up') {
      await migrateUp();
    } else if (command === 'down') {
      await migrateDown();
    } else {
      console.log('Usage: node scripts/migrate.js [up|down]');
      console.log('  up   - Run all pending migrations');
      console.log('  down - Rollback the last migration');
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
