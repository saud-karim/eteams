import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { API_BASE_URL } from '../api/client';
import { MaterialIcons } from '@expo/vector-icons';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const AVATAR_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#D946EF', // Fuchsia
  '#F43F5E', // Rose
];

const getDeterministicColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export function UserAvatar({ name, avatarUrl, size = 40, style, textStyle }: UserAvatarProps) {
  const isWebUrl = avatarUrl?.startsWith('http');
  const finalAvatarUrl = avatarUrl 
    ? (isWebUrl ? avatarUrl : `${API_BASE_URL}${avatarUrl}`)
    : null;

  // If it's a ui-avatars URL from some legacy code, we ignore it and use our local generator to ensure it looks good offline/fast
  const isUiAvatar = finalAvatarUrl?.includes('ui-avatars.com');

  if (finalAvatarUrl && !isUiAvatar) {
    return (
      <Image 
        source={{ uri: finalAvatarUrl }} 
        style={[{ width: size, height: size, borderRadius: 12 }, style]} 
      />
    );
  }

  const backgroundColor = getDeterministicColor(name || '?');
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <View style={[{ 
      width: size, 
      height: size, 
      borderRadius: 12, 
      backgroundColor,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
      <Text style={[{ 
        color: '#FFFFFF', 
        fontWeight: 'bold', 
        fontSize: size * 0.45 
      }, textStyle]}>
        {initial}
      </Text>
    </View>
  );
}
