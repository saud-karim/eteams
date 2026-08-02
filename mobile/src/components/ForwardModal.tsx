import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useWorkspace } from '../context/WorkspaceContext';
import { api } from '../api/client';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export default function ForwardModal({ visible, onClose, message }: any) {
  const [query, setQuery] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const { channels } = useWorkspace();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (!message) return null;

  const filteredChannels = (channels || []).filter((c: any) => 
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleForward = async (targetChannelId: string) => {
    if (sending) return;
    setSending(true);
    try {
      const forwardedContent = `> **Forwarded message from @${message.author_name}**\n> ${message.body.split('\n').join('\n> ')}`;
      const finalBody = comment.trim() ? `${comment}\n\n${forwardedContent}` : forwardedContent;
      
      await api.messages.send(targetChannelId, finalBody);
      onClose();
    } catch (err: any) {
      alert(err.error || err.message || 'Failed to forward message');
    } finally {
      setSending(false);
    }
  };

  const isRtl = i18n.dir() === 'rtl';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={[styles.header, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[styles.titleRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <MaterialIcons name="forward" size={20} color={colors.text} style={isRtl ? {marginLeft: 8, transform: [{scaleX: -1}]} : {marginRight: 8}} />
              <Text style={styles.headerTitle}>Forward Message</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={colors.iconDefault} />
            </TouchableOpacity>
          </View>

          <View style={[styles.messagePreview, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.previewAuthor}>{message.author_name}</Text>
            <Text style={[styles.previewText, { textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={3}>
              {message.body}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { textAlign: isRtl ? 'right' : 'left' }]}>Add a comment (optional)</Text>
            <TextInput
              style={[styles.input, { textAlign: isRtl ? 'right' : 'left' }]}
              value={comment}
              onChangeText={setComment}
              placeholder="What do you want to say about this?"
              placeholderTextColor={colors.iconDefault}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { textAlign: isRtl ? 'right' : 'left' }]}>Forward to...</Text>
            <View style={styles.searchWrapper}>
              <MaterialIcons name="search" size={20} color={colors.iconDefault} style={isRtl ? styles.searchIconRtl : styles.searchIcon} />
              <TextInput
                style={[styles.input, isRtl ? styles.searchInputRtl : styles.searchInput]}
                value={query}
                onChangeText={setQuery}
                placeholder="Search channels..."
                placeholderTextColor={colors.iconDefault}
              />
            </View>
          </View>

          <View style={styles.listContainer}>
            {filteredChannels.length === 0 ? (
              <Text style={styles.emptyText}>No channels found</Text>
            ) : (
              <FlatList
                data={filteredChannels}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 250 }}
                renderItem={({ item }) => (
                  <View style={[styles.channelRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.channelName, { textAlign: isRtl ? 'right' : 'left' }]}>
                      <Text style={{color: colors.iconDefault}}># </Text>
                      {item.name}
                    </Text>
                    <TouchableOpacity 
                      style={styles.forwardBtn} 
                      onPress={() => handleForward(item.id)}
                      disabled={sending}
                    >
                      {sending ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.forwardBtnText}>Forward</Text>}
                    </TouchableOpacity>
                  </View>
                )}
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
  messagePreview: {
    backgroundColor: colors.surfaceContainer,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  previewAuthor: {
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 14,
  },
  previewText: {
    color: colors.textDim,
    fontSize: 14,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    color: colors.textDim,
    fontSize: 14,
    marginBottom: 8,
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
  channelRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  channelName: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
  },
  forwardBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  forwardBtnText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
