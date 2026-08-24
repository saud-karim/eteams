import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { theme, colors, setThemeSetting } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);
  const router = useRouter();
  const { login } = useAuth();
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await login(username, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || t('auth.login_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Blurs */}
      <View style={styles.blurTopLeft} />
      <View style={styles.blurBottomRight} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.langButton} onPress={() => {
              const newLang = i18n.language === 'en' ? 'ar' : 'en';
              import('../../locales/i18n').then(({ changeLanguage }) => changeLanguage(newLang));
            }}>
              <MaterialIcons name="language" size={18} color={colors.textDim} />
              <Text style={styles.langText}>{i18n.language === 'en' ? 'EN' : 'AR'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.themeButton} onPress={() => setThemeSetting(theme === 'dark' ? 'light' : 'dark')}>
              <MaterialIcons name={theme === 'dark' ? 'light-mode' : 'dark-mode'} size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          <View style={styles.glassPanel}>
            <View style={styles.logoSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'column', gap: 4, marginRight: 16 }}>
                  <View style={{ height: 6, width: 28, backgroundColor: '#3BA7D6', borderRadius: 4 }} />
                  <View style={{ height: 6, width: 36, backgroundColor: '#22D3EE', borderRadius: 4 }} />
                  <View style={{ height: 6, width: 22, backgroundColor: '#67E8F9', borderRadius: 4 }} />
                </View>
                
                <View style={{ 
                  flexDirection: 'row', alignItems: 'baseline',
                  backgroundColor: colors.surfaceContainerHigh, paddingVertical: 8, paddingHorizontal: 16, 
                  borderRadius: 12, borderWidth: 1, borderColor: colors.border,
                  elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8
                }}>
                  <Text style={{ color: '#3BA7D6', fontWeight: '900', fontSize: 36, lineHeight: 36 }}>E</Text>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 30, letterSpacing: 1, lineHeight: 36 }}>teams</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>{t('auth.welcome_back')}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.username')}</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="person" size={20} color={colors.textDim} style={styles.inputIconLeft} />
                  <TextInput
                    style={[styles.input, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}
                    placeholder={t('auth.enter_username')}
                    placeholderTextColor={colors.border}
                    autoCapitalize="none"
                    value={username}
                    onChangeText={setUsername}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.passwordHeader}>
                  <Text style={styles.label}>{t('auth.password')}</Text>
                  <TouchableOpacity>
                    <Text style={styles.forgotPassword}>{t('auth.forgot_password')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock" size={20} color={colors.textDim} style={styles.inputIconLeft} />
                  <TextInput
                    style={[styles.input, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}
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
                  onPress={() => setRemember(!remember)}
                >
                  <View style={[styles.checkbox, remember && styles.checkboxActive]}>
                    {remember && <MaterialIcons name="check" size={12} color={colors.background} />}
                  </View>
                  <Text style={styles.rememberText}>{t('auth.remember_me')}</Text>
                </TouchableOpacity>
              </View>

              {error ? <Text style={{ color: '#F43F5E', textAlign: 'center' }}>{error}</Text> : null}

              <TouchableOpacity 
                style={[styles.loginButton, loading && { opacity: 0.7 }]} 
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>{loading ? t('auth.logging_in') : t('auth.login')}</Text>
                {!loading && <MaterialIcons name="arrow-forward" size={20} color="#fff" style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />}
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.no_account')}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>{t('auth.sign_up')}</Text>
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
  blurTopLeft: {
    position: 'absolute',
    top: -height * 0.2,
    left: -width * 0.1,
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: 9999,
    backgroundColor: colors.border, // primary/10
  },
  blurBottomRight: {
    position: 'absolute',
    bottom: -height * 0.2,
    right: -width * 0.1,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 9999,
    backgroundColor: 'rgba(74, 225, 118, 0.05)', // secondary/5
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  topBar: {
    position: 'absolute',
    top: insets.top > 0 ? insets.top + 16 : 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 20,
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
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPassword: {
    ...Typography.labelMd,
    color: colors.primary, // primary
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
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...Typography.labelMd,
    color: colors.iconDefault, // outline
  },
  footerLink: {
    ...Typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
});
