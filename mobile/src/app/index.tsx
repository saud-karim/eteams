import { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { theme, colors } = useTheme();
  const styles = createStyles(colors);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loadingAnim = useRef(new Animated.Value(-100)).current; // For sliding loading bar

  useEffect(() => {
    // Initial fade & slide in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for background blob
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Loading bar animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingAnim, {
          toValue: 200,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(loadingAnim, {
          toValue: -100,
          duration: 0,
          useNativeDriver: true,
        })
      ])
    ).start();

    if (loading) return;

    const timer = setTimeout(() => {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/onboarding');
      }
    }, 2000); // Reduced to 2 seconds for a better UX

    return () => clearTimeout(timer);
  }, [loading, user]);

  return (
    <View style={styles.container}>
      {/* Radial-like pulse background */}
      <Animated.View style={[
        styles.glowBlob, 
        { transform: [{ scale: pulseAnim }] }
      ]} />

      {/* Grid Overlay simulation (simplified) */}
      <View style={styles.gridOverlay} pointerEvents="none">
        {/* We can use an image pattern here if available, or just omit. 
            For now, the dark glow blob gives a very similar effect to the radial-gradient. */}
      </View>

      <Animated.View style={[
        styles.content,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        {/* Logo Area */}
        <View style={styles.logoContainer}>
          <MaterialIcons name="business" size={48} color={colors.primary} />
        </View>

        {/* Typography */}
        <Text style={styles.title}>EDARA IFM</Text>
        
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Eteams</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Intelligent Facility Management for the Modern Enterprise.
        </Text>

        {/* Loading Indicator */}
        <View style={styles.loaderSection}>
          <View style={styles.loaderTrack}>
            <Animated.View style={[
              styles.loaderFill,
              { transform: [{ translateX: loadingAnim }] }
            ]} />
          </View>
          <Text style={styles.loadingText}>Initializing secure workspace...</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  glowBlob: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: 9999,
    backgroundColor: 'rgba(59, 167, 214, 0.15)',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
    // Note: To perfectly replicate grid without SVGs, you'd tile an image. 
    // The glow blob is usually sufficient for the visual impact.
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    maxWidth: 448,
    width: '100%',
    zIndex: 10,
  },
  logoContainer: {
    width: 96,
    height: 96,
    marginBottom: 24,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
  },
  title: {
    ...Typography.displayLg,
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgeText: {
    ...Typography.labelMd,
    color: colors.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    ...Typography.bodyLg,
    color: colors.textDim,
    maxWidth: 280,
    textAlign: 'center',
    lineHeight: 24,
  },
  loaderSection: {
    marginTop: 48,
    alignItems: 'center',
  },
  loaderTrack: {
    width: 192,
    height: 4,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  loaderFill: {
    width: 60, // ~30% of 192
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 9999,
  },
  loadingText: {
    ...Typography.labelMd,
    color: colors.iconDefault,
    marginTop: 8,
  },
});
