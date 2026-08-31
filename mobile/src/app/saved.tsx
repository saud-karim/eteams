import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { MessageCard } from '../components/MessageCard';
import { useTranslation } from 'react-i18next';

export default function SavedMessagesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const data = await api.messages.getFiles();
      setMessages(data);
    } catch (e) {
      console.error('Failed to fetch files', e);
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('quick.later_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.pillBg, borderRadius: 8, paddingHorizontal: 12, height: 40 }}>
          <MaterialIcons name="search" size={20} color={colors.iconDefault} />
          <TextInput
            style={{ flex: 1, marginLeft: 8, color: colors.text, textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}
            placeholder={t('common.search', 'Search...')}
            placeholderTextColor={colors.iconDefault}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={colors.iconDefault} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="folder-open" size={48} color={colors.border} />
          <Text style={styles.emptyText}>{t('quick.no_files', 'No files shared yet')}</Text>
          <Text style={styles.emptySub}>{t('quick.no_files_sub', 'Files shared in channels and DMs will appear here.')}</Text>
        </View>
      ) : (
        <FlatList
          data={messages.filter(m => (m.body || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.file_name || '').toLowerCase().includes(searchQuery.toLowerCase()))}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
              <MessageCard
                message={item}
                onPress={() => router.push(item.parent_id ? `/thread/${item.parent_id}` : `/chat/${item.channel_slug}`)}
              />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textDim,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  }
});
