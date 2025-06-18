import Chat from '../models/Chat.js';

export const getConversations = async (req, res) => {
  try {
    const conversations = await Chat.getUserConversations(req.userId);
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createConversation = async (req, res) => {
  try {
    const { type, participants, name } = req.body;
    const conversationId = await Chat.createConversation(
      type, 
      req.userId, 
      [...participants, req.userId], 
      name
    );
    
    res.status(201).json({ 
      message: 'Conversation created', 
      conversationId 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const messages = await Chat.getMessages(conversationId, parseInt(limit), parseInt(offset));
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, messageType = 'text' } = req.body;
    let fileUrl = null;
    let fileName = null;
    
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
    }

    const message = await Chat.sendMessage(
      conversationId, 
      req.userId, 
      content, 
      messageType, 
      fileUrl, 
      fileName
    );
    
    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    
    await Chat.editMessage(messageId, content, req.userId);
    res.json({ message: 'Message updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    await Chat.deleteMessage(messageId, req.userId);
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const startPrivateChat = async (req, res) => {
  try {
    const { contactId } = req.body;
    const conversationId = await Chat.getOrCreatePrivateConversation(req.userId, contactId);
    res.json({ conversationId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};