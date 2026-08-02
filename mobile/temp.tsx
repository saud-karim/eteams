import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, Modal, TouchableWithoutFeedback, Animated, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useSocket } from '../../context/SocketContext';
import { api, API_BASE_URL } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);
  const { t, i18n } = useTranslation();
  
  const { user } = useAuth();
  const { channels, users, setChannels } = useWorkspace();
  const socket = useSocket();
  
  const channelObj = channels?.find((c: any) => c.slug === id);

  const getDisplayInfo = (ch: any) => {
    if (!ch) return { otherUser: null, displayName: 'Loading...' };
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

  const { displayName } = getDisplayInfo(channelObj);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  
  // Modal State
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!channelObj?.id) return;
    
    setLoading(true);
    
    // Mark channel as read
    api.channels.markRead(channelObj.id).catch(console.error);
    if (channelObj.unread_count > 0 && setChannels) {
      setChannels((prev: any[]) => prev.map(c => c.id === channelObj.id ? { ...c, unread_count: 0 } : c));
    }

    api.messages.list(channelObj.id)
      .then((res: any) => {
        const msgs = res.messages || [];
        setMessages(msgs);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
        // Mark all messages as read when opening channel
        const unreadIds = msgs
          .filter((m: any) => m.user_id !== user?.id)
          .map((m: any) => m.id);
        if (unreadIds.length > 0) {
          api.messages.markRead(unreadIds).catch(console.error);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [channelObj?.id]);

  useEffect(() => {
    if (!socket || !channelObj?.id) return;
    
    socket.emit('channel:join', { channelId: channelObj.id });

    const handleNewMessage = (msg: any) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      // If new message is from someone else, mark it as read immediately (we're active in chat)
      if (msg.user_id !== user?.id) {
        api.messages.markRead([msg.id]).catch(console.error);
      }
    };

    const handleReaction = (data: any) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.id) {
          return { ...m, reactions: data.reactions };
        }
        return m;
      }));
    };
    
    const handleUpdatedMessage = (data: any) => {
      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, ...data } : m));
    };

    const handleDeletedMessage = (data: any) => {
      setMessages(prev => prev.filter(m => m.id !== (data.id || data.messageId)));
    };

    const handleReadReceipt = (data: any) => {
      setMessages((prev: any[]) => prev.map(m => {
        if (data.messageIds?.includes(m.id)) {
          return { ...m, readers: data.readers };
        }
        return m;
      }));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:reactions', handleReaction);
    socket.on('message:updated', handleUpdatedMessage);
    socket.on('message:deleted', handleDeletedMessage);
    socket.on('message:read', handleReadReceipt);
    
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:reactions', handleReaction);
      socket.off('message:updated', handleUpdatedMessage);
      socket.off('message:deleted', handleDeletedMessage);
      socket.off('message:read', handleReadReceipt);
    };
  }, [socket, channelObj?.id]);

  const handleSend = async () => {
    if ((!inputText.trim() && !attachment) || !channelObj?.id) return;
    
    const body = inputText.trim();
    const attach = attachment;
    const isEdit = !!editingMessage;
    const editId = editingMessage?.id;
    
    setInputText('');
    setAttachment(null);
    setEditingMessage(null);
    
    try {
      if (isEdit && editId) {
        await api.messages.update(editId, body);
        setMessages(prev => prev.map(m => m.id === editId ? { ...m, body, is_edited: true } : m));
      } else if (attach) {
        await api.messages.sendWithAttachment(
          channelObj.id,
          body,
          null,
          attach.uri,
          attach.mimeType || 'application/octet-stream',
          attach.name || 'attachment'
        );
      } else {
        await api.messages.send(channelObj.id, body);
      }
    } catch (err) {
      console.error('Send failed', err);
      setInputText(body);
      setAttachment(attach);
      Alert.alert(t('common.error', 'Error'), t('chat.send_failed', 'Failed to send message'));
    }
  };

  const pickAttachment = () => {
    Alert.alert(
      t('chat.attach', 'Attach'),
      t('chat.choose_type', 'Choose attachment type'),
      [
        {
          text: t('chat.photo', 'Photo'),
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images', 'videos'],
              allowsEditing: false,
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              setAttachment({
                uri: asset.uri,
                mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
                name: asset.fileName || asset.uri.split('/').pop() || 'photo.jpg',
                isImage: asset.type !== 'video',
              });
            }
          }
        },
        {
          text: t('chat.document', 'Document'),
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({
              type: '*/*',
              copyToCacheDirectory: true,
            });
            if (result.canceled === false && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              setAttachment({
                uri: asset.uri,
                mimeType: asset.mimeType || 'application/octet-stream',
                name: asset.name,
                isImage: asset.mimeType?.startsWith('image/'),
              });
            }
          }
        },
        { text: t('common.cancel', 'Cancel'), style: 'cancel' }
      ]
    );
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await api.messages.react(messageId, emoji);
      closeModal();
    } catch (err) {
      console.error('React failed', err);
    }
  };

  const handleEditPress = () => {
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setInputText(selectedMessage.body || '');
    closeModal();
  };

  const handleDeletePress = () => {
    if (!selectedMessage) return;
    const targetId = selectedMessage.id;
    closeModal();
    Alert.alert(
      t('common.confirm', 'Confirm'),
      t('chat.delete_confirm', 'Are you sure you want to delete this message?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.messages.delete(targetId);
              setMessages(prev => prev.filter(m => m.id !== targetId));
            } catch (err) {
              console.error('Delete failed', err);
            }
          }
        }
      ]
    );
  };

  const handleThreadReplyPress = () => {
    if (!selectedMessage) return;
    const msg = selectedMessage;
    closeModal();
    router.push(`/thread/${msg.id}`);
  };

  const openModal = (msg: any) => {
    setSelectedMessage(msg);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedMessage(null));
  };

  const renderReactions = (reactions: any[]) => {
    if (!reactions || reactions.length === 0) return null;

    const grouped = reactions.reduce((acc, curr) => {
      acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <View style={styles.reactionsContainer}>
        {Object.entries(grouped).map(([emoji, count]) => (
          <View key={emoji} style={styles.reactionBadge}>
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            <Text style={styles.reactionCount}>{count as number}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (!channelObj) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#94A3B8' }}>Channel not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.iconButton}>
            <MaterialIcons name="arrow-back-ios" size={20} color={colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.headerTitlePill}>
            <Text style={styles.headerName}>
              {(channelObj?.type === 'dm' || channelObj?.type === 'group_dm' || channelObj?.type === 'direct') ? displayName : `#${channelObj?.name}`}
            </Text>
            {channelObj?.type !== 'dm' && channelObj?.type !== 'direct' && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.headerMembers}>{channelObj?.member_count || 0} members</Text>
                <MaterialIcons name="chevron-right" size={14} color={colors.iconDefault} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="auto-awesome" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="headphones" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Canvas */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatCanvas} 
          contentContainerStyle={styles.chatContent}
        >
          {loading ? (
            <Text style={{ color: '#94A3B8', textAlign: 'center', margin: 20 }}>{t('common.loading')}</Text>
          ) : messages.length === 0 ? (
            <Text style={{ color: '#94A3B8', textAlign: 'center', margin: 20 }}>This is the beginning of the chat.</Text>
          ) : (
            messages.map((msg, idx) => {
              const prevMsg = messages[idx - 1];
              const showHeader = !prevMsg || prevMsg.user_id !== msg.user_id || (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000);
              
              const msgUser = users?.find((u: any) => u.id === msg.user_id);
              const authorName = msg.author_name || msgUser?.name || msgUser?.username || 'Unknown';
              
              let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=1E293B&color=fff`;
              if (msgUser?.avatar) {
                avatarUrl = msgUser.avatar.startsWith('http') ? msgUser.avatar : `${API_BASE_URL}${msgUser.avatar}`;
              }

              return (
                <TouchableOpacity 
                  key={msg.id} 
                  style={[styles.messageRow, !showHeader && styles.messageRowCompact]}
                  onLongPress={() => openModal(msg)}
                  delayLongPress={250}
                  activeOpacity={0.7}
                >
                  <View style={styles.messageAvatarContainer}>
                    {showHeader ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder} />
                    )}
                  </View>
                  
                  <View style={styles.messageContent}>
                    {showHeader && (
                      <View style={styles.messageHeader}>
                        <Text style={styles.messageAuthor}>
                          {authorName}
                        </Text>
                        <Text style={styles.messageTime}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    )}
                    
                    {msg.body ? (
                      <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text style={[styles.messageText, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}>
                          {msg.body}
                        </Text>
                        {(msg.is_edited || msg.edited_at) && (
                          <Text style={{ fontSize: 11, color: colors.iconDefault, marginLeft: 4, marginRight: 4 }}>
                            ({t('chat.edited', 'edited')})
                          </Text>
                        )}
                        {(msg.user_id === user?.id || msg.author_id === user?.id) && (
                          <MaterialIcons 
                            name="done-all" 
                            size={14} 
                            color={colors.primary} 
                            style={{ marginLeft: 4, marginRight: 4 }} 
                          />
                        )}
                      </View>
                    ) : null}
                    
                    {msg.attachments && msg.attachments.length > 0 && (
                      <View style={{ marginTop: 8, gap: 8 }}>
                        {msg.attachments.map((att: any) => {
                          const fileUrl = att.storage_key.startsWith('http') ? att.storage_key : `${API_BASE_URL.replace('/api', '')}/${att.storage_key}`;
                          const isImage = att.mime_type?.startsWith('image/');
                          return isImage ? (
                            <Image key={att.id} source={{ uri: fileUrl }} style={{ width: 250, height: 180, borderRadius: 12, backgroundColor: colors.pillBg }} resizeMode="cover" />
                          ) : (
                            <TouchableOpacity 
                              key={att.id} 
                              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.pillBg, padding: 12, borderRadius: 8, maxWidth: 250 }}
                              onPress={() => WebBrowser.openBrowserAsync(fileUrl)}
                            >
                              <MaterialIcons name="insert-drive-file" size={24} color={colors.primary} />
                              <View style={{ marginLeft: 8, flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: '500' }} numberOfLines={1} ellipsizeMode="middle">{att.original_name || att.filename}</Text>
                                <Text style={{ color: colors.iconDefault, fontSize: 11 }}>{(att.size_bytes / 1024).toFixed(1)} KB</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                    
                    {renderReactions(msg.reactions)}

                    {/* Read receipts: show for own messages - last in sequence */}
                    {msg.user_id === user?.id && idx === messages.length - 1 && (
                      <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 2, gap: 3 }}>
                        <MaterialIcons
                          name="done-all"
                          size={14}
                          color={msg.readers && msg.readers.length > 0 ? colors.primary : colors.iconDefault}
                        />
                        {msg.readers && msg.readers.length > 0 && msg.readers.slice(0, 3).map((reader: any) => (
                          <View
                            key={reader.id}
                            style={{
                              width: 14, height: 14, borderRadius: 7,
                              backgroundColor: reader.avatar_color || colors.primary,
                              alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 7, color: '#fff', fontWeight: 'bold' }}>
                              {(reader.avatar_initials || reader.name?.charAt(0) || '?').charAt(0)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
        {/* Rich Composer */}
        <View style={styles.inputWrapper}>
          {editingMessage && (
            <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 8 }}>
              <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="edit" size={16} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{t('chat.editing_message', 'Editing message')}</Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
                <MaterialIcons name="close" size={18} color={colors.iconDefault} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.composerContainer}>
            {attachment && (
              <View style={styles.attachmentPreviewContainer}>
                {attachment.isImage ? (
                  <Image source={{ uri: attachment.uri }} style={styles.attachmentPreviewImage} />
                ) : (
                  <View style={styles.attachmentPreviewFile}>
                    <MaterialIcons name="insert-drive-file" size={24} color={colors.primary} />
                    <Text style={styles.attachmentPreviewFileName} numberOfLines={1} ellipsizeMode="middle">
                      {attachment.name}
                    </Text>
                  </View>
                )}
                <TouchableOpacity style={styles.attachmentRemoveBtn} onPress={() => setAttachment(null)}>
                  <MaterialIcons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
            <TextInput 
              style={[styles.textInput, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}
              placeholder={t('chat.type_message')}
              placeholderTextColor={colors.iconDefault}
              multiline
              value={inputText}
              onChangeText={setInputText}
            />
            
            <View style={styles.composerFooter}>
              <View style={styles.composerFooterLeft}>
                <TouchableOpacity style={styles.composerPlusBtn} onPress={pickAttachment}>
                  <MaterialIcons name="add" size={20} color={colors.iconDefault} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.composerActionBtn} onPress={() => Alert.alert('Coming Soon', 'Text formatting will be available in the next update.')}>
                  <MaterialIcons name="text-format" size={22} color={colors.iconDefault} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.composerActionBtn} onPress={() => Alert.alert('Coming Soon', 'Emoji picker will be available in the next update.')}>
                  <MaterialIcons name="sentiment-satisfied" size={22} color={colors.iconDefault} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.composerActionBtn} onPress={() => Alert.alert('Coming Soon', 'Mentions will be available in the next update.')}>
                  <MaterialIcons name="alternate-email" size={22} color={colors.iconDefault} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.composerActionBtn} onPress={() => Alert.alert('Coming Soon', 'More options will be available in the next update.')}>
                  <MaterialIcons name="more-horiz" size={22} color={colors.iconDefault} />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.sendButton, !(inputText.trim() || attachment) && { backgroundColor: 'rgba(59, 167, 214, 0.2)' }]} 
                onPress={handleSend}
                disabled={!(inputText.trim() || attachment)}
              >
                <MaterialIcons name="send" size={18} color={(inputText.trim() || attachment) ? colors.onPrimary : colors.iconDefault} style={[styles.sendIconFix, { transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Long Press Bottom Sheet Modal */}
        <Modal
          visible={!!selectedMessage}
          transparent={true}
          animationType="fade"
          onRequestClose={closeModal}
        >
          <TouchableWithoutFeedback onPress={closeModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
                  <View style={styles.sheetHandle} />
                  
                  {/* Quick Reactions */}
                  <View style={styles.quickReactions}>
                    {['👍', '❤️', '😂', '🎉', '👀'].map(emoji => (
                      <TouchableOpacity 
                        key={emoji} 
                        style={styles.quickReactionBtn}
                        onPress={() => handleReact(selectedMessage.id, emoji)}
                      >
                        <Text style={styles.quickReactionEmoji}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.sheetDivider} />

                  <TouchableOpacity style={styles.sheetOption} onPress={handleThreadReplyPress}>
                    <MaterialIcons name="chat-bubble-outline" size={24} color={colors.text} style={styles.sheetOptionIcon} />
                    <Text style={styles.sheetOptionText}>{t('chat.reply_in_thread')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.sheetOption} onPress={() => { closeModal(); }}>
                    <MaterialIcons name="content-copy" size={24} color={colors.text} style={styles.sheetOptionIcon} />
                    <Text style={styles.sheetOptionText}>{t('common.copy_text', 'Copy text')}</Text>
                  </TouchableOpacity>

                  {(selectedMessage?.user_id === user?.id || selectedMessage?.author_id === user?.id) && (
                    <>
                      <TouchableOpacity style={styles.sheetOption} onPress={handleEditPress}>
                        <MaterialIcons name="edit" size={24} color={colors.text} style={styles.sheetOptionIcon} />
                        <Text style={styles.sheetOptionText}>{t('common.edit_message', 'Edit message')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.sheetOption} onPress={handleDeletePress}>
                        <MaterialIcons name="delete-outline" size={24} color="#F43F5E" style={styles.sheetOptionIcon} />
                        <Text style={[styles.sheetOptionText, { color: '#F43F5E' }]}>{t('common.delete_message', 'Delete message')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: insets?.top || 0,
    height: 56 + (insets?.top || 0),
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.pillBg,
  },
  iconButton: {
    padding: 8,
  },
  headerTitlePill: {
    flex: 1,
    backgroundColor: colors.pillBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
    marginHorizontal: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  headerMembers: {
    fontSize: 11,
    color: colors.iconDefault,
    marginRight: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatCanvas: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatContent: {
    paddingVertical: 16,
    paddingBottom: 40,
  },
  messageRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 2,
  },
  messageRowCompact: {
    paddingTop: 2,
    paddingBottom: 2,
  },
  messageAvatarContainer: {
    width: 40,
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.avatarBg,
  },
  avatarPlaceholder: {
    width: 36,
  },
  messageContent: {
    flex: 1,
    marginLeft: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  messageAuthor: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  messageTime: {
    fontSize: 12,
    color: colors.iconDefault,
  },
  messageText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    textAlign: 'left',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pillBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.reactionBorder,
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  inputWrapper: {
    backgroundColor: colors.background,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  composerContainer: {
    backgroundColor: colors.composerBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.composerBorder,
    padding: 8,
  },
  textInput: {
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: 8,
    maxHeight: 150,
    minHeight: 40,
    textAlignVertical: 'top',
    textAlign: 'left',
  },
  composerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  composerFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  composerPlusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.pillBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginLeft: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIconFix: {
    marginLeft: 4,
  },
  attachmentPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: colors.pillBg,
    borderRadius: 8,
    position: 'relative',
  },
  attachmentPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  attachmentPreviewFile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    flex: 1,
  },
  attachmentPreviewFileName: {
    color: colors.text,
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  attachmentRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F43F5E',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    zIndex: 10,
  },
  composerActionBtn: {
    padding: 4,
    marginRight: 10,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  sendIconFix: {
    marginLeft: 2, // optical center for send icon
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.composerBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#273647',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  quickReactions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  quickReactionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.pillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickReactionEmoji: {
    fontSize: 24,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: colors.reactionBorder,
    marginBottom: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  sheetOptionIcon: {
    marginRight: 16,
  },
  sheetOptionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
});
