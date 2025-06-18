import pool from '../config/database.js';

class Chat {
  static async createConversation(type, createdBy, participants, name = null) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const [result] = await connection.execute(
        'INSERT INTO conversations (type, name, created_by) VALUES (?, ?, ?)',
        [type, name, createdBy]
      );
      
      const conversationId = result.insertId;
      
      for (const participantId of participants) {
        await connection.execute(
          'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
          [conversationId, participantId]
        );
      }
      
      await connection.commit();
      return conversationId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getUserConversations(userId) {
    const [rows] = await pool.execute(`
      SELECT DISTINCT c.id, c.type, c.name, c.created_at,
             u.id as other_user_id, u.username as other_username, 
             u.profile_photo as other_profile_photo, u.status as other_status,
             (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
             (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_time
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != ?
      LEFT JOIN users u ON cp2.user_id = u.id
      WHERE cp.user_id = ?
      ORDER BY last_message_time DESC
    `, [userId, userId]);
    
    return rows;
  }

  static async getOrCreatePrivateConversation(user1Id, user2Id) {
    const [existing] = await pool.execute(`
      SELECT c.id FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
      WHERE c.type = 'private' 
      AND cp1.user_id = ? AND cp2.user_id = ?
    `, [user1Id, user2Id]);

    if (existing.length > 0) {
      return existing[0].id;
    }

    return await this.createConversation('private', user1Id, [user1Id, user2Id]);
  }

  static async getMessages(conversationId, limit = 50, offset = 0) {
    const [rows] = await pool.execute(`
      SELECT m.*, u.username, u.profile_photo
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ? AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [conversationId, limit, offset]);
    
    return rows.reverse();
  }

  static async sendMessage(conversationId, senderId, content, messageType = 'text', fileUrl = null, fileName = null) {
    const [result] = await pool.execute(
      'INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url, file_name) VALUES (?, ?, ?, ?, ?, ?)',
      [conversationId, senderId, content, messageType, fileUrl, fileName]
    );
    
    const [message] = await pool.execute(`
      SELECT m.*, u.username, u.profile_photo
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `, [result.insertId]);
    
    return message[0];
  }

  static async editMessage(messageId, content, userId) {
    await pool.execute(
      'UPDATE messages SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id = ?',
      [content, messageId, userId]
    );
  }

  static async deleteMessage(messageId, userId) {
    await pool.execute(
      'UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id = ?',
      [messageId, userId]
    );
  }
}

export default Chat;