const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, followToggle, searchUsers } = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.get('/profile/:username', protect, getProfile);
router.put('/profile', protect, upload.single('profilePic'), updateProfile);
router.post('/follow/:id', protect, followToggle);
router.get('/search', protect, searchUsers);

module.exports = router;
