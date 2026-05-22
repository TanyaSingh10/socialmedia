const socketIO = require('socket.io');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');

// Online users map: userId -> socketId
const onlineUsers = new Map();

const initSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Register active user
    socket.on('setup', (userData) => {
      if (userData && userData._id) {
        socket.join(userData._id);
        onlineUsers.set(userData._id, socket.id);
        console.log(`User ${userData.username} registered with socket ${socket.id}`);
        // Broadcast that user is online
        io.emit('user_status', { userId: userData._id, status: 'online' });
      }
    });

    // Join room
    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    // Send message (database sync + real-time delivery)
    socket.on('new_message', async (messageData) => {
      const { chatRoomId, senderId, text, mediaUrl } = messageData;

      if (!chatRoomId || !senderId) {
        return console.warn('Missing chatRoomId or senderId in new_message');
      }

      try {
        // 1. Create message in DB
        let message = await Message.create({
          chatRoom: chatRoomId,
          sender: senderId,
          text: text || '',
          mediaUrl: mediaUrl || '',
          readBy: [senderId],
        });

        message = await Message.findById(message._id).populate('sender', 'username profilePic');

        // 2. Update ChatRoom lastMessage
        await ChatRoom.findByIdAndUpdate(chatRoomId, {
          lastMessage: message._id,
        });

        // 3. Emit message to all sockets in the room
        io.to(chatRoomId).emit('message_received', message);

        // 4. Send notification or update triggers to chat list observers
        // Find other participants of the chat room to alert them (if not active in room)
        const chatRoom = await ChatRoom.findById(chatRoomId);
        if (chatRoom) {
          chatRoom.participants.forEach((participantId) => {
            if (participantId.toString() === senderId.toString()) return;
            // Emit chat list update alert to participant
            io.to(participantId.toString()).emit('chat_list_updated', {
              chatRoomId,
              lastMessage: message,
            });
          });
        }
      } catch (err) {
        console.error('Socket new_message error:', err.message);
      }
    });

    // Typing indicators
    socket.on('typing', (room) => {
      socket.in(room).emit('typing', room);
    });

    socket.on('stop_typing', (room) => {
      socket.in(room).emit('stop_typing', room);
    });

    // Mark messages read
    socket.on('mark_read', async ({ chatRoomId, userId }) => {
      try {
        await Message.updateMany(
          {
            chatRoom: chatRoomId,
            sender: { $ne: userId },
            readBy: { $ne: userId },
          },
          {
            $addToSet: { readBy: userId },
          }
        );
        socket.in(chatRoomId).emit('messages_marked_read', { chatRoomId, userId });
      } catch (err) {
        console.error('Socket mark_read error:', err.message);
      }
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      let disconnectedUserId = null;
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          onlineUsers.delete(userId);
          break;
        }
      }
      if (disconnectedUserId) {
        console.log(`User ${disconnectedUserId} disconnected`);
        io.emit('user_status', { userId: disconnectedUserId, status: 'offline' });
      }
    });
  });

  return io;
};

module.exports = { initSocket, onlineUsers };
