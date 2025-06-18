import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chat_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Singleton pool instance
let poolInstance = null;

async function initializeDatabase() {
  try {
    // Create database if it doesn't exist
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.end();

    // Create connection pool
    const pool = mysql.createPool(dbConfig);

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        phone_number VARCHAR(20) UNIQUE,
        google_id VARCHAR(100) UNIQUE,
        facebook_id VARCHAR(100) UNIQUE,
        profile_photo VARCHAR(255) DEFAULT NULL,
        bio TEXT DEFAULT NULL,
        status ENUM('online', 'offline', 'away') DEFAULT 'offline',
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        contact_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_contact (user_id, contact_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type ENUM('private', 'group') DEFAULT 'private',
        name VARCHAR(100) DEFAULT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL,
        user_id INT NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_participant (conversation_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        content TEXT,
        message_type ENUM('text', 'image', 'video', 'file', 'audio') DEFAULT 'text',
        file_url VARCHAR(255) DEFAULT NULL,
        file_name VARCHAR(255) DEFAULT NULL,
        reply_to INT DEFAULT NULL,
        edited_at TIMESTAMP NULL,
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS calls (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL,
        caller_id INT NOT NULL,
        type ENUM('voice', 'video') NOT NULL,
        status ENUM('ongoing', 'ended', 'missed') DEFAULT 'ongoing',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables created successfully');
    return pool;
  } catch (error) {
    console.error('Database setup error:', error);
    throw error;
  }
}

// Function to get the initialized pool
async function getPool() {
  if (!poolInstance) {
    poolInstance = await initializeDatabase();
  }
  return poolInstance;
}

export default getPool;
export { dbConfig, initializeDatabase };






// import mysql from 'mysql2/promise';
// import { config } from 'dotenv';

// config();

// const dbConfig = {
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'chat_app',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// };

// async function initializeDatabase() {
//   try {
//     // Create database if it doesn't exist
//     const connection = await mysql.createConnection({
//       host: dbConfig.host,
//       user: dbConfig.user,
//       password: dbConfig.password
//     });

//     await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
//     await connection.end();

//     // Create connection pool
//     const pool = mysql.createPool(dbConfig);

//     // Create tables
//     await pool.execute(`
//       CREATE TABLE IF NOT EXISTS users (
//         id INT PRIMARY KEY AUTO_INCREMENT,
//         username VARCHAR(50) UNIQUE NOT NULL,
//         email VARCHAR(100) UNIQUE,
//         password VARCHAR(255),
//         phone_number VARCHAR(20) UNIQUE,
//         google_id VARCHAR(100) UNIQUE,
//         facebook_id VARCHAR(100) UNIQUE,
//         profile_photo VARCHAR(255) DEFAULT NULL,
//         bio TEXT DEFAULT NULL,
//         status ENUM('online', 'offline', 'away') DEFAULT 'offline',
//         last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
//       )
//     `);

//     await pool.execute(`
//       CREATE TABLE IF NOT EXISTS contacts (
//         id INT PRIMARY KEY AUTO_INCREMENT,
//         user_id INT NOT NULL,
//         contact_id INT NOT NULL,
//         status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
//         FOREIGN KEY (contact_id) REFERENCES users(id) ON DELETE CASCADE,
//         UNIQUE KEY unique_contact (user_id, contact_id)
//       )
//     `);

//     await pool.execute(`
//       CREATE TABLE IF NOT EXISTS conversations (
//         id INT PRIMARY KEY AUTO_INCREMENT,
//         type ENUM('private', 'group') DEFAULT 'private',
//         name VARCHAR(100) DEFAULT NULL,
//         created_by INT NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//         FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
//       )
//     `);

//     await pool.execute(`
//       CREATE TABLE IF NOT EXISTS conversation_participants (
//         id INT PRIMARY KEY AUTO_INCREMENT,
//         conversation_id INT NOT NULL,
//         user_id INT NOT NULL,
//         joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
//         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
//         UNIQUE KEY unique_participant (conversation_id, user_id)
//       )
//     `);

//     await pool.execute(`
//       CREATE TABLE IF NOT EXISTS messages (
//         id INT PRIMARY KEY AUTO_INCREMENT,
//         conversation_id INT NOT NULL,
//         sender_id INT NOT NULL,
//         content TEXT,
//         message_type ENUM('text', 'image', 'video', 'file', 'audio') DEFAULT 'text',
//         file_url VARCHAR(255) DEFAULT NULL,
//         file_name VARCHAR(255) DEFAULT NULL,
//         reply_to INT DEFAULT NULL,
//         edited_at TIMESTAMP NULL,
//         deleted_at TIMESTAMP NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
//         FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
//         FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL
//       )
//     `);

//     await pool.execute(`
//       CREATE TABLE IF NOT EXISTS calls (
//         id INT PRIMARY KEY AUTO_INCREMENT,
//         conversation_id INT NOT NULL,
//         caller_id INT NOT NULL,
//         type ENUM('voice', 'video') NOT NULL,
//         status ENUM('ongoing', 'ended', 'missed') DEFAULT 'ongoing',
//         started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         ended_at TIMESTAMP NULL,
//         FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
//         FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE
//       )
//     `);

//     console.log('Database tables created successfully');
//     return pool;
//   } catch (error) {
//     console.error('Database setup error:', error);
//     throw error;
//   }
// }

// export default dbConfig;

// export { initializeDatabase };