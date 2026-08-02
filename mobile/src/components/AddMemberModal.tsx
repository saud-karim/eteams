import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useWorkspace } from '../context/WorkspaceContext';
import { api, API_BASE_URL } from '../api/client';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  channelId: string | number;
  currentMembers: any[];
  onMemberAdded: (user: any) => void;
}

export default function AddMemberModal({ visible, onClose, channelId, currentMembers, onMemberAdded }: AddMemberModalProps) {
  const [query, setQuery] = useState('');
  const [addingId, setAddingId] = useState<string | number | null>(null);
  const { users } = useWorkspace();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const isRtl = i18n.dir() === 'rtl';

  // Filter out users that are already in the channel
  const currentMemberIds = new Set(currentMembers.map(m => String(m.id)));
  
  const availableUsers = (users || []).filter((u: any) => {
    if (currentMemberIds.has(String(u.id))) return false;
    if (!query) return true;
    return (u.name || u.username || '').toLowerCase().includes(query.toLowerCase());
  });

  const handleAdd = async (user: any) => {
    if (addingId) return;
    setAddingId(user.id);
    try {
      await api.channels.addMember(channelId, user.id);
      onMemberAdded(user);
    } catch (err: any) {
      alert(err.error || err.message || 'Failed to add member');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={[styles.header, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[styles.titleRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <MaterialIcons name="person-add" size={20} color={colors.text} style={isRtl ? {marginLeft: 8} : {marginRight: 8}} />
              <Text style={styles.headerTitle}>{t('chat.add_member', 'Add Member')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={colors.iconDefault} />
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <View style={styles.searchWrapper}>
              <MaterialIcons name="search" size={20} color={colors.iconDefault} style={isRtl ? styles.searchIconRtl : styles.searchIcon} />
              <TextInput
                style={[styles.input, isRtl ? styles.searchInputRtl : styles.searchInput]}
                value={query}
                onChangeText={setQuery}
                placeholder={t('chat.search_users', 'Search users...')}
                placeholderTextColor={colors.iconDefault}
              />
            </View>
          </View>

          <View style={styles.listContainer}>
            {availableUsers.length === 0 ? (
              <Text style={styles.emptyText}>{t('chat.no_users_found', 'No users found')}</Text>
            ) : (
              <FlatList
                data={availableUsers}
                keyExtractor={(item) => String(item.id)}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => {
                  let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || item.username || '?')}&background=1E293B&color=fff`;
                  if (item.avatar) {
                    avatarUrl = item.avatar.startsWith('http') ? item.avatar : `${API_BASE_URL}${item.avatar}`;
                  }
                  
                  return (
                    <View style={[styles.userRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                      <Image source={{ uri: avatarUrl }} style={[styles.avatar, isRtl ? { marginLeft: 12 } : { marginRight: 12 }]} />
                      <View style={{ flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
                        <Text style={styles.userName}>{item.name || item.username}</Text>
                        {!!item.job_title && <Text style={styles.userJob}>{item.job_title}</Text>}
                      </View>
                      <TouchableOpacity 
                        style={styles.addBtn} 
                        onPress={() => handleAdd(item)}
                        disabled={!!addingId}
                      >
                        {addingId === item.id ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.addBtnText}>{t('common.add', 'Add')}</Text>}
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  field: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  searchWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchIconRtl: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: 40,
  },
  searchInputRtl: {
    paddingRight: 40,
  },
  listContainer: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  emptyText: {
    color: colors.iconDefault,
    textAlign: 'center',
    padding: 16,
  },
  userRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  userJob: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  addBtnText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
