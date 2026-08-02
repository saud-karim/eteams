import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TabHeader } from '../../components/TabHeader';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/UserAvatar';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
export default function ProfileScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { t, i18n } = useTranslation();

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedPresence, setSelectedPresence] = useState(user?.presence || 'online');
  const [statusText, setStatusText] = useState(user?.status_text || '');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [updatingContact, setUpdatingContact] = useState(false);

  if (!user) return null;

  const handleSaveStatus = async () => {
    setUpdatingStatus(true);
    try {
      await api.users.setPresence(selectedPresence, statusText);
      setUser((prev: any) => ({ ...prev, presence: selectedPresence, status_text: statusText }));
      setStatusModalVisible(false);
    } catch (err: any) {
      console.error(err);
      Alert.alert(t('common.error', 'Error'), err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveContact = async () => {
    setUpdatingContact(true);
    try {
      const res = await api.users.updateMe(user.name, user.job_title, user.status_text, editEmail, editPhone);
      setUser((prev: any) => ({ ...prev, ...res.user }));
      setContactModalVisible(false);
    } catch (err: any) {
      console.error(err);
      Alert.alert(t('common.error', 'Error'), err.message || 'Failed to update contact info');
    } finally {
      setUpdatingContact(false);
    }
  };


  return (
    <View style={styles.container}>
      <TabHeader title={t('tabs.profile')} showLogo={false} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.coverPhoto} />
          
          <View style={styles.profileInfoContainer}>
            <View style={styles.avatarWrapper}>
              <UserAvatar 
                name={user.name || user.username || '?'} 
                avatarUrl={user.avatar_url} 
                size={90} 
              />
              <View style={[styles.onlineBadge, { backgroundColor: user.presence === 'dnd' ? '#F43F5E' : user.presence === 'away' ? '#F59E0B' : user.presence === 'meeting' ? '#8B5CF6' : user.presence === 'offline' ? '#64748B' : '#10B981' }]} />
            </View>

            <TouchableOpacity style={styles.editButton} onPress={() => router.push('/edit-profile')}>
              <MaterialIcons name="edit" size={16} color="#003548" />
              <Text style={styles.editButtonText}>{t('settings.edit_profile')}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.detailsContainer, { alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.nameText}>{user.name || user.username}</Text>
            <Text style={styles.roleText}>{user.job_title || (user.role === 'superadmin' ? t('profile.system_admin') : t('profile.member'))}</Text>

            <View style={styles.tagsContainer}>
              {user.department && (
                <View style={styles.tag}>
                  <MaterialIcons name="corporate-fare" size={14} color={colors.iconDefault} />
                  <Text style={styles.tagText}>{user.department}</Text>
                </View>
              )}
              {user.company_rank && (
                <View style={styles.tag}>
                  <MaterialIcons name="star" size={14} color={colors.iconDefault} />
                  <Text style={styles.tagText}>{user.company_rank}</Text>
                </View>
              )}
              <View style={styles.tag}>
                <MaterialIcons name="badge" size={14} color={colors.iconDefault} />
                <Text style={styles.tagText}>{t('profile.id_label')} {String(user.id).substring(0, 8)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Update */}
        <TouchableOpacity style={styles.card} onPress={() => { setSelectedPresence(user.presence || 'online'); setStatusText(user.status_text || ''); setStatusModalVisible(true); }}>
          <View style={[styles.cardHeader, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="history-edu" size={20} color="#ffb95f" />
              <Text style={styles.cardTitle}>{t('profile.current_status')}</Text>
            </View>
            <MaterialIcons name="edit" size={16} color={colors.iconDefault} />
          </View>
          <View style={[styles.statusBox, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
            <MaterialIcons name="circle" size={14} color={user.presence === 'dnd' ? '#F43F5E' : user.presence === 'away' ? '#F59E0B' : user.presence === 'meeting' ? '#8B5CF6' : user.presence === 'offline' ? '#64748B' : '#10B981'} style={{ marginTop: 4 }} />
            <View style={[styles.statusTextContainer, { alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }]}>
              <Text style={styles.statusText}>
                {user.status_text || (user.presence === 'dnd' ? t('profile.dnd', 'Do Not Disturb') : user.presence === 'away' ? t('profile.away', 'Away') : user.presence === 'meeting' ? t('profile.meeting', 'In a Meeting') : user.presence === 'offline' ? t('profile.offline', 'Offline') : t('profile.available', 'Available'))}
              </Text>
              <Text style={styles.statusTime}>{t('profile.tap_to_change', 'Tap to update presence & status')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Contact Info */}
        <TouchableOpacity style={styles.card} onPress={() => { setEditEmail(user.email || ''); setEditPhone(user.phone || ''); setContactModalVisible(true); }}>
          <View style={[styles.cardHeader, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="contact-mail" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>{t('profile.contact_info')}</Text>
            </View>
            <MaterialIcons name="edit" size={16} color={colors.iconDefault} />
          </View>
          
          <View style={[styles.contactItem, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
            <MaterialIcons name="email" size={20} color={colors.iconDefault} />
            <View style={{ alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }}>
              <Text style={styles.contactLabel}>{t('profile.email_address')}</Text>
              <Text style={styles.contactValue}>{user.email || t('profile.not_provided')}</Text>
            </View>
          </View>

          <View style={[styles.contactItem, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
            <MaterialIcons name="phone" size={20} color={colors.iconDefault} />
            <View style={{ alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }}>
              <Text style={styles.contactLabel}>{t('profile.phone_number')}</Text>
              <Text style={styles.contactValue}>{user.phone || t('profile.not_provided')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Settings Button */}
        <TouchableOpacity style={[styles.settingsButton, { marginTop: 12, flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]} onPress={() => router.push('/settings')}>
          <View style={[styles.settingsLeft, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
            <MaterialIcons name="settings" size={24} color={colors.text} />
            <Text style={styles.settingsText}>{t('settings.title')}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.iconDefault} style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />
        </TouchableOpacity>

      </ScrollView>

      {/* Status & Presence Modal */}
      <Modal
        visible={statusModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 400, backgroundColor: colors.surfaceContainerHigh, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}>
              {t('profile.update_status_title', 'Update Presence & Status')}
            </Text>

            {/* Presence Choices */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.iconDefault, marginBottom: 8, textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}>
              {t('profile.presence_label', 'Presence')}
            </Text>

            <View style={{ gap: 8, marginBottom: 16 }}>
              {[
                { id: 'online', label: t('profile.available', 'Available'), color: '#10B981' },
                { id: 'away', label: t('profile.away', 'Away'), color: '#F59E0B' },
                { id: 'dnd', label: t('profile.dnd', 'Do Not Disturb'), color: '#F43F5E' },
                { id: 'meeting', label: t('profile.meeting', 'In a Meeting'), color: '#8B5CF6' },
                { id: 'offline', label: t('profile.offline', 'Offline'), color: '#64748B' },
              ].map(p => (
                <TouchableOpacity 
                  key={p.id}
                  style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: selectedPresence === p.id ? colors.surfaceContainer : 'transparent', borderWidth: 1, borderColor: selectedPresence === p.id ? colors.primary : colors.border }}
                  onPress={() => setSelectedPresence(p.id)}
                >
                  <MaterialIcons name="circle" size={14} color={p.color} style={{ marginRight: 8, marginLeft: 8 }} />
                  <Text style={{ flex: 1, color: colors.text, fontWeight: selectedPresence === p.id ? '700' : '400', textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}>{p.label}</Text>
                  {selectedPresence === p.id && <MaterialIcons name="check" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Status Text */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.iconDefault, marginBottom: 6, textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}>
              {t('profile.status_text_label', 'Status message')}
            </Text>
            <TextInput
              style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 14, marginBottom: 20, textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}
              placeholder={t('profile.status_placeholder', 'e.g. In a meeting, WFH')}
              placeholderTextColor={colors.iconDefault}
              value={statusText}
              onChangeText={setStatusText}
            />

            {/* Action Buttons */}
            <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }} onPress={() => setStatusModalVisible(false)}>
                <Text style={{ color: colors.iconDefault, fontWeight: '600' }}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' }} onPress={handleSaveStatus} disabled={updatingStatus}>
                {updatingStatus ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={{ color: colors.background, fontWeight: '700' }}>{t('common.save', 'Save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Modal */}
      <Modal
        visible={contactModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 400, backgroundColor: colors.surfaceContainerHigh, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}>
              {t('profile.contact_info', 'Contact Information')}
            </Text>

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.iconDefault, marginBottom: 6, textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}>
              {t('profile.email_address', 'Email Address')}
            </Text>
            <TextInput
              style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 14, marginBottom: 16, textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}
              placeholder="e.g. user@example.com"
              placeholderTextColor={colors.iconDefault}
              keyboardType="email-address"
              autoCapitalize="none"
              value={editEmail}
              onChangeText={setEditEmail}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.iconDefault, marginBottom: 6, textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}>
              {t('profile.phone_number', 'Phone Number')}
            </Text>
            <TextInput
              style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 14, marginBottom: 20, textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}
              placeholder="e.g. +1234567890"
              placeholderTextColor={colors.iconDefault}
              keyboardType="phone-pad"
              value={editPhone}
              onChangeText={setEditPhone}
            />

            <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }} onPress={() => setContactModalVisible(false)}>
                <Text style={{ color: colors.iconDefault, fontWeight: '600' }}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' }} onPress={handleSaveContact} disabled={updatingContact}>
                {updatingContact ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={{ color: colors.background, fontWeight: '700' }}>{t('common.save', 'Save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  coverPhoto: {
    height: 100,
    backgroundColor: colors.primary,
    opacity: 0.8,
  },
  profileInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginTop: -40,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.surfaceContainer,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.surfaceContainer,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    marginBottom: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  detailsContainer: {
    padding: 16,
  },
  nameText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  roleText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  statusBox: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.surfaceContainerHigh,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  statusTime: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactLabel: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: 2,
  },
  contactValue: {
    color: colors.text,
    fontSize: 14,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 8,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  }
});
