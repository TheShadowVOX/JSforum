// scripts/comments.js
require('dotenv').config();
const db = require('../db');

(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        post_id INT NOT NULL,
        author_id VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        parent_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ comments table created');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create comments table:', err);
    process.exit(1);
  }
})();
