import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { API_BASE_URL, api } from '../../api/client';
import { useRouter } from 'expo-router';
import { TabHeader } from '../../components/TabHeader';
import { UserAvatar } from '../../components/UserAvatar';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DmsScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);
  const router = useRouter();
  
  const { user } = useAuth();
  const { channels, users, refreshWorkspace, refreshing } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const dmChannels = channels.filter((c: any) => c.type === 'direct' || c.type === 'dm' || c.type === 'group_dm' || c.slug?.startsWith('dm-'));

  const toggleUserSelection = (u: any) => {
    setSelectedUsers(prev => {
      const exists = prev.find(p => p.id === u.id);
      if (exists) return prev.filter(p => p.id !== u.id);
      return [...prev, u];
    });
  };

  const filteredUsers = users?.filter((u: any) => 
    u.id !== user?.id && 
    (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const isSearchActive = searchQuery.length > 0 || selectedUsers.length > 0;

  const handleCreateDM = async () => {
    if (selectedUsers.length === 0) return;
    setIsCreating(true);
    try {
      const userIds = selectedUsers.map(u => String(u.id));
      const res = await api.channels.createDM(userIds, groupName.trim() || undefined);
      await refreshWorkspace();
      setSearchQuery('');
      setSelectedUsers([]);
      setGroupName('');
      router.push(`/chat/${res.channel.slug}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create DM');
    } finally {
      setIsCreating(false);
    }
  };

  const getDisplayInfo = (ch: any) => {
    let otherName = ch.name;
    let otherUser = null;

    if (ch.slug && ch.slug.startsWith('dm-')) {
      const ids = ch.slug.replace('dm-', '').split('-');
      const otherIds = ids.filter((id: string) => id !== String(user?.id));
      if (otherIds.length > 0) {
        const otherUsers = otherIds.map((id: string) => users?.find((u: any) => String(u.id) === id)).filter(Boolean);
        if (ch.type === 'dm' || otherUsers.length === 1) {
          otherUser = otherUsers[0] || null;
          if (otherUser) otherName = otherUser.name;
        } else {
          otherName = ch.name;
        }
      }
    }

    if (!otherUser && ch.type === 'dm') {
      otherName = ch.name.split(', ').find((n: string) => n !== user?.name) || ch.name;
      otherUser = users?.find((u: any) => u.name === otherName);
    }

    return { otherUser, displayName: otherName };
  };

  return (
    <View style={styles.container}>
      <TabHeader title="Chats" showLogo={false} />

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={colors.iconDefault} style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Find people or channels..."
          placeholderTextColor={colors.iconDefault}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, zIndex: 2 }}>
            <MaterialIcons name="close" size={20} color={colors.iconDefault} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshWorkspace} tintColor={colors.primary} />
        }
      >
        
        {isSearchActive ? (
          <View style={styles.section}>
            {selectedUsers.length > 0 && (
              <View style={styles.selectedContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {selectedUsers.map(su => (
                    <TouchableOpacity key={su.id} style={styles.selectedChip} onPress={() => toggleUserSelection(su)}>
                      <UserAvatar 
                        name={su.name || su.username} 
                        avatarUrl={su.avatar}
                        size={20}
                        style={{ marginRight: 6, borderRadius: 10 }}
                      />
                      <Text style={styles.selectedChipText}>{su.name || su.username}</Text>
                      <MaterialIcons name="close" size={16} color={colors.iconDefault} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {selectedUsers.length > 1 && (
                  <TextInput
                    style={styles.groupNameInput}
                    placeholder="Group Name (Optional)"
                    placeholderTextColor={colors.iconDefault}
                    value={groupName}
                    onChangeText={setGroupName}
                  />
                )}

                <TouchableOpacity 
                  style={[styles.createButton, isCreating && { opacity: 0.7 }]} 
                  onPress={handleCreateDM}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator color={colors.background} size="small" />
                  ) : (
                    <Text style={styles.createButtonText}>Start Chat</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.sectionHeader}>MATCHING USERS</Text>
            {filteredUsers.length === 0 ? (
              <Text style={{ color: colors.iconDefault, paddingHorizontal: 16 }}>No users found.</Text>
            ) : (
              filteredUsers.map((u: any) => {
                const isSelected = selectedUsers.some(su => su.id === u.id);
                
                return (
                  <TouchableOpacity key={u.id} style={styles.userListItem} onPress={() => toggleUserSelection(u)}>
                    <View style={styles.userListItemLeft}>
                      <UserAvatar 
                        name={u.name || u.username}
                        avatarUrl={u.avatar}
                        size={40}
                        style={styles.chatAvatar}
                      />
                      <Text style={styles.chatName}>{u.name || u.username}</Text>
                    </View>
                    <MaterialIcons 
                      name={isSelected ? "check-circle" : "radio-button-unchecked"} 
                      size={24} 
                      color={isSelected ? colors.primary : colors.iconDefault} 
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : (
          <>
            {/* Favorites */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>FAVORITES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favoritesContainer}>
                {/* User 1 */}
                <TouchableOpacity style={styles.favoriteItem} onPress={() => router.push('/chat/sarah')}>
                  <View style={styles.favoriteAvatarWrapper}>
                    <Image source={{ uri: 'https://i.pravatar.cc/150?img=1' }} style={styles.favoriteAvatar} />
                    <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
                  </View>
                  <Text style={styles.favoriteName} numberOfLines={1}>Sarah M.</Text>
                </TouchableOpacity>

                {/* User 2 */}
                <TouchableOpacity style={styles.favoriteItem} onPress={() => router.push('/chat/david')}>
                  <View style={styles.favoriteAvatarWrapper}>
                    <Image source={{ uri: 'https://i.pravatar.cc/150?img=2' }} style={styles.favoriteAvatar} />
                    <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                  </View>
                  <Text style={styles.favoriteName} numberOfLines={1}>David K.</Text>
                </TouchableOpacity>

                {/* User 3 */}
                <TouchableOpacity style={styles.favoriteItem} onPress={() => router.push('/chat/elena')}>
                  <View style={styles.favoriteAvatarWrapper}>
                    <Image source={{ uri: 'https://i.pravatar.cc/150?img=3' }} style={styles.favoriteAvatar} />
                    <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                  </View>
                  <Text style={styles.favoriteName} numberOfLines={1}>Elena R.</Text>
                </TouchableOpacity>

                {/* User 4 */}
                <TouchableOpacity style={styles.favoriteItem} onPress={() => router.push('/chat/marcus')}>
                  <View style={styles.favoriteAvatarWrapper}>
                    <Image source={{ uri: 'https://i.pravatar.cc/150?img=4' }} style={styles.favoriteAvatar} />
                    <View style={[styles.statusDot, { backgroundColor: '#889299' }]} />
                  </View>
                  <Text style={styles.favoriteName} numberOfLines={1}>Marcus T.</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Recent Messages */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>RECENT</Text>
              <View style={styles.recentList}>
                {dmChannels.length === 0 ? (
                  <Text style={{ color: colors.iconDefault, paddingHorizontal: 16 }}>No direct messages yet.</Text>
                ) : (
                  dmChannels.map((ch: any) => {
                    const { otherUser, displayName } = getDisplayInfo(ch);
                    
                    const isOnline = otherUser?.presence === 'online';
                    const statusColor = isOnline ? '#22C55E' : '#889299';

                    return (
                      <TouchableOpacity key={ch.id} style={styles.chatItem} onPress={() => router.push(`/chat/${ch.slug}`)}>
                        <View style={styles.chatAvatarContainer}>
                          <UserAvatar 
                            name={displayName}
                            avatarUrl={otherUser?.avatar}
                            size={48}
                            style={styles.chatAvatar}
                          />
                          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        </View>
                        <View style={styles.chatContent}>
                          <View style={styles.chatHeader}>
                            <Text style={[styles.chatName, ch.unread_count > 0 && { fontWeight: '700', color: colors.text }]}>
                              {displayName}
                            </Text>
                            <Text style={ch.unread_count > 0 ? styles.chatTimePrimary : styles.chatTime}>
                              {ch.last_message_at ? new Date(ch.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </Text>
                          </View>
                          <Text style={ch.unread_count > 0 ? styles.chatMessagePrimary : styles.chatMessage} numberOfLines={1}>
                            {ch.last_message?.body || "Started a conversation"}
                          </Text>
                        </View>
                        {ch.unread_count > 0 && (
                          <View style={styles.unreadIndicator} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

    </View>
  );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: insets?.top || 0,
    height: 56 + (insets?.top || 0),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.background,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingLeft: 40,
    paddingRight: 36,
    color: colors.text,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.iconDefault,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedChipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  selectedChipText: {
    color: colors.text,
    fontSize: 13,
    marginRight: 4,
  },
  groupNameInput: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 15,
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  favoritesContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  favoriteItem: {
    alignItems: 'center',
    width: 64,
    gap: 8,
  },
  favoriteAvatarWrapper: {
    position: 'relative',
  },
  favoriteAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.background,
  },
  favoriteName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.background,
  },
  recentList: {
    paddingHorizontal: 16,
    gap: 4,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chatAvatarContainer: {
    position: 'relative',
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  chatTime: {
    fontSize: 11,
    color: colors.iconDefault,
  },
  chatTimePrimary: {
    fontSize: 11,
    color: colors.primary,
  },
  chatMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatMessage: {
    fontSize: 14,
    color: colors.iconDefault,
    flex: 1,
  },
  chatMessagePrimary: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
});
