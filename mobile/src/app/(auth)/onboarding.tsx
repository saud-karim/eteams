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
    title: 'Fast & Familiar',
    subtitle: 'Chat with your team as easily as you do on personal apps, but built specifically for professional company use.',
    image: require('../../../assets/images/onboarding_chat.png'),
    bubbles: [
      { text: 'Can we discuss the new project?', isRight: true },
      { text: 'Yes, I created a channel for it.', isRight: false },
    ]
  },
  {
    id: 2,
    title: 'Officially Documented',
    subtitle: 'Never lose a decision or a file again. Every conversation is officially recorded, securely stored, and easily searchable.',
    image: require('../../../assets/images/onboarding_workspace.png'),
    bubbles: [
      { text: 'Where is the contract from last month?', isRight: true },
      { text: 'Just search for it in the files tab!', isRight: false },
    ]
  },
  {
    id: 3,
    title: 'Organized Workspace',
    subtitle: 'Keep communication professional. Separate work from personal life, manage team permissions, and keep everything centralized.',
    image: require('../../../assets/images/onboarding_security.png'),
    bubbles: [
      { text: 'I added the new designer.', isRight: false },
      { text: 'Great, they have access to design channels.', isRight: true },
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
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, y: 0, animated: true });
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.mainContent}>
              <View style={styles.cardContainer}>
                
                <Image 
                  source={typeof slide.image === 'string' ? { uri: slide.image } : slide.image} 
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
