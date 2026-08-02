import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '../components/UserAvatar';
import * as ImagePicker from 'expo-image-picker';
export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [name, setName] = useState(user?.name || user?.username || '');
  const [jobTitle, setJobTitle] = useState(user?.job_title || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [statusText, setStatusText] = useState(user?.status_text || '');
  const [presence, setPresence] = useState(user?.presence || 'online');
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setAvatarUploading(true);
      try {
        const res = await api.users.updateAvatar(
          asset.uri,
          asset.mimeType || 'image/jpeg',
          asset.fileName || 'avatar.jpg'
        );
        if (res.user) {
          setUser({ ...res.user, presence });
        }
        Alert.alert(t('common.success'), t('profile.profile_updated'));
      } catch (err: any) {
        Alert.alert(t('common.error'), err.message || t('common.something_went_wrong'));
      } finally {
        setAvatarUploading(false);
      }
    }
  };

  const styles = createStyles(colors);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('profile.name_required'));
      return;
    }

    setLoading(true);
    try {
      // Update basic profile
      const res = await api.users.updateMe(name, jobTitle, statusText, email, phone);
      // Update presence
      await api.users.setPresence(presence, statusText);

      if (res.user) {
        setUser({ ...res.user, presence });
      }

      Alert.alert(t('common.success'), t('profile.profile_updated'));

      router.back();
    } catch (err: any) {
      Alert.alert(t('profile.error_updating_profile'), err.message || t('common.something_went_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const getPresenceColor = (p: string) => {
    switch (p) {
      case 'online': return '#10B981';
      case 'away': return '#F59E0B';
      case 'dnd': return '#EF4444';
      case 'meeting': return '#8B5CF6';
      case 'offline': return '#6B7280';
      default: return '#10B981';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.edit_title')}</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.saveButtonText}>{t('common.save')}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={handleAvatarPick} disabled={avatarUploading} style={{ position: 'relative' }}>
            <UserAvatar name={name} avatarUrl={user?.avatar} size={100} style={{ opacity: avatarUploading ? 0.5 : 1 }} />
            <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary, borderRadius: 16, padding: 6 }}>
              <MaterialIcons name="photo-camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.inputGroup, { alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }]}>
          <Text style={styles.label}>{t('auth.name')}</Text>
          <TextInput
            style={[styles.input, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left', width: '100%' }]}
            value={name}
            onChangeText={setName}
            placeholder={t('auth.enter_name')}
            placeholderTextColor={colors.textDim}
          />
        </View>

        <View style={[styles.inputGroup, { alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }]}>
          <Text style={styles.label}>{t('profile.job_title')}</Text>
          <TextInput
            style={[styles.input, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left', width: '100%' }]}
            value={jobTitle}
            onChangeText={setJobTitle}
            placeholder={t('profile.job_placeholder')}
            placeholderTextColor={colors.textDim}
          />
        </View>

        <View style={[styles.inputGroup, { alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }]}>
          <Text style={styles.label}>{t('profile.email_address', 'Email Address')}</Text>
          <TextInput
            style={[styles.input, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left', width: '100%' }]}
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. user@example.com"
            placeholderTextColor={colors.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={[styles.inputGroup, { alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }]}>
          <Text style={styles.label}>{t('profile.phone_number', 'Phone Number')}</Text>
          <TextInput
            style={[styles.input, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left', width: '100%' }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +1234567890"
            placeholderTextColor={colors.textDim}
            keyboardType="phone-pad"
          />
        </View>

        <View style={[styles.inputGroup, { alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }]}>
          <Text style={styles.label}>{t('profile.presence')}</Text>
          <View style={[styles.presenceContainer, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
            {['online', 'away', 'dnd', 'meeting', 'offline'].map(p => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.presenceChip,
                  presence === p && styles.presenceChipActive,
                  presence === p && { backgroundColor: getPresenceColor(p) }
                ]}
                onPress={() => setPresence(p)}
              >
                <View style={[styles.presenceDot, { backgroundColor: presence === p ? '#fff' : getPresenceColor(p), marginLeft: i18n.dir() === 'rtl' ? 6 : 0, marginRight: i18n.dir() === 'rtl' ? 0 : 6 }]} />
                <Text style={[styles.presenceChipText, presence === p && { color: '#fff' }]}>
                  {p === 'dnd' ? t('profile.dnd', 'Do Not Disturb') : p === 'away' ? t('profile.away', 'Away') : p === 'meeting' ? t('profile.meeting', 'In a Meeting') : p === 'offline' ? t('profile.offline', 'Offline') : t('profile.available', 'Available')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.inputGroup, { alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }]}>
          <Text style={styles.label}>{t('profile.status_message')}</Text>
          <TextInput
            style={[styles.input, styles.textArea, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left', width: '100%' }]}
            value={statusText}
            onChangeText={setStatusText}
            placeholder={t('profile.status_placeholder')}
            placeholderTextColor={colors.textDim}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDim,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  textArea: {
    height: 100,
  },
  presenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  presenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  presenceChipActive: {
    borderColor: 'transparent',
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presenceChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
});
