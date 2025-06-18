import express from 'express';
import { register, login, getProfile, updateProfile, searchUsers, getContacts, addContact } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, upload.single('profile_photo'), updateProfile);
router.get('/search', authenticate, searchUsers);
router.get('/contacts', authenticate, getContacts);
router.post('/contacts', authenticate, addContact);

export default router;