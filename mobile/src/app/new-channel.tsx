import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Switch, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { api, API_BASE_URL } from '../api/client';
import { useTranslation } from 'react-i18next';

export default function NewChannelScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const { users, refreshWorkspace } = useWorkspace();
  const { user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const styles = createStyles(colors, insets);

  // Channel State
  const canCreatePublic = currentUser?.role === 'superadmin' || currentUser?.permissions?.['create-public'];
  const canCreatePrivate = currentUser?.role === 'superadmin' || currentUser?.permissions?.['create-private'];
  const canCreateAnnouncement = currentUser?.role === 'superadmin' || currentUser?.permissions?.['create-announcement'];

  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [channelType, setChannelType] = useState(canCreatePublic ? 'public' : (canCreatePrivate ? 'private' : 'announcement'));
  const [isReadonly, setIsReadonly] = useState(false);
  const [isMandatory, setIsMandatory] = useState(false);
  const [channelColor, setChannelColor] = useState('');
  const [channelIcon, setChannelIcon] = useState('megaphone');
  const [creatingChannel, setCreatingChannel] = useState(false);

  const CHANNEL_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#F43F5E'];

  const handleCreateChannel = async () => {
    if (!channelName.trim()) return;
    try {
      setCreatingChannel(true);
      const res = await api.channels.create({
        name: channelName.trim().replace(/\s+/g, '-').toLowerCase(),
        description: channelDesc.trim() || undefined,
        type: channelType,
        is_readonly: isReadonly,
        is_mandatory: isMandatory,
        color: channelColor || undefined,
        icon: channelType === 'announcement' ? channelIcon : undefined
      });
      await refreshWorkspace();
      router.replace(`/chat/${res.channel.slug}`);
    } catch (e: any) {
      console.error('Failed to create channel:', e);
      alert(e.message || 'Failed to create channel');
    } finally {
      setCreatingChannel(false);
    }
  };

  const renderAvatar = (name: string, avatarPath?: string) => {
    if (avatarPath) {
      return avatarPath.startsWith('http') ? avatarPath : `${API_BASE_URL.replace('/api', '')}/${avatarPath}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name={i18n.dir() === 'rtl' ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('new_channel', 'New Channel')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.label}>Channel Name</Text>
          <TextInput 
            style={[styles.input, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}
            placeholder="e.g. design-team"
            placeholderTextColor={colors.iconDefault}
            value={channelName}
            onChangeText={setChannelName}
          />
          
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput 
            style={[styles.input, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left', height: 80 }]}
            placeholder="What's this channel about?"
            placeholderTextColor={colors.iconDefault}
            multiline
            value={channelDesc}
            onChangeText={setChannelDesc}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Channel Color (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginTop: 8 }}>
            {CHANNEL_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setChannelColor(channelColor === c ? '' : c)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: c,
                  marginRight: 12,
                  borderWidth: channelColor === c ? 2 : 0,
                  borderColor: colors.text,
                }}
              />
            ))}
          </ScrollView>

          <Text style={styles.label}>Type</Text>
          <View style={[styles.tabContainer, { padding: 0, marginBottom: 24, marginTop: 8, gap: 8 }]}>
            {canCreatePublic && (
              <TouchableOpacity 
                style={[styles.tab, channelType === 'public' && styles.activeTab]}
                onPress={() => setChannelType('public')}
              >
                <Text style={[styles.tabText, channelType === 'public' && styles.activeTabText]}>Public</Text>
              </TouchableOpacity>
            )}
            {canCreatePrivate && (
              <TouchableOpacity 
                style={[styles.tab, channelType === 'private' && styles.activeTab]}
                onPress={() => setChannelType('private')}
              >
                <Text style={[styles.tabText, channelType === 'private' && styles.activeTabText]}>Private</Text>
              </TouchableOpacity>
            )}
            {canCreateAnnouncement && (
              <TouchableOpacity 
                style={[styles.tab, channelType === 'announcement' && styles.activeTab]}
                onPress={() => setChannelType('announcement')}
              >
                <Text style={[styles.tabText, channelType === 'announcement' && styles.activeTabText]}>Announce</Text>
              </TouchableOpacity>
            )}
          </View>

          {channelType === 'announcement' && (
            <View style={{ marginBottom: 24 }}>
              <Text style={[styles.label, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}>Channel Icon</Text>
              <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', gap: 12, marginTop: 8 }}>
                {[
                  { id: 'megaphone', icon: 'bullhorn' },
                  { id: 'crown', icon: 'crown' },
                  { id: 'sparkles', icon: 'shimmer' }
                ].map(item => (
                  <TouchableOpacity 
                    key={item.id}
                    onPress={() => setChannelIcon(item.id)}
                    style={{
                      width: 48, height: 48, borderRadius: 12, 
                      backgroundColor: channelIcon === item.id ? colors.primary : colors.surfaceContainerHigh,
                      alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <MaterialCommunityIcons 
                      name={item.icon as any} 
                      size={24} 
                      color={channelIcon === item.id ? '#FFF' : (channelColor || colors.text)} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.toggleRow, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { marginBottom: 4, textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}>Read-Only (Managers Only)</Text>
              <Text style={[styles.helperText, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}>
                Only managers can post messages.
              </Text>
            </View>
            <Switch 
              value={isReadonly} 
              onValueChange={setIsReadonly} 
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>

          <View style={[styles.toggleRow, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { marginBottom: 4, textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}>Mandatory for everyone</Text>
              <Text style={[styles.helperText, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}>
                Automatically adds all active users.
              </Text>
            </View>
            <Switch 
              value={isMandatory} 
              onValueChange={setIsMandatory} 
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>

          <TouchableOpacity 
            style={[styles.createButton, { marginTop: 32, opacity: channelName.trim() ? 1 : 0.5 }]} 
            onPress={handleCreateChannel} 
            disabled={!channelName.trim() || creatingChannel}
          >
            {creatingChannel ? <ActivityIndicator color="#FFF" /> : <Text style={styles.createButtonText}>Create Channel</Text>}
          </TouchableOpacity>
        </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
  },
  activeTab: { backgroundColor: colors.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.text },
  activeTabText: { color: '#FFF' },
  content: { flex: 1 },
  searchBox: {
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, marginHorizontal: 8 },
  selectedScroll: { maxHeight: 50, marginBottom: 12 },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  pillAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 6 },
  pillText: { color: colors.text, fontSize: 14, fontWeight: '500', marginRight: 6 },
  userList: { flex: 1 },
  userRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userRowLeft: { alignItems: 'center' },
  userAvatar: { width: 44, height: 44, borderRadius: 22 },
  userName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },
  userRole: { fontSize: 13, color: colors.text + '80' },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.iconDefault,
    justifyContent: 'center', alignItems: 'center'
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  createButton: {
    backgroundColor: colors.primary,
    margin: 16, paddingVertical: 16,
    borderRadius: 12, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  createButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, fontSize: 16, color: colors.text
  },
  toggleRow: {
    marginTop: 24, alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerHigh, padding: 16, borderRadius: 12
  },
  helperText: { fontSize: 13, color: colors.iconDefault }
});
