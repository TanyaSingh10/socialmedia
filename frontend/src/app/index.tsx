import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  useColorScheme,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from '@/components/symbol-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, MaxContentWidth, BottomTabInset } from '@/constants/theme';
import { useAuth, API_URL } from '@/context/AuthContext';

interface Post {
  _id: string;
  user: {
    _id: string;
    username: string;
    profilePic: string;
    bio?: string;
  };
  mediaUrl: string;
  mediaType: string;
  caption: string;
  likes: string[];
  commentCount?: number;
  createdAt: string;
}

export default function HomeScreen() {
  const { token, user: currentUser } = useAuth();
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const safeAreaInsets = useSafeAreaInsets();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Comments Drawer / Sheet state
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  const fetchFeed = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/api/posts/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.warn('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [token]);

  const handleLike = async (postId: string) => {
    try {
      // Optimistic Update
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            const hasLiked = post.likes.includes(currentUser?._id || '');
            const newLikes = hasLiked
              ? post.likes.filter((id) => id !== currentUser?._id)
              : [...post.likes, currentUser?._id || ''];
            return { ...post, likes: newLikes };
          }
          return post;
        })
      );

      const response = await fetch(`${API_URL}/api/posts/like/${postId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Revert on error
        fetchFeed();
      }
    } catch (err) {
      console.error('Like toggle error:', err);
      fetchFeed();
    }
  };

  const openComments = async (post: Post) => {
    setSelectedPost(post);
    setLoadingComments(true);
    try {
      const response = await fetch(`${API_URL}/api/posts/comment/${post._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.warn('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedPost || !newCommentText.trim()) return;
    
    const text = newCommentText;
    setNewCommentText('');

    try {
      const response = await fetch(`${API_URL}/api/posts/comment/${selectedPost._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const comment = await response.json();
        setComments((prev) => [comment, ...prev]);
        // Update comments count on post in feed list
        setPosts((prev) =>
          prev.map((p) =>
            p._id === selectedPost._id
              ? { ...p, commentCount: (p.commentCount || 0) + 1 }
              : p
          )
        );
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const stories = [
    { id: '1', user: { username: 'nebula_art', profilePic: 'https://picsum.photos/id/1012/100/100' } },
    { id: '2', user: { username: 'lunar_scapes', profilePic: 'https://picsum.photos/id/1015/100/100' } },
    { id: '3', user: { username: 'solar_wind', profilePic: 'https://picsum.photos/id/1016/100/100' } },
    { id: '4', user: { username: 'gravity_lens', profilePic: 'https://picsum.photos/id/1019/100/100' } },
    { id: '5', user: { username: 'quantum_leap', profilePic: 'https://picsum.photos/id/1021/100/100' } },
  ];

  const insetsStyle = {
    paddingTop: Platform.OS === 'web' ? 90 : safeAreaInsets.top,
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, insetsStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.feedWrapper}>
          {/* Top Bar Header */}
          <View style={styles.topHeader}>
            <ThemedText type="subtitle" style={styles.logoTitle}>
              Aether
            </ThemedText>
            <TouchableOpacity onPress={() => fetchFeed(true)} style={styles.refreshButton}>
              <SymbolView tintColor={theme.text} name="arrow.clockwise" size={18} />
            </TouchableOpacity>
          </View>

          {/* Stories Reel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesContainer}
          >
            {/* Own Story Add Button */}
            <View style={styles.storyCard}>
              <View style={styles.storyPicContainer}>
                {currentUser?.profilePic ? (
                  <Image source={{ uri: currentUser.profilePic }} style={styles.storyPic} />
                ) : (
                  <View style={[styles.storyPicFallback, { backgroundColor: '#4F46E5' }]}>
                    <ThemedText style={{ color: '#ffffff', fontWeight: 'bold' }}>+</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText type="small" numberOfLines={1} style={styles.storyUser}>
                Your Story
              </ThemedText>
            </View>

            {stories.map((story) => (
              <View key={story.id} style={styles.storyCard}>
                <View style={[styles.storyPicContainer, styles.storyPicBorder]}>
                  <Image source={{ uri: story.user.profilePic }} style={styles.storyPic} />
                </View>
                <ThemedText type="small" numberOfLines={1} style={styles.storyUser}>
                  {story.user.username}
                </ThemedText>
              </View>
            ))}
          </ScrollView>

          {/* Posts Feed list */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.six }} size="large" color="#4F46E5" />
          ) : posts.length === 0 ? (
            <View style={styles.emptyFeed}>
              <SymbolView tintColor={theme.textSecondary} name="photo.on.rectangle.angled" size={48} />
              <ThemedText type="smallBold" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
                Your Feed is empty!
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', paddingHorizontal: Spacing.four }}>
                Share your first post or follow creators in the Explore page to start.
              </ThemedText>
            </View>
          ) : (
            posts.map((post) => {
              const hasLiked = post.likes.includes(currentUser?._id || '');
              return (
                <View
                  key={post._id}
                  style={[
                    styles.postCard,
                    {
                      backgroundColor: scheme === 'dark' ? 'rgba(33, 34, 37, 0.4)' : '#F7F7FA',
                      borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    },
                  ]}
                >
                  {/* Post User Header */}
                  <View style={styles.postHeader}>
                    <Image
                      source={
                        post.user.profilePic
                          ? { uri: post.user.profilePic }
                          : 'https://picsum.photos/id/1025/100/100'
                      }
                      style={styles.avatar}
                    />
                    <View>
                      <ThemedText type="smallBold">{post.user.username}</ThemedText>
                      {post.user.bio ? (
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                          {post.user.bio}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>

                  {/* Post Image Content */}
                  {post.mediaUrl ? (
                    <Image source={{ uri: post.mediaUrl }} style={styles.postMedia} contentFit="cover" />
                  ) : null}

                  {/* Actions (Like, Comment) */}
                  <View style={styles.actionsBar}>
                    <TouchableOpacity onPress={() => handleLike(post._id)} style={styles.actionItem}>
                      <SymbolView
                        tintColor={hasLiked ? '#EF4444' : theme.text}
                        name={hasLiked ? 'heart.fill' : 'heart'}
                        size={20}
                      />
                      <ThemedText type="smallBold">{post.likes.length}</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => openComments(post)} style={styles.actionItem}>
                      <SymbolView tintColor={theme.text} name="bubble.right" size={20} />
                      <ThemedText type="smallBold">{post.commentCount || 0}</ThemedText>
                    </TouchableOpacity>
                  </View>

                  {/* Caption */}
                  {post.caption ? (
                    <View style={styles.captionContainer}>
                      <ThemedText type="small">
                        <ThemedText type="smallBold">{post.user.username} </ThemedText>
                        {post.caption}
                      </ThemedText>
                    </View>
                  ) : null}

                  {/* Posted Date */}
                  <ThemedText type="small" themeColor="textSecondary" style={styles.postTime}>
                    {new Date(post.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </ThemedText>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Pop-up Comments Section (Web overlay / Mobile sheet modal look) */}
      {selectedPost ? (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.backgroundElement }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Comments</ThemedText>
              <TouchableOpacity onPress={() => setSelectedPost(null)}>
                <SymbolView tintColor={theme.text} name="xmark" size={20} />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator style={{ flex: 1 }} size="small" color="#4F46E5" />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item._id}
                style={styles.commentsList}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <Image source={{ uri: item.user.profilePic || 'https://picsum.photos/id/1025/100/100' }} style={styles.commentAvatar} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="small">
                        <ThemedText type="smallBold">{item.user.username} </ThemedText>
                        {item.text}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.half, fontSize: 10 }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                )}
                ListEmptyComponent={() => (
                  <View style={styles.emptyComments}>
                    <ThemedText type="small" themeColor="textSecondary">
                      No comments yet. Be the first to share your thoughts!
                    </ThemedText>
                  </View>
                )}
              />
            )}

            {/* Comment Input */}
            <View style={[styles.commentInputRow, { borderTopColor: theme.backgroundElement }]}>
              <TextInput
                style={[styles.commentInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="Write a comment..."
                placeholderTextColor={scheme === 'dark' ? '#60646C' : '#90949C'}
                value={newCommentText}
                onChangeText={setNewCommentText}
              />
              <TouchableOpacity onPress={handleAddComment} style={styles.commentSendBtn}>
                <SymbolView tintColor="#4F46E5" name="paperplane.fill" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: BottomTabInset + Spacing.five,
  },
  feedWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#4F46E5',
  },
  refreshButton: {
    padding: Spacing.one,
  },
  storiesContainer: {
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  storyCard: {
    alignItems: 'center',
    width: 68,
    gap: Spacing.one,
  },
  storyPicContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  storyPicBorder: {
    borderWidth: 2,
    borderColor: '#E1306C',
    padding: 2,
  },
  storyPic: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  storyPicFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyUser: {
    fontSize: 10,
    textAlign: 'center',
  },
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.four,
    overflow: 'hidden',
    paddingBottom: Spacing.three,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  postMedia: {
    width: '100%',
    aspectRatio: 1,
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.four,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  captionContainer: {
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  postTime: {
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.one,
    fontSize: 10,
  },
  emptyFeed: {
    alignItems: 'center',
    marginTop: Spacing.six,
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  modalOverlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    height: '70%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.four,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  commentsList: {
    flex: 1,
    marginTop: Spacing.two,
  },
  commentRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  commentInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  commentSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
