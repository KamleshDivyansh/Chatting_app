import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const connectedUsers = new Map();

export const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('Authentication error'));
      }
      
      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User ${socket.user.username} connected`);
    
    // Store connected user
    connectedUsers.set(socket.userId, socket.id);
    
    // Update user status to online
    await User.updateStatus(socket.userId, 'online');
    
    // Broadcast user online status
    socket.broadcast.emit('user_status_change', {
      userId: socket.userId,
      status: 'online'
    });

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Handle joining conversation rooms
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    // Handle sending messages
    socket.on('send_message', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('new_message', data);
    });

    // Handle message editing
    socket.on('edit_message', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('message_edited', data);
    });

    // Handle message deletion
    socket.on('delete_message', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('message_deleted', data);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
        userId: socket.userId,
        username: socket.user.username
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_stopped_typing', {
        userId: socket.userId
      });
    });

    // Handle voice calls
    socket.on('call_user', (data) => {
      const targetSocketId = connectedUsers.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('incoming_call', {
          callerId: socket.userId,
          callerName: socket.user.username,
          conversationId: data.conversationId,
          type: data.type
        });
      }
    });

    socket.on('call_accepted', (data) => {
      const callerSocketId = connectedUsers.get(data.callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_accepted', data);
      }
    });

    socket.on('call_rejected', (data) => {
      const callerSocketId = connectedUsers.get(data.callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_rejected', data);
      }
    });

    socket.on('call_ended', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('call_ended', data);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.username} disconnected`);
      
      // Remove from connected users
      connectedUsers.delete(socket.userId);
      
      // Update user status to offline
      await User.updateStatus(socket.userId, 'offline');
      
      // Broadcast user offline status
      socket.broadcast.emit('user_status_change', {
        userId: socket.userId,
        status: 'offline'
      });
    });
  });
};