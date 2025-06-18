import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { Search, Plus, Settings, MessageCircle, Users, Phone, Video } from 'lucide-react';
import ContactSearch from './ContactSearch';
import axios from 'axios';

interface Contact {
  id: number;
  username: string;
  email: string;
  profile_photo?: string;
  status: string;
}

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

interface SidebarProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onStartNewChat: (contactId: number) => void;
  onShowProfile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversation,
  onSelectConversation,
  onStartNewChat,
  onShowProfile
}) => {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await axios.get('/users/contacts');
      setContacts(response.data.contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string, userId?: number) => {
    if (userId && onlineUsers.has(userId)) return 'bg-green-500';
    if (status === 'online') return 'bg-green-500';
    if (status === 'away') return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="w-80 bg-white/80 backdrop-blur-lg border-r border-white/20 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200/50">
          <div className="flex items-center justify-between mb-4">
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100/50 rounded-lg p-2 -m-2 transition-colors"
              onClick={onShowProfile}
            >
              <div className="relative">
                <img
                  src={user?.profile_photo ? `http://localhost:3000${user.profile_photo}` : '/api/placeholder/40/40'}
                  alt={user?.username}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor('online')} rounded-full border-2 border-white`}></div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{user?.username}</h3>
                <p className="text-sm text-gray-500">Online</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowContactSearch(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={logout}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100/50 border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <button
                onClick={() => setShowContactSearch(true)}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Start a new chat
              </button>
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-100/50 ${
                    activeConversation?.id === conversation.id
                      ? 'bg-blue-50 border border-blue-200/50'
                      : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={
                        conversation.other_profile_photo
                          ? `http://localhost:3000${conversation.other_profile_photo}`
                          : '/api/placeholder/48/48'
                      }
                      alt={conversation.other_username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div 
                      className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(
                        conversation.other_status || 'offline',
                        conversation.other_user_id
                      )} rounded-full border-2 border-white`}
                    ></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {conversation.name || conversation.other_username}
                      </h3>
                      {conversation.last_message_time && (
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.last_message_time)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.last_message || 'No messages yet'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showContactSearch && (
        <ContactSearch
          onClose={() => setShowContactSearch(false)}
          onStartChat={onStartNewChat}
          contacts={contacts}
          onUpdateContacts={fetchContacts}
        />
      )}
    </>
  );
};

export default Sidebar;