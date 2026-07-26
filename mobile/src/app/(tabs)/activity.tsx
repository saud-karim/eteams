import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, API_BASE_URL } from '../../api/client';
import { useRouter } from 'expo-router';
import { TabHeader } from '../../components/TabHeader';

export default function ActivityScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);
  const router = useRouter();

  const [mentions, setMentions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMentions = async () => {
    try {
      const res = await api.messages.getMentions();
      setMentions(res.mentions || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMentions().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMentions();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <TabHeader title="Activity" showLogo={false} />
      <ScrollView 
        contentContainerStyle={mentions.length === 0 ? styles.content : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
           <View style={styles.emptyState}>
             <Text style={styles.emptyStateText}>Loading...</Text>
           </View>
        ) : mentions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No recent activity.</Text>
          </View>
        ) : (
          mentions.map((msg) => {
            const authorName = msg.author_name || 'Unknown';
            let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=1E293B&color=fff`;
            if (msg.author_avatar) {
               avatarUrl = msg.author_avatar.startsWith('http') ? msg.author_avatar : `${API_BASE_URL}${msg.author_avatar}`;
            }

            return (
              <TouchableOpacity key={msg.id} style={styles.mentionItem} onPress={() => router.push(`/chat/${msg.channel_slug}`)}>
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                <View style={styles.mentionContent}>
                  <View style={styles.mentionHeader}>
                    <Text style={styles.authorName}>{authorName}</Text>
                    <Text style={styles.channelName}>in {msg.channel_type === 'dm' || msg.channel_type === 'group_dm' || msg.channel_type === 'direct' ? msg.channel_name : `#${msg.channel_name || msg.channel_slug}`}</Text>
                  </View>
                  <Text style={styles.messageBody} numberOfLines={2}>{msg.body}</Text>
                  <Text style={styles.time}>{new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </View>
              </TouchableOpacity>
            )
          })
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
    padding: 16,
    paddingTop: 16 + (insets?.top || 0),
    height: 56 + (insets?.top || 0),
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border || colors.pillBg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.iconDefault,
    fontSize: 16,
  },
  mentionItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || colors.pillBg,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  mentionContent: {
    flex: 1,
  },
  mentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  authorName: {
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 6,
    fontSize: 15,
  },
  channelName: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  messageBody: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  time: {
    color: colors.iconDefault,
    fontSize: 12,
  }
});
