import getPool from '../config/database.js';
import bcrypt from 'bcryptjs';

class User {
  static async create(userData) {
    const pool = await getPool();
    const { username, email, password, phone_number, google_id, facebook_id } = userData;
    let hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    const [result] = await pool.query(
      `INSERT INTO users (username, email, password, phone_number, google_id, facebook_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email || null, hashedPassword, phone_number || null, google_id || null, facebook_id || null]
    );

    return result.insertId;
  }

  static async findByEmail(email) {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async findByPhoneNumber(phone_number) {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE phone_number = ?', [phone_number]);
    return rows[0];
  }

  static async findByGoogleId(google_id) {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE google_id = ?', [google_id]);
    return rows[0];
  }

  static async findByFacebookId(facebook_id) {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE facebook_id = ?', [facebook_id]);
    return rows[0];
  }

  static async findById(id) {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id, username, email, profile_photo, bio, status, last_seen FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async updateStatus(userId, status) {
    const pool = await getPool();
    await pool.query('UPDATE users SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?', [
      status,
      userId,
    ]);
  }

  static async updateProfile(userId, profileData) {
    const pool = await getPool();
    const { bio, profile_photo } = profileData;
    await pool.query('UPDATE users SET bio = ?, profile_photo = ? WHERE id = ?', [
      bio,
      profile_photo,
      userId,
    ]);
  }

  static async searchUsers(query, currentUserId) {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT id, username, email, profile_photo, status 
       FROM users 
       WHERE (username LIKE ? OR email LIKE ? OR phone_number LIKE ?) AND id != ?
       LIMIT 10`,
      [`%${query}%`, `%${query}%`, `%${query}%`, currentUserId]
    );
    return rows;
  }

  static async getContacts(userId) {
    const pool = await getPool();
    const [rows] = await pool.query(
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
    const pool = await getPool();
    try {
      const [user] = await pool.query('SELECT id FROM users WHERE id = ?', [contactId]);
      if (!user.length) {
        throw new Error('Contact user does not exist');
      }
      const [existing] = await pool.query(
        'SELECT * FROM contacts WHERE user_id = ? AND contact_id = ?',
        [userId, contactId]
      );
      if (existing.length > 0) {
        throw new Error('Contact already exists');
      }
      await pool.query('INSERT INTO contacts (user_id, contact_id, status) VALUES (?, ?, ?)', [
        userId,
        contactId,
        'pending',
      ]);
    } catch (error) {
      console.error('Error in User.addContact:', error);
      throw error;
    }
  }

  static async acceptContact(userId, contactId) {
    const pool = await getPool();
    await pool.query('UPDATE contacts SET status = ? WHERE user_id = ? AND contact_id = ?', [
      'accepted',
      contactId,
      userId,
    ]);

    await pool.query(
      'INSERT INTO contacts (user_id, contact_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = ?',
      [userId, contactId, 'accepted', 'accepted']
    );
  }
}

export default User;




