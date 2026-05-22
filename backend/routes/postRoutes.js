const express = require('express');
const router = express.Router();
const { createPost, getFeed, likePostToggle, commentOnPost, getPostComments } = require('../controllers/postController');
const { protect } = require('../middlewares/auth');
const { cacheMiddleware } = require('../middlewares/cache');
const upload = require('../middlewares/upload');

router.post('/', protect, upload.single('media'), createPost);
router.get('/feed', protect, cacheMiddleware(10), getFeed); // cached for 10 seconds for lightning fast retrieval
router.post('/like/:id', protect, likePostToggle);
router.post('/comment/:id', protect, commentOnPost);
router.get('/comment/:id', protect, getPostComments);

module.exports = router;
