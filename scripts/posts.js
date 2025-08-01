const db = require('../db');

async function createPostsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      author_id VARCHAR(64) NOT NULL,
      author_name VARCHAR(64),
      views INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await db.query(sql);
    console.log('[+] posts table created');
    process.exit(0);
  } catch (err) {
    console.error('[-] Failed to create posts table:', err);
    process.exit(1);
  }
}

createPostsTable();
