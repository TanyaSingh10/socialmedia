import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const { login, register } = useAuth();
  const scheme = useColorScheme();
  const themeColors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    
    if (!email || !password || (!isLogin && !username)) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await register(username, email, password);
      }

      if (!result.success) {
        setError(result.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = scheme === 'dark';

  return (
    <ThemedView style={styles.outerContainer}>
      {/* Background neon glows */}
      <View style={[styles.glowBall1, { backgroundColor: isDark ? '#4F46E5' : '#818CF8' }]} />
      <View style={[styles.glowBall2, { backgroundColor: isDark ? '#7C3AED' : '#C084FC' }]} />

      <View style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? 'rgba(30, 30, 40, 0.65)' : 'rgba(255, 255, 255, 0.8)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        }
      ]}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={[styles.logoIcon, { backgroundColor: '#4F46E5' }]}>
            <ThemedText style={styles.logoText}>Ω</ThemedText>
          </View>
          <ThemedText type="title" style={styles.brandTitle}>
            Aether
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.brandSubtitle}>
            Connect beautifully with the world
          </ThemedText>
        </View>

        {/* Error Notification */}
        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: isDark ? '#451A1A' : '#FEE2E2' }]}>
            <ThemedText style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#EF4444' }]}>
              {error}
            </ThemedText>
          </View>
        )}

        {/* Inputs */}
        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputGroup}>
              <ThemedText type="smallBold" style={styles.label}>
                Username
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: themeColors.text,
                    backgroundColor: isDark ? '#1C1C24' : '#F0F0F3',
                    borderColor: isDark ? '#2E2E3C' : '#E0E1E6',
                  }
                ]}
                placeholder="Pick a unique username"
                placeholderTextColor={isDark ? '#60646C' : '#90949C'}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <ThemedText type="smallBold" style={styles.label}>
              Email Address
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: themeColors.text,
                  backgroundColor: isDark ? '#1C1C24' : '#F0F0F3',
                  borderColor: isDark ? '#2E2E3C' : '#E0E1E6',
                }
              ]}
              placeholder={isLogin ? "Username or email" : "yourname@domain.com"}
              placeholderTextColor={isDark ? '#60646C' : '#90949C'}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="smallBold" style={styles.label}>
              Password
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: themeColors.text,
                  backgroundColor: isDark ? '#1C1C24' : '#F0F0F3',
                  borderColor: isDark ? '#2E2E3C' : '#E0E1E6',
                }
              ]}
              placeholder="••••••••"
              placeholderTextColor={isDark ? '#60646C' : '#90949C'}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
          </View>

          {/* Submit button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.button, { backgroundColor: '#4F46E5' }]}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <ThemedText style={styles.buttonText}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle link */}
        <TouchableOpacity
          onPress={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          style={styles.toggleContainer}
        >
          <ThemedText type="small" themeColor="textSecondary">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <ThemedText type="smallBold" style={{ color: '#6366F1' }}>
              {isLogin ? 'Sign Up' : 'Log In'}
            </ThemedText>
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    position: 'relative',
    overflow: 'hidden',
  },
  glowBall1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    top: '15%',
    left: '10%',
    opacity: 0.15,
    filter: 'blur(40px)',
  },
  glowBall2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    bottom: '10%',
    right: '5%',
    opacity: 0.12,
    filter: 'blur(60px)',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.four,
    gap: Spacing.one,
  },
  logoIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: Spacing.one,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  form: {
    gap: Spacing.three,
  },
  inputGroup: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  button: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleContainer: {
    alignItems: 'center',
    marginTop: Spacing.four,
    paddingVertical: Spacing.two,
  },
  errorBox: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    marginBottom: Spacing.three,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});
