import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from './UserAvatar';

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
        {title === 'Eteams' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {showLogo && (
              <Animated.View style={{ flexDirection: 'column', gap: 3, marginRight: 12, transform: [{ scale: logoScale }] }}>
                <View style={{ height: 4, width: 18, backgroundColor: '#3BA7D6', borderRadius: 2 }} />
                <View style={{ height: 4, width: 24, backgroundColor: '#22D3EE', borderRadius: 2 }} />
                <View style={{ height: 4, width: 14, backgroundColor: '#67E8F9', borderRadius: 2 }} />
              </Animated.View>
            )}
            <View style={{ 
              flexDirection: 'row', alignItems: 'baseline',
              backgroundColor: colors.surfaceContainerHigh, paddingVertical: 4, paddingHorizontal: 10, 
              borderRadius: 8, borderWidth: 1, borderColor: colors.border,
              elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
            }}>
              <Text style={{ color: '#3BA7D6', fontWeight: '900', fontSize: 22, lineHeight: 22 }}>E</Text>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, letterSpacing: 0.5, lineHeight: 22 }}>teams</Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        )}
      </View>
      
      <View style={[styles.headerRight, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/search')}>
          <MaterialIcons name="search" size={24} color={colors.iconDefault} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/profile')}>
          <UserAvatar 
            name={user?.name || user?.username || '?'} 
            avatarUrl={user?.avatar} 
            size={32} 
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
