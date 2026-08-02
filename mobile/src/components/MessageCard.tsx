import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { UserAvatar } from './UserAvatar';
import { useTranslation } from 'react-i18next';

interface MessageCardProps {
  message: any;
  onPress: () => void;
  rightAction?: React.ReactNode;
}

export function MessageCard({ message, onPress, rightAction }: MessageCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { t, i18n } = useTranslation();

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.header, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
        <View style={[styles.headerLeft, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
          <MaterialIcons name={message.channel_slug ? "tag" : "person"} size={14} color={colors.textDim} />
          <Text style={[styles.channelName, i18n.dir() === 'rtl' ? { marginRight: 4 } : { marginLeft: 4 }]}>{message.channel_slug || message.channel_name || t('chat.direct_message')}</Text>
        </View>
        {rightAction}
      </View>
      
      <View style={[styles.content, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
        <UserAvatar
          name={message.author_name || '?'}
          avatarUrl={message.avatar_url}
          size={36}
        />
        <View style={[styles.messageRight, { alignItems: i18n.dir() === 'rtl' ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.authorRow, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
            <Text style={styles.authorName}>{message.author_name}</Text>
            <Text style={styles.time}>{formattedTime}</Text>
          </View>
          {message.body ? (
            <Text style={[styles.body, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]} numberOfLines={3} ellipsizeMode="tail">
              {message.body}
            </Text>
          ) : null}
          {message.attachments && message.attachments.length > 0 && (
            <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 4 }}>
              <MaterialIcons name="attachment" size={14} color={colors.textDim} />
              <Text style={{ color: colors.textDim, fontSize: 13, marginLeft: i18n.dir() === 'rtl' ? 0 : 4, marginRight: i18n.dir() === 'rtl' ? 4 : 0 }}>
                {t('chat.attachment', 'Attachment')} ({message.attachments.length})
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  channelName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textDim,
  },
  content: {
    flexDirection: 'row',
    gap: 12,
  },
  messageRight: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 2,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  time: {
    fontSize: 12,
    color: colors.textDim,
  },
  body: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
});
