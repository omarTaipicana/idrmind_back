'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sequelize = require('../src/utils/connection');
const { QueryTypes } = require('sequelize');

const directory = path.resolve(__dirname, '..', 'migrations');
const table = 'schema_migrations';

async function run() {
  await sequelize.authenticate();
  await sequelize.query(`CREATE TABLE IF NOT EXISTS ${table} (
    name TEXT PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const files = fs.readdirSync(directory).filter(f => /^\d.*\.sql$/i.test(f)).sort();
  for (const name of files) {
    const sql = fs.readFileSync(path.join(directory, name), 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    const existing = await sequelize.query(`SELECT checksum FROM ${table} WHERE name = :name`, {
      replacements: { name }, type: QueryTypes.SELECT,
    });
    if (existing.length) {
      if (existing[0].checksum !== checksum) throw new Error(`Migración modificada después de ejecutarse: ${name}`);
      console.log(`✓ Ya aplicada: ${name}`);
      continue;
    }
    console.log(`→ Aplicando: ${name}`);
    await sequelize.transaction(async transaction => {
      await sequelize.query(sql, { transaction });
      await sequelize.query(`INSERT INTO ${table} (name, checksum) VALUES (:name, :checksum)`, {
        replacements: { name, checksum }, transaction,
      });
    });
    console.log(`✓ Aplicada: ${name}`);
  }
  console.log('Migraciones al día.');
}

run().catch(err => { console.error('Error de migración:', err); process.exitCode = 1; })
  .finally(async () => { await sequelize.close(); });
