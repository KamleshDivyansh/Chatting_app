import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { Phone, Video, MoreVertical, Send, Paperclip, Smile, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: number;
  content: string;
  sender_id: number;
  username: string;
  profile_photo?: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
  edited_at?: string;
}

interface Conversation {
  id: number;
  type: string;
  name?: string;
  other_user_id?: number;
  other_username?: string;
  other_profile_photo?: string;
  other_status?: string;
}

interface ChatWindowProps {
  conversation: Conversation;
  onConversationUpdate: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, onConversationUpdate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { socket, onlineUsers, typingUsers } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (conversation) {
      fetchMessages();
      if (socket) {
        socket.emit('join_conversation', conversation.id);
      }
    }

    return () => {
      if (socket && conversation) {
        socket.emit('leave_conversation', conversation.id);
      }
    };
  }, [conversation, socket]);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', (message: Message) => {
        if (message.conversation_id === conversation.id) {
          setMessages(prev => [...prev, message]);
        }
      });

      socket.on('message_edited', (data) => {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, content: data.content, edited_at: new Date().toISOString() }
            : msg
        ));
      });

      socket.on('message_deleted', (data) => {
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      });

      return () => {
        socket.off('new_message');
        socket.off('message_edited');
        socket.off('message_deleted');
      };
    }
  }, [socket, conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/chat/conversations/${conversation.id}/messages`);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post('/chat/messages', {
        conversationId: conversation.id,
        content: newMessage,
        messageType: 'text'
      });

      const message = response.data.message;
      setMessages(prev => [...prev, message]);
      setNewMessage('');

      if (socket) {
        socket.emit('send_message', {
          ...message,
          conversationId: conversation.id
        });
      }

      onConversationUpdate();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!isTyping && socket) {
      setIsTyping(true);
      socket.emit('typing_start', { conversationId: conversation.id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (socket) {
        socket.emit('typing_stop', { conversationId: conversation.id });
      }
    }, 1000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversation.id.toString());
    formData.append('content', file.name);
    formData.append('messageType', file.type.startsWith('image/') ? 'image' : 'file');

    try {
      const response = await axios.post('/chat/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const message = response.data.message;
      setMessages(prev => [...prev, message]);

      if (socket) {
        socket.emit('send_message', {
          ...message,
          conversationId: conversation.id
        });
      }

      onConversationUpdate();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleEditMessage = async (messageId: number) => {
    if (!editContent.trim()) return;

    try {
      await axios.put(`/chat/messages/${messageId}`, {
        content: editContent
      });

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: editContent, edited_at: new Date().toISOString() }
          : msg
      ));

      if (socket) {
        socket.emit('edit_message', {
          messageId,
          content: editContent,
          conversationId: conversation.id
        });
      }

      setEditingMessage(null);
      setEditContent('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      await axios.delete(`/chat/messages/${messageId}`);
      
      setMessages(prev => prev.filter(msg => msg.id !== messageId));

      if (socket) {
        socket.emit('delete_message', {
          messageId,
          conversationId: conversation.id
        });
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isOnline = conversation.other_user_id ? onlineUsers.has(conversation.other_user_id) : false;
  const isUserTyping = Array.from(typingUsers.values()).length > 0;

  return (
    <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm">
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={
                  conversation.other_profile_photo
                    ? `http://localhost:3000${conversation.other_profile_photo}`
                    : '/api/placeholder/40/40'
                }
                alt={conversation.other_username}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${
                isOnline ? 'bg-green-500' : 'bg-gray-400'
              } rounded-full border-2 border-white`}></div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {conversation.name || conversation.other_username}
              </h3>
              <p className="text-sm text-gray-500">
                {isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Phone className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Video className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative group ${
                message.sender_id === user?.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : 'bg-white border border-gray-200'
              }`}>
                {message.message_type === 'image' && message.file_url && (
                  <img
                    src={`http://localhost:3000${message.file_url}`}
                    alt="Uploaded image"
                    className="max-w-full h-auto rounded-lg mb-2"
                  />
                )}
                
                {message.message_type === 'file' && message.file_url && (
                  <div className="flex items-center space-x-2 mb-2">
                    <Paperclip className="w-4 h-4" />
                    <a
                      href={`http://localhost:3000${message.file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                    >
                      {message.file_name || 'Download file'}
                    </a>
                  </div>
                )}

                {editingMessage === message.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-2 py-1 text-black border rounded"
                      onKeyPress={(e) => e.key === 'Enter' && handleEditMessage(message.id)}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditMessage(message.id)}
                        className="text-xs px-2 py-1 bg-green-500 text-white rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingMessage(null)}
                        className="text-xs px-2 py-1 bg-gray-500 text-white rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className={message.sender_id === user?.id ? 'text-white' : 'text-gray-800'}>
                      {message.content}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${
                        message.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.created_at)}
                        {message.edited_at && ' (edited)'}
                      </span>
                    </div>
                  </>
                )}

                {message.sender_id === user?.id && editingMessage !== message.id && (
                  <div className="absolute right-0 top-0 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full shadow-lg p-1 flex space-x-1">
                    <button
                      onClick={() => {
                        setEditingMessage(message.id);
                        setEditContent(message.content);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <Edit2 className="w-3 h-3 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
        
        <AnimatePresence>
          {isUserTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-gray-200 px-4 py-2 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white/80 backdrop-blur-lg border-t border-gray-200/50 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
          />
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Paperclip className="w-5 h-5 text-gray-600" />
          </motion.button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type a message..."
              className="w-full px-4 py-3 pr-12 bg-gray-100/50 border border-gray-200/50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Smile className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!newMessage.trim()}
            className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;





