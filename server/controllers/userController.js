import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectedUsers } from './socketController.js';

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const userId = await User.create({ username, email, password });
    const token = generateToken(userId);

    const user = await User.findById(userId);
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    await User.updateStatus(user.id, 'online');
    const token = generateToken(user.id);

    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.searchUsers(query, req.userId);
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getContacts = async (req, res) => {
  try {
    const contacts = await User.getContacts(req.userId);
    res.json({ contacts });
  } catch (error) {
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
    console.error('Error in addContact:', error);
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
    console.error('Error fetching online users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};