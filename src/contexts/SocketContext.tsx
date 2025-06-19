import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import axios from 'axios';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Set<number>;
  typingUsers: Map<number, string>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      const newSocket = io('http://localhost:3000', {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setOnlineUsers(prev => new Set(prev).add(user.id));
        newSocket.emit('request_initial_status');
      });

      newSocket.on('initial_status', (data: { onlineUserIds: number[] }) => {
        console.log('Received initial_status:', data);
        setOnlineUsers(new Set(data.onlineUserIds.map(Number)));
      });

      newSocket.on('user_status_change', (data: { userId: number | string; status: string }) => {
        console.log('Received user_status_change:', data);
        const userId = Number(data.userId); 
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (data.status === 'online') {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          console.log('Updated onlineUsers:', Array.from(newSet));
          return newSet;
        });
      });

      newSocket.on('user_typing', (data) => {
        setTypingUsers(prev => new Map(prev.set(Number(data.userId), data.username)));
      });

      newSocket.on('user_stopped_typing', (data) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(Number(data.userId));
          return newMap;
        });
      });

      setSocket(newSocket);

      const fetchOnlineUsers = async () => {
        try {
          const response = await axios.get('/users/online', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setOnlineUsers(new Set(response.data.userIds.map(Number)));
          console.log('Fetched online users:', response.data.userIds);
        } catch (error) {
          console.error('Error fetching online users:', error);
        }
      };

      fetchOnlineUsers();

      return () => {
        newSocket.close();
        setSocket(null);
      };
    }
  }, [user, token]);

  const value = {
    socket,
    onlineUsers,
    typingUsers
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};