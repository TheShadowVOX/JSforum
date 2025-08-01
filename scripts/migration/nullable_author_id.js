const db = require('../../db');

async function makeAuthorIdNullable() {
  try {
    // Drop FK constraint
    await db.query(`
      ALTER TABLE comments DROP FOREIGN KEY comments_ibfk_2
    `);

    // Modify column to nullable
    await db.query(`
      ALTER TABLE comments MODIFY author_id VARCHAR(64) NULL
    `);

    // Re-add FK constraint (allowing NULL)
    await db.query(`
      ALTER TABLE comments
      ADD CONSTRAINT comments_ibfk_2 FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
    `);

    console.log('[+] comments.author_id set to NULLABLE with FK ON DELETE SET NULL');
    process.exit(0);
  } catch (err) {
    console.error('[-] Failed to alter comments.author_id:', err);
    process.exit(1);
  }
}

makeAuthorIdNullable();
