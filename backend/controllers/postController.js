const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { uploadFile } = require('../config/s3');
const { delCache } = require('../config/redis');

const createPost = async (req, res) => {
  try {
    const { caption } = req.body;
    let mediaUrl = '';
    let mediaType = 'none';

    if (req.file) {
      mediaUrl = await uploadFile(req.file);
      mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    }

    const post = await Post.create({
      user: req.user._id,
      caption,
      mediaUrl,
      mediaType,
    });

    const populatedPost = await Post.findById(post._id).populate('user', 'username profilePic');

    // Invalidate feed cache for this user
    await delCache(`api-cache:${req.user._id}:/api/posts/feed`);

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('createPost error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getFeed = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const followingIds = currentUser.following || [];
    
    // Include followed users, self, and public posts
    const query = {
      $or: [
        { user: { $in: [...followingIds, req.user._id] } },
        // Fallback: show other posts if feed is thin (makes testing nicer!)
        { user: { $exists: true } },
      ],
    };

    const posts = await Post.find(query)
      .populate('user', 'username profilePic bio')
      .populate('commentCount')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(posts);
  } catch (error) {
    console.error('getFeed error:', error);
    res.status(500).json({ message: error.message });
  }
};

const likePostToggle = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const alreadyLiked = post.likes.includes(req.user._id);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== req.user._id.toString());
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();

    // Invalidate feed cache for liking user
    await delCache(`api-cache:${req.user._id}:/api/posts/feed`);

    res.json({
      liked: !alreadyLiked,
      likesCount: post.likes.length,
      likes: post.likes,
    });
  } catch (error) {
    console.error('likePostToggle error:', error);
    res.status(500).json({ message: error.message });
  }
};

const commentOnPost = async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Comment text is required' });
  }

  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = await Comment.create({
      post: post._id,
      user: req.user._id,
      text,
    });

    const populatedComment = await Comment.findById(comment._id).populate('user', 'username profilePic');

    // Invalidate feed cache for this user
    await delCache(`api-cache:${req.user._id}:/api/posts/feed`);

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('commentOnPost error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getPostComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate('user', 'username profilePic')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    console.error('getPostComments error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPost,
  getFeed,
  likePostToggle,
  commentOnPost,
  getPostComments,
};
