import express from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  searchUsers,
  getContacts,
  addContact,
  getOnlineUsers,
  googleAuth,
  googleAuthCallback,
  facebookAuth,
  facebookAuthCallback,
  sendPhoneOtp,
  verifyPhoneOtp,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import passport from 'passport';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/auth/phone/otp', sendPhoneOtp);
router.post('/auth/phone/verify', verifyPhoneOtp);
router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), googleAuthCallback);
router.get('/auth/facebook', facebookAuth);
router.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), facebookAuthCallback);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, upload.single('profile_photo'), updateProfile);
router.get('/search', authenticate, searchUsers);
router.get('/contacts', authenticate, getContacts);
router.post('/contacts', authenticate, addContact);
router.get('/online', authenticate, getOnlineUsers);

export default router;










