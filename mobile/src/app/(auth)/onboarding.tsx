import React, { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Dimensions, Image, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    title: 'Real-Time Clarity',
    subtitle: 'Instant messaging designed for enterprise speed. Cut through the noise and stay connected.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
    bubbles: [
      { text: 'Project update looks great.', isRight: true },
      { text: 'Deploying to staging now.', isRight: false },
    ]
  },
  {
    id: 2,
    title: 'Unified Workspace',
    subtitle: 'All your tools, tasks, and teams in one secure place. Streamline your daily operations.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    bubbles: [
      { text: 'Q3 Report uploaded.', isRight: true },
      { text: 'Reviewing it right now.', isRight: false },
    ]
  },
  {
    id: 3,
    title: 'Advanced Security',
    subtitle: 'Bank-grade encryption and compliance tools built-in. Your data is always protected.',
    image: 'https://images.unsplash.com/photo-1633630654593-b223d51433b5?q=80&w=800&auto=format&fit=crop',
    bubbles: [
      { text: 'Access granted.', isRight: false },
      { text: 'Secure session started.', isRight: true },
    ]
  }
];

export default function OnboardingScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollRef.current?.scrollTo({ x: nextIndex * width, y: 0, animated: true });
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.skipButton} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.mainContent}>
              <View style={styles.cardContainer}>
                
                <Image 
                  source={{ uri: slide.image }} 
                  style={styles.image} 
                  resizeMode="cover"
                />
                
                <LinearGradient
                  colors={['transparent', colors.surfaceContainer]}
                  style={StyleSheet.absoluteFill}
                />
                
                {/* Message Bubbles Overlay */}
                <View style={styles.bubblesOverlay}>
                  {slide.bubbles.map((bubble, idx) => (
                    <View key={idx} style={bubble.isRight ? styles.bubbleRight : styles.bubbleLeft}>
                      <Text style={bubble.isRight ? styles.bubbleTextRight : styles.bubbleTextLeft}>
                        {bubble.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomControls}>
        <LinearGradient
          colors={['transparent', colors.background, colors.background]}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={styles.progressIndicators}>
          {SLIDES.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.dot, 
                currentIndex === index && styles.dotActive
              ]} 
            />
          ))}
        </View>

        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color="#003548" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'flex-end',
    zIndex: 50,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },
  skipText: {
    ...Typography.labelMd,
    color: colors.textDim,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: width,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  mainContent: {
    width: '100%',
    maxWidth: 448,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 96,
  },
  cardContainer: {
    width: '100%',
    height: 256,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  bubblesOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    gap: 12,
  },
  bubbleRight: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomRightRadius: 0,
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  bubbleTextRight: {
    ...Typography.bodyMd,
    color: '#00394d', // on-primary-container
  },
  bubbleLeft: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomLeftRadius: 0,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  bubbleTextLeft: {
    ...Typography.bodyMd,
    color: colors.text, // on-surface
  },
  title: {
    ...Typography.displayMd,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.bodyLg,
    color: colors.textDim,
    textAlign: 'center',
    maxWidth: 320,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 32,
    zIndex: 50,
  },
  progressIndicators: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHigh, // surface-container-highest
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary, // primary
  },
  nextButton: {
    width: '100%',
    maxWidth: 448,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    zIndex: 10,
  },
  nextButtonText: {
    ...Typography.titleLg,
    color: colors.onPrimary, // on-primary
  },
});
