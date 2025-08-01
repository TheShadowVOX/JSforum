require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_IP,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB,
      connectTimeout: 5000,
    });
    console.log('MySQL connection successful');
    await conn.end();
  } catch (e) {
    console.error('MySQL connection failed:', e);
  }
})();
