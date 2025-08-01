// scripts/users.js
require('dotenv').config();
const db = require('../db');

async function createUsersTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(32) PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(255),
      avatar VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await db.query(createTableSQL);
    console.log('[+] Users table created or already exists');
  } catch (err) {
    console.error('[-] Failed to create users table:', err);
  } finally {
    process.exit();
  }
}

createUsersTable();
