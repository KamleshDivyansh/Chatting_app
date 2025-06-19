import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectedUsers } from './socketController.js';
import passport from 'passport';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d',
  });
};

const validatePhoneNumber = (phone_number) => {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone_number);
};

export const register = async (req, res) => {
  try {
    const { username, email, password, phone_number } = req.body;

    if (!username || (!email && !phone_number)) {
      return res.status(400).json({ message: 'Username and either email or phone number are required' });
    }

    if (email && (await User.findByEmail(email))) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    if (phone_number && !validatePhoneNumber(phone_number)) {
      return res.status(400).json({ message: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' });
    }

    if (phone_number && (await User.findByPhoneNumber(phone_number))) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }

    const userId = await User.create({ username, email, password, phone_number });
    const token = generateToken(userId);

    const user = await User.findById(userId);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, phone_number } = req.body;

    let user;
    if (email) {
      user = await User.findByEmail(email);
    } else if (phone_number) {
      if (!validatePhoneNumber(phone_number)) {
        return res.status(400).json({ message: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' });
      }
      user = await User.findByPhoneNumber(phone_number);
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (password && !user.password) {
      return res.status(400).json({ message: 'User registered via third-party, use OAuth or OTP' });
    }

    const isValidPassword = password ? await bcrypt.compare(password, user.password) : true;
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    await User.updateStatus(user.id, 'online');
    const token = generateToken(user.id);

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const sendPhoneOtp = async (req, res) => {
  try {
    const { phone_number } = req.body;
    console.log('Sending OTP to:', phone_number);

    if (!phone_number) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!validatePhoneNumber(phone_number)) {
      return res.status(400).json({ message: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' });
    }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_VERIFY_SID) {
      console.error('Missing Twilio environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const verification = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({ to: phone_number, channel: 'sms' });

    console.log('OTP sent successfully:', verification.sid);
    res.json({ message: 'OTP sent successfully', sid: verification.sid });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
};

export const verifyPhoneOtp = async (req, res) => {
  try {
    const { phone_number, code, username } = req.body;
    console.log('Verifying OTP for:', phone_number);

    if (!phone_number || !code || !username) {
      return res.status(400).json({ message: 'Phone number, code, and username are required' });
    }

    if (!validatePhoneNumber(phone_number)) {
      return res.status(400).json({ message: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' });
    }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_VERIFY_SID) {
      console.error('Missing Twilio environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const verification = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({ to: phone_number, code });

    if (verification.status !== 'approved') {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    let user = await User.findByPhoneNumber(phone_number);
    if (!user) {
      const userId = await User.create({ username, phone_number });
      user = await User.findById(userId);
    }

    await User.updateStatus(user.id, 'online');
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP', error: error.message });
  }
};

export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
});

export const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect('http://localhost:5173/login?error=auth_failed');
    }
    const token = generateToken(user.id);
    await User.updateStatus(user.id, 'online');

    res.redirect(
      `http://localhost:5173/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`
    );
  } catch (error) {
    console.error('Google auth callback error:', error);
    res.redirect('http://localhost:5173/login?error=auth_failed');
  }
};

export const facebookAuth = passport.authenticate('facebook', {
  scope: ['email'],
});

export const facebookAuthCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect('http://localhost:5173/login?error=auth_failed');
    }
    const token = generateToken(user.id);
    await User.updateStatus(user.id, 'online');

    res.redirect(
      `http://localhost:5173/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`
    );
  } catch (error) {
    console.error('Facebook auth callback error:', error);
    res.redirect('http://localhost:5173/login?error=auth_failed');
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { bio } = req.body;
    let profile_photo = null;

    if (req.file) {
      profile_photo = `/uploads/${req.file.filename}`;
    }

    await User.updateProfile(req.userId, { bio, profile_photo });
    const user = await User.findById(req.userId);

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.searchUsers(query, req.userId);
    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getContacts = async (req, res) => {
  try {
    const contacts = await User.getContacts(req.userId);
    res.json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId || isNaN(contactId)) {
      return res.status(400).json({ message: 'Invalid contact ID' });
    }
    console.log('Adding contact:', { userId: req.userId, contactId });
    await User.addContact(req.userId, contactId);
    res.json({ message: 'Contact request sent' });
  } catch (error) {
    console.error('Add contact error:', error);
    if (error.message === 'Contact already exists') {
      return res.status(400).json({ message: 'Contact already exists' });
    }
    if (error.message === 'Contact user does not exist') {
      return res.status(404).json({ message: 'Contact user not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getOnlineUsers = async (req, res) => {
  try {
    const userIds = Array.from(connectedUsers.keys());
    res.json({ userIds });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



