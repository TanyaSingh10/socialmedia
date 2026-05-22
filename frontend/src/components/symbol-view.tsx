import React from 'react';
import { Platform, View, Text } from 'react-native';

// Dynamically try to import native SymbolView for iOS
let ExpoSymbolView: any = null;
if (Platform.OS === 'ios') {
  try {
    ExpoSymbolView = require('expo-symbols').SymbolView;
  } catch (e) {
    // Fallback if expo-symbols is not installed
  }
}

interface SymbolViewProps {
  name: string | { ios?: string; android?: string; web?: string };
  tintColor?: string;
  size?: number;
  style?: any;
  weight?: any;
}

// Unicode and Emoji text fallbacks for mobile fallback when SVG isn't parsed natively
const fallbackCharacters: Record<string, string> = {
  'plus': '+',
  'xmark': '✕',
  'xmark.circle.fill': '✕',
  'arrow.clockwise': '↻',
  'bubble.right': '💬',
  'bubble.left.and.bubble.right': '💬',
  'bubble.left.and.bubble.right.fill': '💬',
  'paperplane.fill': '✉️',
  'chevron.left': '⟨',
  'chevron.right': '⟩',
  'chevron_right': '⟩',
  'chevron.down': '⋁',
  'heart': '♡',
  'heart.fill': '❤️',
  'magnifyingglass': '🔍',
  'camera.fill': '📷',
  'rectangle.portrait.and.arrow.right': '🚪',
  'photo.on.rectangle.angled': '🖼️',
  'sparkles': '✨',
  'checkmark': '✓',
  'checkmark.seal.fill': '☑️',
};

// Web SVG Icons mapping
const WebSvgIcons: Record<string, (color: string) => React.ReactNode> = {
  'plus': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  'xmark': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  'xmark.circle.fill': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  'arrow.clockwise': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
    </svg>
  ),
  'bubble.right': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  'bubble.left.and.bubble.right': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  'bubble.left.and.bubble.right.fill': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  'paperplane.fill': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  ),
  'chevron.left': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  ),
  'chevron.right': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  ),
  'chevron_right': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  ),
  'chevron.down': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  ),
  'heart': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  ),
  'heart.fill': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  ),
  'magnifyingglass': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  'camera.fill': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
  ),
  'rectangle.portrait.and.arrow.right': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"></path>
    </svg>
  ),
  'photo.on.rectangle.angled': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  ),
  'sparkles': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"></path>
    </svg>
  ),
  'checkmark': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  'checkmark.seal.fill': (color) => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="16 12 12 8 8 12"></polyline>
    </svg>
  ),
};

export const SymbolView: React.FC<SymbolViewProps> = ({
  name: nameProp,
  tintColor = '#000000',
  size = 24,
  style,
  weight,
}) => {
  // Resolve name if passed as platform object
  let name = '';
  if (typeof nameProp === 'string') {
    name = nameProp;
  } else if (nameProp && typeof nameProp === 'object') {
    name = (Platform.select(nameProp) || nameProp.web || nameProp.ios || '') as string;
  }

  // 1. If iOS, attempt to render the native SF Symbols view
  if (Platform.OS === 'ios' && ExpoSymbolView) {
    return <ExpoSymbolView name={name} tintColor={tintColor} size={size} style={style} weight={weight} />;
  }

  // 2. If Web, render high fidelity inline SVG vector icons
  if (Platform.OS === 'web') {
    const renderIcon = WebSvgIcons[name];
    if (renderIcon) {
      return (
        <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
          {renderIcon(tintColor)}
        </View>
      );
    }
  }

  // 3. Fallback: text representation/emoji for native non-iOS platforms or unmapped icons
  const textChar = fallbackCharacters[name] || '?';
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <Text style={{ color: tintColor, fontSize: size * 0.8, fontWeight: '600', textAlign: 'center' }}>
        {textChar}
      </Text>
    </View>
  );
};
