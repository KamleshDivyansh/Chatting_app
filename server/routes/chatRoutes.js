import express from 'express';
import { getConversations, createConversation, getMessages, sendMessage, editMessage, deleteMessage, startPrivateChat } from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/conversations', authenticate, getConversations);
router.post('/conversations', authenticate, createConversation);
router.post('/conversations/private', authenticate, startPrivateChat);
router.get('/conversations/:conversationId/messages', authenticate, getMessages);
router.post('/messages', authenticate, upload.single('file'), sendMessage);
router.put('/messages/:messageId', authenticate, editMessage);
router.delete('/messages/:messageId', authenticate, deleteMessage);

export default router;