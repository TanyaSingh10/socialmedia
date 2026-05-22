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
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from '@/components/symbol-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, MaxContentWidth, BottomTabInset } from '@/constants/theme';
import { useAuth, API_URL } from '@/context/AuthContext';

const { width } = Dimensions.get('window');

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  bio: string;
  profilePic: string;
  followers: string[];
  following: string[];
}

interface Post {
  _id: string;
  mediaUrl: string;
  mediaType: string;
  caption: string;
  likes: string[];
  createdAt: string;
}

export default function ExploreScreen() {
  const { token, user: currentUser, refreshUser } = useAuth();
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const safeAreaInsets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Explore grid items
  const [explorePosts, setExplorePosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Active User Profile overlay state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedUserPosts, setSelectedUserPosts] = useState<Post[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [followingState, setFollowingState] = useState<string[]>(currentUser?.following || []);

  const fetchExplorePosts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/posts/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Just keep posts that have media files for grid rendering
        const mediaPosts = data.filter((post: any) => post.mediaUrl);
        setExplorePosts(mediaPosts);
      }
    } catch (error) {
      console.warn('Failed to load explore items:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchExplorePosts();
  }, [token]);

  // Handle live search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`${API_URL}/api/users/search?q=${searchQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.warn('Search query error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, token]);

  const viewUserProfile = async (username: string) => {
    setLoadingProfile(true);
    try {
      const response = await fetch(`${API_URL}/api/users/profile/${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data.user);
        setSelectedUserPosts(data.posts);
        setFollowingState(currentUser?.following || []);
      }
    } catch (err) {
      console.warn('Profile fetch error:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!selectedUser) return;
    const userId = selectedUser._id;
    const isFollowing = followingState.includes(userId);

    // Optimistic toggle
    setFollowingState((prev) =>
      isFollowing ? prev.filter((id) => id !== userId) : [...prev, userId]
    );

    if (selectedUser) {
      setSelectedUser({
        ...selectedUser,
        followers: isFollowing
          ? selectedUser.followers.filter((id) => id !== (currentUser?._id || ''))
          : [...selectedUser.followers, currentUser?._id || ''],
      });
    }

    try {
      const response = await fetch(`${API_URL}/api/users/follow/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        await refreshUser();
      } else {
        // Revert on error
        viewUserProfile(selectedUser.username);
      }
    } catch (err) {
      console.warn('Follow error:', err);
      viewUserProfile(selectedUser.username);
    }
  };

  const insetsStyle = {
    paddingTop: Platform.OS === 'web' ? 90 : safeAreaInsets.top,
  };

  const columns = Platform.OS === 'web' ? 4 : 3;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, insetsStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.exploreWrapper}>
          {/* Header Search Field */}
          <View style={styles.searchBarContainer}>
            <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement }]}>
              <SymbolView tintColor={theme.textSecondary} name="magnifyingglass" size={16} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search people by username..."
                placeholderTextColor={scheme === 'dark' ? '#60646C' : '#90949C'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <SymbolView tintColor={theme.textSecondary} name="xmark.circle.fill" size={16} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Live Search List overlay */}
          {searching ? (
            <ActivityIndicator style={{ paddingVertical: Spacing.four }} size="small" color="#4F46E5" />
          ) : searchResults.length > 0 ? (
            <View style={[styles.searchResultsList, { backgroundColor: theme.background, borderColor: theme.backgroundElement }]}>
              {searchResults.map((user) => (
                <TouchableOpacity
                  key={user._id}
                  onPress={() => {
                    setSearchQuery('');
                    viewUserProfile(user.username);
                  }}
                  style={styles.searchResultRow}
                >
                  <Image
                    source={user.profilePic ? { uri: user.profilePic } : 'https://picsum.photos/id/1025/100/100'}
                    style={styles.searchAvatar}
                  />
                  <View>
                    <ThemedText type="smallBold">{user.username}</ThemedText>
                    {user.bio ? (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {user.bio}
                      </ThemedText>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : searchQuery.trim() ? (
            <View style={styles.noSearchPlaceholder}>
              <ThemedText type="small" themeColor="textSecondary">
                No users found for "{searchQuery}"
              </ThemedText>
            </View>
          ) : null}

          {/* Public posts Grid */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Explore Trending
          </ThemedText>

          {loadingPosts ? (
            <ActivityIndicator style={{ marginTop: Spacing.four }} size="large" color="#4F46E5" />
          ) : explorePosts.length === 0 ? (
            <View style={styles.emptyExplore}>
              <SymbolView tintColor={theme.textSecondary} name="sparkles" size={36} />
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
                Nothing trending currently.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {explorePosts.map((post) => (
                <TouchableOpacity
                  key={post._id}
                  activeOpacity={0.9}
                  onPress={() => viewUserProfile(post.user.username)}
                  style={[styles.gridItem, { width: `${100 / columns - 1.5}%` }]}
                >
                  <Image source={{ uri: post.mediaUrl }} style={styles.gridImage} contentFit="cover" />
                  <View style={styles.gridHover}>
                    <SymbolView tintColor="#ffffff" name="heart.fill" size={14} />
                    <ThemedText style={styles.gridHoverText}>{post.likes.length}</ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Pop-up Profile Details Sheet overlay */}
      {selectedUser ? (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.backgroundElement }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">User Profile</ThemedText>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <SymbolView tintColor={theme.text} name="xmark" size={20} />
              </TouchableOpacity>
            </View>

            {loadingProfile ? (
              <ActivityIndicator style={{ flex: 1 }} size="small" color="#4F46E5" />
            ) : (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* Header Metrics */}
                <View style={styles.profileHeader}>
                  <Image
                    source={selectedUser.profilePic ? { uri: selectedUser.profilePic } : 'https://picsum.photos/id/1025/100/100'}
                    style={styles.profileAvatar}
                  />
                  <View style={styles.profileMeta}>
                    <ThemedText type="subtitle">{selectedUser.username}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {selectedUser.bio || 'No bio yet.'}
                    </ThemedText>

                    {/* Stats Rows */}
                    <View style={styles.statsContainer}>
                      <View style={styles.statBox}>
                        <ThemedText type="smallBold">{selectedUserPosts.length}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">Posts</ThemedText>
                      </View>
                      <View style={styles.statBox}>
                        <ThemedText type="smallBold">{selectedUser.followers?.length || 0}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">Followers</ThemedText>
                      </View>
                      <View style={styles.statBox}>
                        <ThemedText type="smallBold">{selectedUser.following?.length || 0}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">Following</ThemedText>
                      </View>
                    </View>

                    {/* Follow Toggle */}
                    {selectedUser._id !== currentUser?._id && (
                      <TouchableOpacity
                        onPress={handleFollowToggle}
                        style={[
                          styles.followBtn,
                          { backgroundColor: followingState.includes(selectedUser._id) ? theme.backgroundElement : '#4F46E5' }
                        ]}
                      >
                        <ThemedText style={{ color: followingState.includes(selectedUser._id) ? theme.text : '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                          {followingState.includes(selectedUser._id) ? 'Following' : 'Follow'}
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* User's Own Grid */}
                <ThemedText type="smallBold" style={{ marginVertical: Spacing.three }}>
                  Posts by {selectedUser.username}
                </ThemedText>

                {selectedUserPosts.length === 0 ? (
                  <View style={styles.emptyExplore}>
                    <ThemedText type="small" themeColor="textSecondary">No posts uploaded yet.</ThemedText>
                  </View>
                ) : (
                  <View style={styles.gridContainer}>
                    {selectedUserPosts.map((post) => (
                      <View key={post._id} style={[styles.gridItem, { width: '31%' }]}>
                        <Image source={{ uri: post.mediaUrl }} style={styles.gridImage} contentFit="cover" />
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
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
  exploreWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
  },
  searchBarContainer: {
    paddingVertical: Spacing.three,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  searchResultsList: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.two,
    gap: Spacing.one,
    marginTop: -Spacing.one,
    marginBottom: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: 10,
    gap: Spacing.two,
  },
  searchAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  noSearchPlaceholder: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  gridItem: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridHover: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    gap: Spacing.half,
  },
  gridHoverText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyExplore: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
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
    maxWidth: 550,
    height: '80%',
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
  profileHeader: {
    flexDirection: 'row',
    paddingVertical: Spacing.three,
    gap: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.08)',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileMeta: {
    flex: 1,
    gap: Spacing.one,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  statBox: {
    alignItems: 'center',
  },
  followBtn: {
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
    width: 120,
  },
});
