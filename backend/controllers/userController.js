const User = require('../models/User');
const Post = require('../models/Post');
const { uploadFile } = require('../config/s3');
const { delCache } = require('../config/redis');

const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's posts
    const posts = await Post.find({ user: user._id })
      .populate('user', 'username profilePic')
      .sort({ createdAt: -1 });

    res.json({
      user,
      posts,
    });
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.body.bio !== undefined) {
      user.bio = req.body.bio;
    }

    if (req.file) {
      const publicUrl = await uploadFile(req.file);
      user.profilePic = publicUrl;
    }

    await user.save();

    // Clear feed caches that might contain this user profile pic/info
    // In production, we'd clear systematically. Here we will clear cache for this user
    const userJson = user.toObject();
    delete userJson.password;

    res.json(userJson);
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const followToggle = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUserId
      );
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUserId.toString()
      );
    } else {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
    }

    await currentUser.save();
    await targetUser.save();

    // Invalidate profile caching and feeds
    await delCache(`api-cache:${currentUserId}:/api/posts/feed`);

    res.json({
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
      following: currentUser.following,
    });
  } catch (error) {
    console.error('followToggle error:', error);
    res.status(500).json({ message: error.message });
  }
};

const searchUsers = async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json([]);
  }

  try {
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
      _id: { $ne: req.user._id }, // exclude self
    })
      .select('username profilePic bio')
      .limit(10);

    res.json(users);
  } catch (error) {
    console.error('searchUsers error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  followToggle,
  searchUsers,
};
