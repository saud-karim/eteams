import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
  const { theme, colors, setThemeSetting } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);

  const handleRegister = () => {
    // Navigate to main app or verification
    console.log('Register logic here');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Blurs (Reversed from Login for variety) */}
      <View style={styles.blurTopRight} />
      <View style={styles.blurBottomLeft} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
              <MaterialIcons name="arrow-back" size={24} color={colors.textDim} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            
            <View style={styles.rightActions}>
              <TouchableOpacity style={styles.langButton}>
                <MaterialIcons name="language" size={18} color={colors.textDim} />
                <Text style={styles.langText}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.themeButton} onPress={() => setThemeSetting(theme === 'dark' ? 'light' : 'dark')}>
                <MaterialIcons name={theme === 'dark' ? 'light-mode' : 'dark-mode'} size={20} color={colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.glassPanel}>
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <MaterialIcons name="business" size={28} color="#fff" />
              </View>
              <Text style={styles.title}>eTeams</Text>
              <Text style={styles.subtitle}>Create your workspace account.</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="account-circle" size={20} color={colors.textDim} style={styles.inputIconLeft} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.border}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="email" size={20} color={colors.textDim} style={styles.inputIconLeft} />
                  <TextInput
                    style={styles.input}
                    placeholder="name@company.com"
                    placeholderTextColor={colors.border}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock" size={20} color={colors.textDim} style={styles.inputIconLeft} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={colors.border}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity style={styles.inputIconRight} onPress={() => setShowPassword(!showPassword)}>
                    <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={20} color={colors.textDim} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.rememberSection}>
                <TouchableOpacity 
                  style={styles.checkboxContainer} 
                  onPress={() => setAgree(!agree)}
                >
                  <View style={[styles.checkbox, agree && styles.checkboxActive]}>
                    {agree && <MaterialIcons name="check" size={12} color={colors.background} />}
                  </View>
                  <Text style={styles.rememberText}>I agree to the Terms & Conditions</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.loginButton} onPress={handleRegister}>
                <Text style={styles.loginButtonText}>Sign Up</Text>
                <MaterialIcons name="person-add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: typeof Colors.light, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  blurTopRight: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.2,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 9999,
    backgroundColor: 'rgba(118, 209, 255, 0.08)', // primary/8
  },
  blurBottomLeft: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.2,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 9999,
    backgroundColor: 'rgba(74, 225, 118, 0.04)', // secondary/4
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  topBar: {
    position: 'absolute',
    top: insets.top > 0 ? insets.top + 16 : 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    ...Typography.bodyMd,
    color: colors.textDim,
    marginLeft: 4,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langText: {
    ...Typography.labelMd,
    color: colors.textDim,
  },
  themeButton: {
    padding: 4,
  },
  glassPanel: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    width: '100%',
    maxWidth: 448, // max-w-md
    alignSelf: 'center',
    zIndex: 10,
    marginTop: 60,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary, // primary-container
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    ...Typography.displayMd,
    color: colors.text, // on-surface
  },
  subtitle: {
    ...Typography.bodyMd,
    color: colors.textDim, // on-surface-variant
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    ...Typography.labelMd,
    color: colors.textDim,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIconLeft: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  inputIconRight: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
    padding: 4,
  },
  input: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingLeft: 40,
    paddingRight: 40,
    color: colors.text, // on-surface
    ...Typography.bodyMd,
  },
  rememberSection: {
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerHigh, // surface-container-high
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary, // primary
    borderColor: colors.primary,
  },
  rememberText: {
    ...Typography.bodyMd,
    color: colors.textDim,
  },
  loginButton: {
    backgroundColor: colors.primary, // primary-container
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginButtonText: {
    ...Typography.titleLg,
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    ...Typography.bodyMd,
    color: colors.iconDefault, // outline
  },
  footerLink: {
    ...Typography.bodyMd,
    color: colors.primary, // primary
    fontWeight: '600',
  }
});
