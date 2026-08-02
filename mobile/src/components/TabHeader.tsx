import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

interface TabHeaderProps {
  title?: string;
  showLogo?: boolean;
}

export function TabHeader({ title = 'Eteams', showLogo = true }: TabHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  const logoScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (showLogo) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.08,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showLogo]);

  const { i18n } = useTranslation();

  return (
    <View style={[styles.header, { paddingTop: 12 + (insets?.top || 0), borderBottomColor: colors.border || colors.pillBg, flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
      <View style={[styles.headerLeft, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
        {showLogo && (
          <Animated.View style={[styles.logoContainer, { backgroundColor: colors.primary, transform: [{ scale: logoScale }] }]}>
            <MaterialIcons name="business" size={16} color={colors.background} />
          </Animated.View>
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {title === 'Eteams' ? (
            <>
              <Text style={{ color: colors.primary }}>E</Text>
              <Text style={{ color: colors.text }}>teams</Text>
            </>
          ) : (
            title
          )}
        </Text>
      </View>
      
      <View style={[styles.headerRight, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/search')}>
          <MaterialIcons name="search" size={24} color={colors.iconDefault} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/profile')}>
          <Image 
            source={{ uri: user?.avatar || 'https://ui-avatars.com/api/?name=' + (user?.username || 'U') }} 
            style={[styles.avatar, { backgroundColor: colors.surfaceContainer }]} 
          />
          <View style={[styles.onlineDot, { 
            backgroundColor: user?.presence === 'dnd' ? '#F43F5E' : user?.presence === 'away' ? '#F59E0B' : user?.presence === 'meeting' ? '#8B5CF6' : user?.presence === 'offline' ? '#64748B' : '#10B981',
            borderColor: colors.background
          }]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginLeft: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});
