import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatApp from './components/Chat/ChatApp';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/chat" /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={user ? <Navigate to="/chat" /> : <Register />} 
      />
      <Route 
        path="/auth/callback" 
        element={<div>Loading...</div>} 
      />
      <Route 
        path="/chat" 
        element={user ? <ChatApp /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/" 
        element={<Navigate to={user ? "/chat" : "/login"} />} 
      />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Router>
        <AuthProvider>
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;