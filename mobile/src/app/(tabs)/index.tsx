import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Animated, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { TabHeader } from '../../components/TabHeader';

export default function HomeScreen() {
  const router = useRouter();
  const { channels, loading, refreshWorkspace, refreshing } = useWorkspace();
  const { user } = useAuth();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);
  
  const [announcementsExpanded, setAnnouncementsExpanded] = useState(true);
  const [activeProjectsExpanded, setActiveProjectsExpanded] = useState(true);
  
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#94A3B8', padding: 16 }}>Loading workspace...</Text>
      </View>
    );
  }

  const announcementChannels = channels.filter((c: any) => c.type === 'announcement');
  const regularChannels = channels.filter((c: any) => c.type === 'public' || c.type === 'private' || (!c.type && c.name !== 'direct'));

  const CHANNEL_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#F43F5E'];
  const getChannelColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CHANNEL_COLORS[Math.abs(hash) % CHANNEL_COLORS.length];
  };

  const renderChannel = (channel: any) => {
    const isAnnouncement = channel.type === 'announcement';
    const isPrivate = channel.type === 'private';
    const isCeo = channel.name === 'ceo-announcements';
    
    let color = channel.color || getChannelColor(channel.name);
    if (isCeo) color = '#F59E0B'; // Golden Amber
    else if (isAnnouncement && !channel.color) color = '#10B981'; // Emerald
    
    // Convert hex to rgba for background
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const bgColor = `rgba(${r}, ${g}, ${b}, 0.15)`;

    return (
      <TouchableOpacity 
        key={channel.id} 
        style={styles.channelItem}
        onPress={() => router.push(`/chat/${channel.slug}`)}
      >
        <View style={styles.channelItemLeft}>
          <View style={[styles.channelIconWrapper, { backgroundColor: bgColor }]}>
            <MaterialIcons 
              name={isAnnouncement ? 'campaign' : isPrivate ? 'lock' : 'tag'} 
              size={16} 
              color={color} 
            />
          </View>
          <Text style={[styles.channelName, channel.unread_count > 0 && styles.channelNameUnread]}>
            {channel.name}
          </Text>
        </View>
        {channel.unread_count > 0 && (
          <View style={[styles.badge, channel.mention_count > 0 && styles.badgeMention]}>
            <Text style={[styles.badgeText, channel.mention_count > 0 && styles.badgeTextMention]}>
              {channel.unread_count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      
      <TabHeader title="eTeams" showLogo={true} />

      {/* Global Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={colors.iconDefault} style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Jump to or search..."
            placeholderTextColor="#889299"
          />
          <MaterialIcons name="mic" size={20} color={colors.iconDefault} style={styles.micIcon} />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <MaterialIcons name="filter-list" size={20} color={colors.iconDefault} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshWorkspace} tintColor={colors.primary} />
        }
      >
        
        {/* Quick Actions (Horizontal Scroll) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(129, 140, 248, 0.15)' }]}>
              <MaterialIcons name="auto-awesome" size={20} color="#818cf8" />
            </View>
            <Text style={styles.actionTitle}>Catch up</Text>
            <Text style={styles.actionSubtitle}>3 new</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <MaterialIcons name="chat-bubble-outline" size={20} color="#38bdf8" />
            </View>
            <Text style={styles.actionTitle}>Threads</Text>
            <Text style={styles.actionSubtitle}>Caught up</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(244, 114, 182, 0.15)' }]}>
              <MaterialIcons name="bookmark-border" size={20} color="#f472b6" />
            </View>
            <Text style={styles.actionTitle}>Later</Text>
            <Text style={styles.actionSubtitle}>2 items</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <MaterialIcons name="send" size={20} color="#10b981" />
            </View>
            <Text style={styles.actionTitle}>Drafts</Text>
            <Text style={styles.actionSubtitle}>0 drafts</Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* Divider */}
        <View style={styles.divider} />

        {/* Announcements Section */}
        {announcementChannels.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setAnnouncementsExpanded(!announcementsExpanded)}
            >
              <MaterialIcons 
                name={announcementsExpanded ? 'keyboard-arrow-down' : 'keyboard-arrow-right'} 
                size={18} 
                color="#d4e4fa" 
              />
              <Text style={styles.sectionTitle}>Announcements</Text>
            </TouchableOpacity>
            
            {announcementsExpanded && (
              <View style={styles.sectionList}>
                {announcementChannels.map(renderChannel)}
              </View>
            )}
          </View>
        )}

        {/* Channels Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setActiveProjectsExpanded(!activeProjectsExpanded)}
          >
            <MaterialIcons 
              name={activeProjectsExpanded ? 'keyboard-arrow-down' : 'keyboard-arrow-right'} 
              size={18} 
              color="#d4e4fa" 
            />
            <Text style={styles.sectionTitle}>Channels</Text>
          </TouchableOpacity>
          
          {activeProjectsExpanded && (
            <View style={styles.sectionList}>
              {regularChannels.map(renderChannel)}
            </View>
          )}
        </View>

      </ScrollView>

    </View>
  );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Deep dark blue background
  },
  scrollContent: {
    paddingBottom: 80,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  micIcon: {
    marginLeft: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: {
    paddingBottom: 100, // Space for FAB
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    width: 110,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: colors.iconDefault,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  huddleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // Subtle green tint
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  huddleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  huddleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 2,
  },
  huddleSubtitle: {
    fontSize: 12,
    color: 'rgba(16, 185, 129, 0.8)',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sectionList: {
    marginTop: 4,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  channelItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  channelName: {
    fontSize: 16,
    color: colors.textDim,
    fontWeight: '500',
  },
  channelNameUnread: {
    color: colors.text,
    fontWeight: '700', // Bold for unread
  },
  badge: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeMention: {
    backgroundColor: colors.primary, // Neon blue instead of pink for better theme matching
  },
  badgeText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextMention: {
    color: colors.background, // Contrast color
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary, // Slack-like floating action button, but in our neon blue
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
