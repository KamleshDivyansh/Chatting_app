import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

class User {
  static async create(userData) {
    const { username, email, password } = userData;
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    
    return result.insertId;
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, username, email, profile_photo, bio, status, last_seen FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async updateStatus(userId, status) {
    await pool.execute(
      'UPDATE users SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      [status, userId]
    );
  }

  static async updateProfile(userId, profileData) {
    const { bio, profile_photo } = profileData;
    await pool.execute(
      'UPDATE users SET bio = ?, profile_photo = ? WHERE id = ?',
      [bio, profile_photo, userId]
    );
  }

  static async searchUsers(query, currentUserId) {
    const [rows] = await pool.execute(
      `SELECT id, username, email, profile_photo, status 
       FROM users 
       WHERE (username LIKE ? OR email LIKE ?) AND id != ?
       LIMIT 10`,
      [`%${query}%`, `%${query}%`, currentUserId]
    );
    return rows;
  }

  static async getContacts(userId) {
    const [rows] = await pool.execute(
      `SELECT u.id, u.username, u.email, u.profile_photo, u.status, u.last_seen, c.status as contact_status
       FROM contacts c
       JOIN users u ON (c.contact_id = u.id)
       WHERE c.user_id = ? AND c.status = 'accepted'
       ORDER BY u.status DESC, u.last_seen DESC`,
      [userId]
    );
    return rows;
  }

  static async addContact(userId, contactId) {
    await pool.execute(
      'INSERT INTO contacts (user_id, contact_id, status) VALUES (?, ?, ?)',
      [userId, contactId, 'pending']
    );
  }

  static async acceptContact(userId, contactId) {
    await pool.execute(
      'UPDATE contacts SET status = ? WHERE user_id = ? AND contact_id = ?',
      ['accepted', contactId, userId]
    );
    
    await pool.execute(
      'INSERT INTO contacts (user_id, contact_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = ?',
      [userId, contactId, 'accepted', 'accepted']
    );
  }
}

export default User;