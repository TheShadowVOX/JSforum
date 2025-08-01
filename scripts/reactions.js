// scripts/reactions.js
require('dotenv').config();
const db = require('../db');

(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS reactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        comment_id INT NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(comment_id, user_id, emoji),
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ reactions table created');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create reactions table:', err);
    process.exit(1);
  }
})();
