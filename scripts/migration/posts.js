const db = require('../../db');

async function migrate() {
  try {
    await db.query(`
      ALTER TABLE posts
      ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT 0
    `);
    console.log('[+] Added "deleted" column to posts table');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('[!] "deleted" column already exists');
      process.exit(0);
    } else {
      console.error('[-] Migration failed:', err);
      process.exit(1);
    }
  }
}

migrate();
