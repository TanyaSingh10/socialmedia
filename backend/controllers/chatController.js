const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

const getChats = async (req, res) => {
  try {
    const chats = await ChatRoom.find({
      participants: req.user._id,
    })
      .populate('participants', 'username profilePic bio')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username profilePic',
        },
      })
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    console.error('getChats error:', error);
    res.status(500).json({ message: error.message });
  }
};

const createOrGetDirectChat = async (req, res) => {
  const { participantId } = req.body;

  if (!participantId) {
    return res.status(400).json({ message: 'Participant ID is required' });
  }

  try {
    // Check if direct chat room already exists between these two users
    let chat = await ChatRoom.findOne({
      type: 'direct',
      participants: { $all: [req.user._id, participantId] },
    })
      .populate('participants', 'username profilePic bio')
      .populate('lastMessage');

    if (!chat) {
      chat = await ChatRoom.create({
        participants: [req.user._id, participantId],
        type: 'direct',
      });
      chat = await ChatRoom.findById(chat._id).populate('participants', 'username profilePic bio');
    }

    res.json(chat);
  } catch (error) {
    console.error('createOrGetDirectChat error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const chatRoomId = req.params.id;

    // Verify participant
    const chatRoom = await ChatRoom.findOne({
      _id: chatRoomId,
      participants: req.user._id,
    });

    if (!chatRoom) {
      return res.status(403).json({ message: 'Unauthorized access to chat history' });
    }

    const messages = await Message.find({ chatRoom: chatRoomId })
      .populate('sender', 'username profilePic')
      .sort({ createdAt: 1 })
      .limit(100);

    // Proactively mark all messages in this room not sent by req.user as read
    await Message.updateMany(
      {
        chatRoom: chatRoomId,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      {
        $addToSet: { readBy: req.user._id },
      }
    );

    res.json(messages);
  } catch (error) {
    console.error('getChatMessages error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getChats,
  createOrGetDirectChat,
  getChatMessages,
};
