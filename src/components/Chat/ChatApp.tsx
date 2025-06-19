import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import UserProfile from './UserProfile';
import { useSocket } from '../../contexts/SocketContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface Conversation {
  id: number;
  type: string;
  name?: string;
  other_user_id?: number;
  other_username?: string;
  other_profile_photo?: string;
  other_status?: string;
  last_message?: string;
  last_message_time?: string;
}

const ChatApp: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await axios.get('/chat/conversations');
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const startNewChat = async (contactId: number) => {
    try {
      const response = await axios.post('/chat/conversations/private', {
        contactId
      });
      
      const conversationId = response.data.conversationId;
      
      let conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) {
        await fetchConversations();
        conversation = conversations.find(c => c.id === conversationId);
      }
      
      if (conversation) {
        setActiveConversation(conversation);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={setActiveConversation}
          onStartNewChat={startNewChat}
          onShowProfile={() => setShowProfile(true)}
        />
        
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <ChatWindow
              conversation={activeConversation}
              onConversationUpdate={fetchConversations}
            />
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center bg-white/50 backdrop-blur-sm"
            >
              <div className="text-center">
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <span className="text-white text-3xl">💬</span>
                </motion.div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  Welcome to ChatApp
                </h2>
                <p className="text-gray-600">
                  Select a conversation to start chatting
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showProfile && (
          <UserProfile onClose={() => setShowProfile(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatApp;




