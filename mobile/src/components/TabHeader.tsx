import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface TabHeaderProps {
  title?: string;
  showLogo?: boolean;
}

export function TabHeader({ title = 'eTeams', showLogo = true }: TabHeaderProps) {
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

  return (
    <View style={[styles.header, { paddingTop: 12 + (insets?.top || 0), borderBottomColor: colors.border || colors.pillBg }]}>
      <View style={styles.headerLeft}>
        {showLogo && (
          <Animated.View style={[styles.logoContainer, { backgroundColor: colors.primary, transform: [{ scale: logoScale }] }]}>
            <MaterialIcons name="business" size={16} color={colors.background} />
          </Animated.View>
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {title === 'eTeams' ? (
            <>
              <Text style={{ color: colors.primary }}>e</Text>
              <Text style={{ color: colors.text }}>Teams</Text>
            </>
          ) : (
            title
          )}
        </Text>
      </View>
      
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconButton} onPress={() => {/* TODO: Implement Search */}}>
          <MaterialIcons name="search" size={24} color={colors.iconDefault} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/profile')}>
          <Image 
            source={{ uri: user?.avatar || 'https://ui-avatars.com/api/?name=' + (user?.username || 'U') }} 
            style={[styles.avatar, { backgroundColor: colors.surfaceContainer }]} 
          />
          <View style={styles.onlineDot} />
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
    borderColor: '#0f172a',
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
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
});
