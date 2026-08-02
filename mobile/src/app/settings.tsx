import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Alert } from 'react-native';
import { UserAvatar } from '../components/UserAvatar';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../locales/i18n';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { theme, colors, setThemeSetting } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = createStyles(colors);

  const toggleTheme = () => {
    setThemeSetting(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    changeLanguage(newLang);
  };


  const handleLogout = async () => {
    await logout();
    // Navigate back to auth index
    router.replace('/(auth)/login' as any);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#76D1FF" style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        </View>
        <TouchableOpacity style={styles.profileIconButton}>
          <MaterialIcons name="person" size={24} color="#76D1FF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Summary Card */}
        <View style={styles.profileSummary}>
          <UserAvatar 
            name={user?.name || user?.username || '?'} 
            avatarUrl={user?.avatar_url} 
            size={60} 
            style={{ marginRight: 16 }}
          />
          <View style={styles.profileTextContainer}>
            <Text style={styles.profileName}>{user?.name || user?.username}</Text>
            <Text style={styles.profileRole}>{user?.job_title || (user?.role === 'superadmin' ? t('profile.system_admin') : t('profile.member'))}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          </View>
          <TouchableOpacity style={styles.editIconButton} onPress={() => router.push('/edit-profile')}>
            <MaterialIcons name="edit" size={20} color="#bec8cf" />
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>
          <View style={styles.sectionCard}>
            
            {/* Appearance */}
            <TouchableOpacity style={[styles.settingItem, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]} onPress={toggleTheme}>
              <View style={[styles.settingItemLeft, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
                <View style={styles.settingIconContainer}>
                  <MaterialIcons name="palette" size={20} color="#76D1FF" />
                </View>
                <View style={{ alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }}>
                  <Text style={styles.settingTitle}>{t('settings.theme')}</Text>
                  <Text style={styles.settingSubtitle}>{theme === 'dark' ? t('settings.dark_mode_desc') : t('settings.light_mode_desc')}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#bec8cf" style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />
            </TouchableOpacity>

            {/* Language */}
            <TouchableOpacity style={[styles.settingItem, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]} onPress={toggleLanguage}>
              <View style={[styles.settingItemLeft, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
                <View style={styles.settingIconContainer}>
                  <MaterialIcons name="language" size={20} color="#76D1FF" />
                </View>
                <View style={{ alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }}>
                  <Text style={styles.settingTitle}>{t('settings.language')}</Text>
                  <Text style={styles.settingSubtitle}>{i18n.language === 'en' ? t('settings.english') : t('settings.arabic')}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#bec8cf" style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />
            </TouchableOpacity>



          </View>
        </View>

        {/* Account & Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          <View style={styles.sectionCard}>
            
            {/* Edit Profile */}
            <TouchableOpacity style={[styles.settingItem, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]} onPress={() => router.push('/edit-profile')}>
              <View style={[styles.settingItemLeft, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
                <View style={styles.settingIconContainer}>
                  <MaterialIcons name="person-outline" size={20} color="#76D1FF" />
                </View>
                <View style={{ alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }}>
                  <Text style={styles.settingTitle}>{t('settings.edit_profile')}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#bec8cf" style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />
            </TouchableOpacity>

            {/* Change Password */}
            <TouchableOpacity style={[styles.settingItem, styles.noBorderBottom, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]} onPress={() => router.push('/change-password')}>
              <View style={[styles.settingItemLeft, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
                <View style={styles.settingIconContainer}>
                  <MaterialIcons name="lock-outline" size={20} color="#76D1FF" />
                </View>
                <View style={{ alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }}>
                  <Text style={styles.settingTitle}>{t('settings.change_password')}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#bec8cf" style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />
            </TouchableOpacity>

          </View>
        </View>

        {/* Danger Zone */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="#F43F5E" />
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>eTeams App</Text>
          <Text style={styles.versionNumber}>Version 1.0.0 (Build 42)</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  profileIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
    paddingBottom: 40,
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInitials: {
    color: colors.onPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  profileTextContainer: {
    flex: 1,
  },
  profileName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  profileRole: {
    color: colors.textDim,
    fontSize: 14,
    marginTop: 2,
  },
  profileEmail: {
    color: colors.primary,
    fontSize: 12,
    marginTop: 4,
  },
  editIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    paddingHorizontal: 8,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  noBorderBottom: {
    borderBottomWidth: 0,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    color: '#F43F5E',
    fontSize: 18,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    opacity: 0.6,
  },
  versionText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  versionNumber: {
    color: '#889299',
    fontSize: 11,
    marginTop: 4,
  },
});
