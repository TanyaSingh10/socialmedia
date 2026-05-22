const express = require('express');
const router = express.Router();
const { getChats, createOrGetDirectChat, getChatMessages } = require('../controllers/chatController');
const { protect } = require('../middlewares/auth');

router.get('/', protect, getChats);
router.post('/', protect, createOrGetDirectChat);
router.get('/:id/messages', protect, getChatMessages);

module.exports = router;
