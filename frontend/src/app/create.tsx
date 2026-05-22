import React, { useState, useRef } from 'react';
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

export default function CreatePostScreen() {
  const { token } = useAuth();
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const safeAreaInsets = useSafeAreaInsets();

  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null); // holds file object for Web or uri for Native
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ error: false, text: '' });

  // Web input reference
  const fileInputRef = useRef<any>(null);

  const triggerFileSelect = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      // Mock / Native fallback file pick: for testing, let's select a beautiful random photo!
      const randomPhotos = [
        'https://picsum.photos/id/1015/800/800',
        'https://picsum.photos/id/1016/800/800',
        'https://picsum.photos/id/1019/800/800',
        'https://picsum.photos/id/1021/800/800',
        'https://picsum.photos/id/1025/800/800'
      ];
      const randomUri = randomPhotos[Math.floor(Math.random() * randomPhotos.length)];
      setPreviewUri(randomUri);
      setSelectedFile({
        uri: randomUri,
        name: 'native_mock_image.jpg',
        type: 'image/jpeg'
      });
    }
  };

  const handleWebFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUri(objectUrl);
    }
  };

  const handlePublish = async () => {
    setStatusMsg({ error: false, text: '' });

    if (!previewUri) {
      setStatusMsg({ error: true, text: 'Please select a photo or video to upload' });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('caption', caption);

      if (Platform.OS === 'web' && selectedFile) {
        formData.append('media', selectedFile);
      } else if (selectedFile) {
        // Native upload maps uri
        // In real expo, it requires mapping fetch details.
        // We'll append the mock image url. To keep it completely functional, if it's mock, we can pass the url as body or a placeholder.
        // Let's create a custom field if it's pure uri mock.
        // The backend expects upload in `media` multipart, so we construct standard structure:
        formData.append('media', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.type,
        } as any);
      }

      const response = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Note: fetch multipart does not require manual 'Content-Type' header as it appends boundary automatically!
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatusMsg({ error: false, text: 'Post published successfully!' });
        setCaption('');
        setSelectedFile(null);
        setPreviewUri(null);
      } else {
        setStatusMsg({ error: true, text: data.message || 'Failed to upload post' });
      }
    } catch (err) {
      console.error('Publish error:', err);
      setStatusMsg({ error: true, text: 'Network connection error' });
    } finally {
      setLoading(false);
    }
  };

  const insetsStyle = {
    paddingTop: Platform.OS === 'web' ? 90 : safeAreaInsets.top,
  };

  const isDark = scheme === 'dark';

  return (
    <ThemedView style={styles.container}>
      {Platform.OS === 'web' && (
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,video/*"
          onChange={handleWebFileChange}
        />
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, insetsStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.createWrapper}>
          <ThemedText type="subtitle" style={styles.title}>
            Create New Post
          </ThemedText>

          {/* Status Message */}
          {!!statusMsg.text && (
            <View
              style={[
                styles.statusBox,
                { backgroundColor: statusMsg.error ? (isDark ? '#451A1A' : '#FEE2E2') : (isDark ? '#1A4314' : '#E8F5E9') },
              ]}
            >
              <ThemedText
                style={{
                  color: statusMsg.error ? (isDark ? '#FCA5A5' : '#EF4444') : (isDark ? '#A5F3FC' : '#2E7D32'),
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                {statusMsg.text}
              </ThemedText>
            </View>
          )}

          {/* Media Preview Box */}
          <TouchableOpacity
            onPress={triggerFileSelect}
            activeOpacity={0.9}
            style={[
              styles.previewContainer,
              {
                backgroundColor: isDark ? 'rgba(33, 34, 37, 0.4)' : '#F0F0F3',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.previewImage} contentFit="contain" />
            ) : (
              <View style={styles.placeholderContainer}>
                <View style={[styles.uploadIconCircle, { backgroundColor: '#4F46E5' }]}>
                  <SymbolView tintColor="#ffffff" name="camera.fill" size={24} />
                </View>
                <ThemedText type="smallBold" style={{ marginTop: Spacing.two }}>
                  Select Photo or Video
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11, textAlign: 'center' }}>
                  {Platform.OS === 'web' ? 'Supports JPG, PNG, MP4 up to 50MB' : 'Select a trending placeholder image'}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>

          {/* Caption Input */}
          <View style={styles.inputGroup}>
            <ThemedText type="smallBold" style={styles.label}>
              Caption
            </ThemedText>
            <TextInput
              style={[
                styles.captionInput,
                {
                  color: theme.text,
                  backgroundColor: isDark ? '#1C1C24' : '#F0F0F3',
                  borderColor: isDark ? '#2E2E3C' : '#E0E1E6',
                },
              ]}
              placeholder="What's on your mind? Add tags, descriptions..."
              placeholderTextColor={isDark ? '#60646C' : '#90949C'}
              multiline
              numberOfLines={4}
              value={caption}
              onChangeText={setCaption}
            />
          </View>

          {/* Action button */}
          <TouchableOpacity
            onPress={handlePublish}
            disabled={loading}
            activeOpacity={0.8}
            style={[styles.publishBtn, { backgroundColor: '#4F46E5' }]}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <ThemedText style={styles.publishBtnText}>Publish Post</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  createWrapper: {
    width: '100%',
    maxWidth: 550,
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: Spacing.two,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.four,
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  captionInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three,
    fontSize: 15,
    height: 100,
    textAlignVertical: 'top',
  },
  publishBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  publishBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusBox: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
});
