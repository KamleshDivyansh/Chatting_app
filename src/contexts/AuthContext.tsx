import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

interface User {
  id: number;
  username: string;
  email: string;
  profile_photo?: string;
  bio?: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginWithPhone: (phone_number: string, code: string, username: string) => Promise<void>;
  sendPhoneOtp: (phone_number: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: FormData) => Promise<void>;
  handleOAuthCallback: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const API_BASE_URL = 'http://localhost:3000/api';

axios.defaults.baseURL = API_BASE_URL;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (location.pathname === '/auth/callback') {
      handleOAuthCallback();
    }
  }, [location]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/users/profile');
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
      localStorage.removeItem('token');
      setToken(null);
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await axios.post('/users/login', { email, password });
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await axios.post('/users/register', { username, email, password });
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const sendPhoneOtp = async (phone_number: string) => {
    await axios.post('/users/auth/phone/otp', { phone_number });
  };

  const loginWithPhone = async (phone_number: string, code: string, username: string) => {
    const response = await axios.post('/users/auth/phone/verify', { phone_number, code, username });
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateProfile = async (data: FormData) => {
    const response = await axios.put('/users/profile', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    setUser(response.data.user);
  };

  const handleOAuthCallback = () => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const userData = params.get('user');
    const error = params.get('error');

    if (error) {
      navigate('/login', { state: { error: 'Authentication failed' } });
      return;
    }

    if (token && userData) {
      localStorage.setItem('token', token);
      setToken(token);
      setUser(JSON.parse(decodeURIComponent(userData)));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      navigate('/chat');
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    sendPhoneOtp,
    loginWithPhone,
    logout,
    updateProfile,
    handleOAuthCallback,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};