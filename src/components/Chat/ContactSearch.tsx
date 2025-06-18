import React, { useState } from 'react';
import { Search, X, UserPlus, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface Contact {
  id: number;
  username: string;
  email: string;
  profile_photo?: string;
  status: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  profile_photo?: string;
  status: string;
}

interface ContactSearchProps {
  onClose: () => void;
  onStartChat: (contactId: number) => void;
  contacts: Contact[];
  onUpdateContacts: () => void;
}

const ContactSearch: React.FC<ContactSearchProps> = ({
  onClose,
  onStartChat,
  contacts,
  onUpdateContacts
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/users/search?query=${query}`);
      setSearchResults(response.data.users);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (userId: number) => {
    try {
      await axios.post('/users/contacts', { contactId: userId });
      onUpdateContacts();
      onStartChat(userId);
      onClose();
    } catch (error) {
      if (error.response?.data?.message === 'Contact already exists') {
        onStartChat(userId);
        onClose();
      } else {
        console.error('Error adding contact:', error);
      }
    }
  };

  const isContact = (userId: number) => {
    return contacts.some(contact => contact.id === userId);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[600px] flex flex-col overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">New Chat</h2>
              <motion.button
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>
            </div>
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users by username or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Your Contacts</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {contacts.length === 0 ? (
                <p className="text-gray-500 text-sm">No contacts yet</p>
              ) : (
                contacts.map((contact) => (
                  <motion.div
                    key={contact.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    onClick={() => {
                      onStartChat(contact.id);
                      onClose();
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={contact.profile_photo ? `http://localhost:3000${contact.profile_photo}` : '/api/placeholder/32/32'}
                        alt={contact.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{contact.username}</p>
                        <p className="text-sm text-gray-500">{contact.email}</p>
                      </div>
                    </div>
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                  </motion.div>
                ))
              )}
            </div>
          </div>
          <div className="flex-1 p-4 border-t border-gray-200 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Search Results</h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-gray-500 text-sm">
                {searchQuery ? 'No users found' : 'Start typing to search for users'}
              </p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <motion.div
                    key={user.id}
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={user.profile_photo ? `http://localhost:3000${user.profile_photo}` : '/api/placeholder/40/40'}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{user.username}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isContact(user.id) ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            onStartChat(user.id);
                            onClose();
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Chat
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAddContact(user.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Add</span>
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ContactSearch;



























// import React, { useState } from 'react';
// import { Search, X, UserPlus, MessageCircle } from 'lucide-react';
// import axios from 'axios';

// interface Contact {
//   id: number;
//   username: string;
//   email: string;
//   profile_photo?: string;
//   status: string;
// }

// interface User {
//   id: number;
//   username: string;
//   email: string;
//   profile_photo?: string;
//   status: string;
// }

// interface ContactSearchProps {
//   onClose: () => void;
//   onStartChat: (contactId: number) => void;
//   contacts: Contact[];
//   onUpdateContacts: () => void;
// }

// const ContactSearch: React.FC<ContactSearchProps> = ({
//   onClose,
//   onStartChat,
//   contacts,
//   onUpdateContacts
// }) => {
//   const [searchQuery, setSearchQuery] = useState('');
//   const [searchResults, setSearchResults] = useState<User[]>([]);
//   const [loading, setLoading] = useState(false);

//   const handleSearch = async (query: string) => {
//     if (!query.trim()) {
//       setSearchResults([]);
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await axios.get(`/users/search?query=${query}`);
//       setSearchResults(response.data.users);
//     } catch (error) {
//       console.error('Error searching users:', error);
//       console.log('Failed to search users');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleAddContact = async (userId: number) => {
//     try {
//       await axios.post('/users/contacts', { contactId: userId });
//       onUpdateContacts();
//       onStartChat(userId);
//       onClose();
//       console.log('Contact added and chat started');
//     } catch (error) {
//       if (error.response?.data?.message === 'Contact already exists') {
//         onStartChat(userId);
//         onClose();
//         console.log('Contact already exists, starting chat');
//       } else {
//         console.error('Error adding contact:', error);
//         console.log(error.response?.data?.message || 'Failed to add contact');
//       }
//     }
//   };

//   const isContact = (userId: number) => {
//     return contacts.some(contact => contact.id === userId);
//   };

//   return (
//     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[600px] flex flex-col">
//         <div className="p-6 border-b border-gray-200">
//           <div className="flex items-center justify-between mb-4">
//             <h2 className="text-xl font-semibold text-gray-900">New Chat</h2>
//             <button
//               onClick={onClose}
//               className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//             >
//               <X className="w-5 h-5 text-gray-600" />
//             </button>
//           </div>
//           <div className="relative">
//             <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
//             <input
//               type="text"
//               placeholder="Search users by username or email..."
//               value={searchQuery}
//               onChange={(e) => {
//                 setSearchQuery(e.target.value);
//                 handleSearch(e.target.value);
//               }}
//               className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             />
//           </div>
//         </div>
//         <div className="p-4">
//           <h3 className="text-sm font-medium text-gray-700 mb-3">Your Contacts</h3>
//           <div className="space-y-2 max-h-32 overflow-y-auto">
//             {contacts.length === 0 ? (
//               <p className="text-gray-500 text-sm">No contacts yet</p>
//             ) : (
//               contacts.map((contact) => (
//                 <div
//                   key={contact.id}
//                   className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
//                   onClick={() => {
//                     onStartChat(contact.id);
//                     onClose();
//                   }}
//                 >
//                   <div className="flex items-center space-x-3">
//                     <img
//                       src={contact.profile_photo ? `http://localhost:3000${contact.profile_photo}` : '/api/placeholder/32/32'}
//                       alt={contact.username}
//                       className="w-8 h-8 rounded-full object-cover"
//                     />
//                     <div>
//                       <p className="font-medium text-gray-900">{contact.username}</p>
//                       <p className="text-sm text-gray-500">{contact.email}</p>
//                     </div>
//                   </div>
//                   <MessageCircle className="w-4 h-4 text-blue-600" />
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//         <div className="flex-1 p-4 border-t border-gray-200 overflow-y-auto">
//           <h3 className="text-sm font-medium text-gray-700 mb-3">Search Results</h3>
//           {loading ? (
//             <div className="flex justify-center py-4">
//               <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
//             </div>
//           ) : searchResults.length === 0 ? (
//             <p className="text-gray-500 text-sm">
//               {searchQuery ? 'No users found' : 'Start typing to search for users'}
//             </p>
//           ) : (
//             <div className="space-y-2">
//               {searchResults.map((user) => (
//                 <div
//                   key={user.id}
//                   className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
//                 >
//                   <div className="flex items-center space-x-3">
//                     <img
//                       src={user.profile_photo ? `http://localhost:3000${user.profile_photo}` : '/api/placeholder/40/40'}
//                       alt={user.username}
//                       className="w-10 h-10 rounded-full object-cover"
//                     />
//                     <div>
//                       <p className="font-medium text-gray-900">{user.username}</p>
//                       <p className="text-sm text-gray-500">{user.email}</p>
//                     </div>
//                   </div>
//                   <div className="flex items-center space-x-2">
//                     {isContact(user.id) ? (
//                       <button
//                         onClick={() => {
//                           onStartChat(user.id);
//                           onClose();
//                         }}
//                         className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
//                       >
//                         Chat
//                       </button>
//                     ) : (
//                       <button
//                         onClick={() => handleAddContact(user.id)}
//                         className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
//                       >
//                         <UserPlus className="w-4 h-4" />
//                         <span>Add</span>
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ContactSearch;