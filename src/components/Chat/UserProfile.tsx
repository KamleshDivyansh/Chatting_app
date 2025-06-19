import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { X, Camera, User, Mail, Edit, Save } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserProfileProps {
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('bio', bio);
      
      await updateProfile(formData);
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('profile_photo', file);
      formData.append('bio', bio);
      
      await updateProfile(formData);
    } catch (error) {
      console.error('Error updating photo:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
            <motion.button
              whileHover={{ rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </motion.button>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <img
                src={user?.profile_photo ? `http://localhost:3000${user.profile_photo}` : '/api/placeholder/120/120'}
                alt={user?.username}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors shadow-lg"
              >
                <Camera className="w-4 h-4" />
              </motion.button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            {loading && (
              <div className="mt-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <motion.div 
              whileHover={{ x: 5 }}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              <User className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Username</p>
                <p className="font-medium text-gray-900">{user?.username}</p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ x: 5 }}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              <Mail className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ x: 5 }}
              className="p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Bio</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => editing ? handleSave() : setEditing(true)}
                  disabled={loading}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {editing ? (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </>
                  )}
                </motion.button>
              </div>
              
              {editing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              ) : (
                <p className="text-gray-900">
                  {bio || 'No bio added yet'}
                </p>
              )}
            </motion.div>
          </div>

          {editing && (
            <div className="mt-6 flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setEditing(false);
                  setBio(user?.bio || '');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserProfile;
