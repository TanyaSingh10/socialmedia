import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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
  mediaUrl: string;
  caption: string;
  likes: string[];
}

export default function ProfileScreen() {
  const { token, user, logout, updateProfileState } = useAuth();
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const safeAreaInsets = useSafeAreaInsets();

  const [ownPosts, setOwnPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Edit profile states
  const [showEditModal, setShowEditModal] = useState(false);
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<any>(null);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const fileInputRef = useRef<any>(null);

  const fetchProfileDetails = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/api/users/profile/${user.username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOwnPosts(data.posts || []);
      }
    } catch (err) {
      console.warn('Failed to load profile posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [user, token]);

  const selectAvatarImage = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      // Mock / Native fallback file pick: for testing, let's select a beautiful random photo!
      const randomPhotos = [
        'https://picsum.photos/id/1025/200/200',
        'https://picsum.photos/id/1027/200/200',
        'https://picsum.photos/id/1062/200/200'
      ];
      const randomUri = randomPhotos[Math.floor(Math.random() * randomPhotos.length)];
      setAvatarPreviewUri(randomUri);
      setSelectedAvatarFile({
        uri: randomUri,
        name: 'native_mock_avatar.jpg',
        type: 'image/jpeg'
      });
    }
  };

  const handleWebFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedAvatarFile(file);
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreviewUri(objectUrl);
    }
  };

  const saveProfileEdits = async () => {
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append('bio', bioInput);

      if (Platform.OS === 'web' && selectedAvatarFile) {
        formData.append('profilePic', selectedAvatarFile);
      } else if (selectedAvatarFile) {
        formData.append('profilePic', {
          uri: selectedAvatarFile.uri,
          name: selectedAvatarFile.name,
          type: selectedAvatarFile.type,
        } as any);
      }

      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const updatedUser = await response.json();
        updateProfileState(updatedUser);
        setShowEditModal(false);
        setSelectedAvatarFile(null);
        setAvatarPreviewUri(null);
      }
    } catch (err) {
      console.warn('Profile edit error:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const insetsStyle = {
    paddingTop: Platform.OS === 'web' ? 90 : safeAreaInsets.top,
  };

  const columns = Platform.OS === 'web' ? 4 : 3;
  const isDark = scheme === 'dark';

  return (
    <ThemedView style={styles.container}>
      {Platform.OS === 'web' && (
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleWebFileChange}
        />
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, insetsStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileWrapper}>
          
          {/* Header Stats */}
          <View style={styles.profileHeader}>
            <Image
              source={user?.profilePic ? { uri: user.profilePic } : 'https://picsum.photos/id/1025/100/100'}
              style={styles.profileAvatar}
            />
            
            <View style={styles.profileMeta}>
              <View style={styles.usernameRow}>
                <ThemedText type="subtitle">{user?.username}</ThemedText>
                
                <View style={styles.headerBtnGroup}>
                  <TouchableOpacity
                    onPress={() => {
                      setBioInput(user?.bio || '');
                      setShowEditModal(true);
                    }}
                    style={[styles.editBtn, { backgroundColor: theme.backgroundElement }]}
                  >
                    <ThemedText type="smallBold" style={{ fontSize: 12 }}>Edit Profile</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={logout} style={[styles.logoutBtn, { backgroundColor: '#EF4444' }]}>
                    <SymbolView tintColor="#ffffff" name="rectangle.portrait.and.arrow.right" size={14} />
                  </TouchableOpacity>
                </View>
              </View>

              <ThemedText type="small" themeColor="textSecondary" style={styles.bioText}>
                {user?.bio || 'Write a beautiful bio description.'}
              </ThemedText>

              {/* Counts */}
              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <ThemedText type="smallBold">{ownPosts.length}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">Posts</ThemedText>
                </View>
                <View style={styles.statBox}>
                  <ThemedText type="smallBold">{user?.followers?.length || 0}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">Followers</ThemedText>
                </View>
                <View style={styles.statBox}>
                  <ThemedText type="smallBold">{user?.following?.length || 0}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">Following</ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* User Posts Grid */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            My Uploads
          </ThemedText>

          {loadingPosts ? (
            <ActivityIndicator style={{ marginTop: Spacing.four }} size="large" color="#4F46E5" />
          ) : ownPosts.length === 0 ? (
            <View style={styles.emptyFeed}>
              <SymbolView tintColor={theme.textSecondary} name="photo.on.rectangle.angled" size={36} />
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
                You haven't uploaded any content yet!
              </ThemedText>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {ownPosts.map((post) => (
                <View key={post._id} style={[styles.gridItem, { width: `${100 / columns - 1.5}%` }]}>
                  <Image source={{ uri: post.mediaUrl }} style={styles.gridImage} contentFit="cover" />
                </View>
              ))}
            </View>
          )}

        </View>
      </ScrollView>

      {/* Edit Bio and Avatar Modal overlay */}
      {showEditModal ? (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.backgroundElement }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Edit Profile</ThemedText>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <SymbolView tintColor={theme.text} name="xmark" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, marginTop: Spacing.two }} showsVerticalScrollIndicator={false}>
              {/* Picture Change section */}
              <View style={styles.editAvatarSection}>
                <TouchableOpacity onPress={selectAvatarImage} activeOpacity={0.8} style={styles.avatarPickerWrapper}>
                  <Image
                    source={
                      avatarPreviewUri
                        ? { uri: avatarPreviewUri }
                        : user?.profilePic
                        ? { uri: user.profilePic }
                        : 'https://picsum.photos/id/1025/100/100'
                    }
                    style={styles.editAvatar}
                  />
                  <View style={styles.avatarCameraBadge}>
                    <SymbolView tintColor="#ffffff" name="camera.fill" size={10} />
                  </View>
                </TouchableOpacity>
                <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.one }}>
                  Tap profile image to change
                </ThemedText>
              </View>

              {/* Bio description text area */}
              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  Bio Description
                </ThemedText>
                <TextInput
                  style={[
                    styles.bioInput,
                    {
                      color: theme.text,
                      backgroundColor: isDark ? '#1C1C24' : '#F0F0F3',
                      borderColor: isDark ? '#2E2E3C' : '#E0E1E6',
                    },
                  ]}
                  placeholder="Tell your followers about yourself..."
                  placeholderTextColor={isDark ? '#60646C' : '#90949C'}
                  multiline
                  numberOfLines={3}
                  value={bioInput}
                  onChangeText={setBioInput}
                />
              </View>

              {/* Action Submit */}
              <TouchableOpacity
                onPress={saveProfileEdits}
                disabled={savingProfile}
                activeOpacity={0.8}
                style={[styles.saveBtn, { backgroundColor: '#4F46E5' }]}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <ThemedText style={{ color: '#ffffff', fontWeight: 'bold' }}>Save Changes</ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  profileWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.five,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  profileAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  profileMeta: {
    flex: 1,
    gap: Spacing.one,
  },
  usernameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  headerBtnGroup: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  editBtn: {
    paddingHorizontal: Spacing.three,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioText: {
    fontSize: 13,
    marginTop: Spacing.one,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.five,
    marginTop: Spacing.two,
  },
  statBox: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    marginTop: Spacing.four,
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
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  emptyFeed: {
    alignItems: 'center',
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
    maxWidth: 450,
    height: '60%',
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
  editAvatarSection: {
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  avatarPickerWrapper: {
    position: 'relative',
  },
  editAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4F46E5',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  inputGroup: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bioInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    fontSize: 14,
    height: 72,
    textAlignVertical: 'top',
  },
  saveBtn: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.four,
  },
});
