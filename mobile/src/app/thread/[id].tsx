import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, Modal, TouchableWithoutFeedback, Animated, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { api, API_BASE_URL } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useSocket } from '../../context/SocketContext';
import Markdown from 'react-native-markdown-display';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import ForwardModal from '../../components/ForwardModal';


export default function ThreadScreen() {
  const { theme, colors } = useTheme();
  const { id: rawId } = useLocalSearchParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { users, channels } = useWorkspace();
  const socket = useSocket();

  const [parentMessage, setParentMessage] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [channelDetails, setChannelDetails] = useState<any>(null);
  const [channelObj, setChannelObj] = useState<any>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [activeReadersMessage, setActiveReadersMessage] = useState<any>(null);
  const [forwardMessage, setForwardMessage] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const slideAnim = useRef(new Animated.Value(300)).current;

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadThread();
  }, [id]);

  useEffect(() => {
    if (!socket || !parentMessage?.channel_id) return;

    socket.emit('channel:join', { channelId: parentMessage.channel_id });

    const handleNewMessage = (msg: any) => {
      // Use String() for absolute safety against type mismatches
      if (String(msg.parent_id) === String(id)) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
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

    const handleTypingStart = (data: any) => {
      if (data.userId !== user?.id && String(data.parentId) === String(id)) {
        setTypingUsers(prev => {
          if (!prev.includes(data.name)) return [...prev, data.name];
          return prev;
        });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers(prev => prev.filter(name => name !== data.name));
        }, 5000);
      }
    };

    const handleTypingStop = (data: any) => {
      if (data.userId !== user?.id && String(data.parentId) === String(id)) {
        setTypingUsers(prev => prev.filter(name => name !== data.name));
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:reactions', handleReaction);
    socket.on('message:updated', handleUpdatedMessage);
    socket.on('message:deleted', handleDeletedMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
  
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:reactions', handleReaction);
      socket.off('message:updated', handleUpdatedMessage);
      socket.off('message:deleted', handleDeletedMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, parentMessage?.channel_id, id]);

  const loadThread = async () => {
    try {
      setLoading(true);
      // Fetch parent message
      const pRes = await api.messages.get(id as string);
      setParentMessage(pRes.message);

      if (pRes.message?.channel_id) {
        
        // Find channel slug from context to fetch details
        const cObj = channels?.find((c: any) => c.id === pRes.message.channel_id);
        if (cObj) {
          setChannelObj(cObj);
          api.channels.get(cObj.slug).then(res => {
            setChannelDetails(res);
          }).catch(console.error);
        }
      }

      // Fetch replies
      const rRes = await api.messages.listReplies(id as string);
      setMessages(rRes.messages); // Backend already returns in chronological order
    } catch (error) {
      console.error('Failed to load thread:', error);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
    }
  };

  
  const handleSend = async () => {
    if ((!body.trim() && !attachment) || sending || !parentMessage) return;
    try {
      setSending(true);
      
      let messageRes;
      if (attachment) {
        const formData = new FormData();
        formData.append('channelId', parentMessage.channel_id);
        formData.append('body', body.trim());
        formData.append('parentId', id as string);
        
        formData.append('file', {
          uri: attachment.uri,
          name: attachment.name,
          type: attachment.mimeType || 'application/octet-stream',
        } as any);

        messageRes = await api.messages.sendWithAttachment(
          parentMessage.channel_id,
          body.trim(),
          id as string,
          attachment.uri,
          attachment.mimeType || 'application/octet-stream',
          attachment.name
        );
      } else {
        if (editingMessage) {
           await api.messages.update(editingMessage.id, body.trim());
           setEditingMessage(null);
           setBody('');
           return;
        } else {
           messageRes = await api.messages.send(parentMessage.channel_id, body.trim(), id as string);
        }
      }

      if (messageRes && messageRes.message) {
        setMessages(prev => {
          if (prev.find(m => m.id === messageRes.message.id)) return prev;
          return [...prev, messageRes.message];
        });
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
      
      setBody('');
      setAttachment(null);
      setEditingMessage(null);
      
      if (socket && parentMessage.channel_id) {
         socket.emit('typing:stop', { channelId: parentMessage.channel_id, parentId: id });
      }
    } catch (error) {
      console.error('Send reply failed:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTextChange = (text: string) => {
    setBody(text);
    if (socket && parentMessage) {
      if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
      socket.emit('typing:start', { channelId: parentMessage.channel_id, parentId: id });
      
      myTypingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { channelId: parentMessage.channel_id, parentId: id });
      }, 3000);
    }
    
    // Mentions logic
    const lastWord = text.split(' ').pop();
    if (lastWord && lastWord.startsWith('@') && (user?.role === 'superadmin' || user?.permissions?.['at-user'])) {
      setMentionQuery(lastWord.substring(1).toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const newBody = body.slice(0, selection.start) + emoji + body.slice(selection.end);
    setBody(newBody);
    setSelection({ start: selection.start + emoji.length, end: selection.start + emoji.length });
  };

  const specialMentions = [
    { id: 'here', name: 'here', fullname: 'Notify only active members', initials: '🔔', special: true },
    { id: 'channel', name: 'channel', fullname: 'Notify all members', initials: '📢', special: true },
    { id: 'everyone', name: 'everyone', fullname: 'Notify entire workspace', initials: '🌍', special: true }
  ];

  const allMentionable = [
    ...(user?.role === 'superadmin' || user?.permissions?.['at-here'] ? [specialMentions[0]] : []),
    ...(user?.role === 'superadmin' || user?.permissions?.['at-channel'] ? [specialMentions[1]] : []),
    ...(user?.role === 'superadmin' || user?.permissions?.['at-everyone'] ? [specialMentions[2]] : []),
    ...(users || [])
  ];

  const filteredMembers = allMentionable.filter((m: any) => 
    ((m.name || '').toLowerCase().includes(mentionQuery) || (m.username || '').toLowerCase().includes(mentionQuery) || (m.fullname || '').toLowerCase().includes(mentionQuery)) && m.id !== user?.id
  ) || [];

  const handleSelectMention = (member: any) => {
    const words = body.split(' ');
    words.pop();
    const newText = words.join(' ') + (words.length > 0 ? ' ' : '') + '@' + (member.username || member.name) + ' ';
    setBody(newText);
    setShowMentions(false);
  };
  
  const pickAttachment = async () => {
    Alert.alert(
      t('chat.attach_file', 'Attach File'),
      '',
      [
        {
          text: t('chat.photo_video', 'Photo or Video'),
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.All,
              allowsEditing: false,
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              setAttachment({
                uri: asset.uri,
                mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
                name: asset.fileName || 'upload.jpg',
                isImage: asset.type === 'image' || !asset.type,
              });
            }
          }
        },
        {
          text: t('chat.document', 'Document'),
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              setAttachment({
                uri: asset.uri,
                mimeType: asset.mimeType,
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
  
  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await api.messages.react(messageId, emoji);
      closeModal();
    } catch (err) {}
  };
  const handleEditPress = () => {
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setBody(selectedMessage.body || '');
    closeModal();
  };
  const handleForwardPress = () => {
    if (!selectedMessage) return;
    setForwardMessage(selectedMessage);
    closeModal();
  };

  const handleTogglePin = async () => {
    if (!selectedMessage) return;
    try {
      const newStatus = !selectedMessage.is_pinned;
      await api.messages.togglePin(selectedMessage.id, newStatus);
      if (selectedMessage.id === parentMessage?.id) {
        setParentMessage((prev: any) => ({ ...prev, is_pinned: newStatus ? 1 : 0 }));
      } else {
        setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, is_pinned: newStatus ? 1 : 0 } : m));
      }
      closeModal();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to pin message');
    }
  };

  const handleToggleSave = async () => {
    if (!selectedMessage) return;
    try {
      const isCurrentlySaved = selectedMessage.is_saved;
      const res = await api.messages.toggleSave(selectedMessage.id, !isCurrentlySaved);
      if (selectedMessage.id === parentMessage?.id) {
        setParentMessage((prev: any) => ({ ...prev, is_saved: res.saved ? 1 : 0 }));
      } else {
        setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, is_saved: res.saved ? 1 : 0 } : m));
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to save/unsave message');
    } finally {
      closeModal();
    }
  };
  const handleDeletePress = () => {
    if (!selectedMessage) return;
    const targetId = selectedMessage.id;
    closeModal();
    Alert.alert(t('common.confirm', 'Confirm'), t('chat.delete_confirm', 'Are you sure you want to delete this message?'), [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      { text: t('common.delete', 'Delete'), style: 'destructive', onPress: async () => {
          try {
            await api.messages.delete(targetId);
            setMessages(prev => prev.filter(m => m.id !== targetId));
          } catch (err) {}
        }
      }
    ]);
  };
  
  const renderReactions = (reactions: any[]) => {
    if (!reactions || reactions.length === 0) return null;
    const grouped = reactions.reduce((acc, curr) => {
      acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
        {Object.entries(grouped).map(([emoji, count]) => (
          <View key={emoji} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 12 }}>{emoji}</Text>
            <Text style={{ fontSize: 10, color: colors.iconDefault, marginLeft: 4 }}>{count as number}</Text>
          </View>
        ))}
      </View>
    );
  };


  const renderAvatar = (authorName: string, avatarPath?: string) => {
    let url = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=1E293B&color=fff`;
    if (avatarPath) {
      url = avatarPath.startsWith('http') ? avatarPath : `${API_BASE_URL}${avatarPath}`;
    }
    return url;
  };

  if (loading && !parentMessage) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const currentMem = channelDetails?.members?.find((m: any) => m.id === user?.id);
  const isManager = currentMem?.is_manager;
  const isSuperadmin = user?.role === 'superadmin';
  const isReadOnly = channelObj?.is_readonly || channelDetails?.is_readonly;
  
  let canPostInChannel = false;
  let canPin = false;
  if (channelDetails && channelDetails.members) {
    const canPost = (!!currentMem?.can_post && currentMem.can_post !== 0) || isManager || isSuperadmin;
    canPostInChannel = canPost && (!isReadOnly || isManager || isSuperadmin);
    canPin = (!!currentMem?.can_pin_messages && currentMem.can_pin_messages !== 0) || isManager || isSuperadmin;
  } else {
    // Optimistic fallback before details load
    canPostInChannel = !isReadOnly;
  }

  // Also check thread permission (default to true if permissions object exists but key is missing, or object is missing)
  const hasThreadPerm = user?.permissions && user.permissions['thread'] !== undefined ? user.permissions['thread'] : true;
  if (parentMessage && !isSuperadmin && !hasThreadPerm) {
    canPostInChannel = false;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{t('chat.thread', 'Thread')}</Text>
            {parentMessage ? <Text style={styles.headerSubtitle}>#{parentMessage.channel_slug || parentMessage.channel_name || 'channel'}</Text> : null}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Pinned Messages Banner */}
        {messages.filter((m: any) => m.is_pinned).length > 0 && (
          <TouchableOpacity 
            style={{ backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.15)', borderLeftWidth: 4, borderLeftColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            onPress={() => { /* maybe scroll to message or do nothing */ }}
          >
            <MaterialIcons name="push-pin" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600', marginBottom: 2 }}>
                {t('chat.pinned_message', 'Pinned Message')}
              </Text>
              <Text style={{ color: colors.text, fontSize: 14 }} numberOfLines={1}>
                {messages.filter((m: any) => m.is_pinned).slice(-1)[0].body}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <ScrollView 
          ref={scrollViewRef} 
          style={styles.canvas} 
          contentContainerStyle={styles.canvasContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {parentMessage ? (
            <View style={styles.originalMessageContainer}>
              <View style={styles.avatarContainer}>
                <Image 
                  source={{ uri: renderAvatar(parentMessage.author_name || 'User', parentMessage.avatar) }} 
                  style={styles.avatar} 
                />
              </View>
              <View style={styles.messageContent}>
                <View style={styles.messageMeta}>
                  <Text style={styles.authorName}>{parentMessage.author_name}</Text>
                  <Text style={styles.timeText}>
                    {new Date(parentMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.bubbleReceived}>
                  <Markdown style={{ body: { color: colors.text, fontSize: 15 }, paragraph: { marginTop: 2, marginBottom: 2 } }}>
                    {parentMessage.body}
                  </Markdown>
                </View>
                
                {/* Attachments for Parent */}
                {parentMessage.attachments && parentMessage.attachments.length > 0 ? (
                  <View style={{ marginTop: 8, gap: 8 }}>
                    {parentMessage.attachments.map((att: any) => {
                      const fileUrl = att.storage_key.startsWith('http') ? att.storage_key : `${API_BASE_URL.replace('/api', '')}/${att.storage_key}`;
                      const isImage = att.mime_type?.startsWith('image/');
                      return isImage ? (
                        <Image key={att.id} source={{ uri: fileUrl }} style={{ width: 200, height: 150, borderRadius: 12, backgroundColor: colors.pillBg }} resizeMode="cover" />
                      ) : (
                        <TouchableOpacity key={att.id} onPress={() => WebBrowser.openBrowserAsync(fileUrl)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.pillBg, padding: 8, borderRadius: 8 }}>
                           <MaterialIcons name="insert-drive-file" size={20} color={colors.primary} />
                           <Text style={{ color: colors.text, marginLeft: 8, flex: 1 }} numberOfLines={1}>{att.original_name || att.filename}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                <View style={styles.repliesCountContainer}>
                  <Text style={styles.repliesText}>{messages.length} {t('chat.replies', 'replies')}</Text>
                  <View style={styles.repliesLine} />
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.timelineContainer}>
            {messages.map((msg, idx) => {
              const prevMsg = messages[idx - 1];
              const msgDate = new Date(msg.created_at);
              const prevMsgDate = prevMsg ? new Date(prevMsg.created_at) : null;
              
              let showDateHeader = false;
              let dateHeaderText = '';

              if (!prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString()) {
                showDateHeader = true;
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (msgDate.toDateString() === today.toDateString()) {
                  dateHeaderText = t('common.today') || 'Today';
                } else if (msgDate.toDateString() === yesterday.toDateString()) {
                  dateHeaderText = t('common.yesterday') || 'Yesterday';
                } else {
                  dateHeaderText = msgDate.toLocaleDateString(i18n.language || 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                }
              }

              const isMe = msg.user_id === user?.id;
              const msgUser = users?.find((u: any) => u.id === msg.user_id) || {};
              const authorName = msg.author_name || msgUser.name || 'Unknown';
              
              if (isMe) {
                return (
                  <React.Fragment key={msg.id}>
                    {showDateHeader && (
                      <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 8, zIndex: 10 }}>
                        <View style={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                          <Text style={{ color: colors.iconDefault, fontSize: 12, fontWeight: '500' }}>{dateHeaderText}</Text>
                        </View>
                      </View>
                    )}
                    <TouchableOpacity style={styles.replyRowSent} onLongPress={() => openModal(msg)} delayLongPress={250} activeOpacity={0.7}>
                      <View style={styles.connectorLineSent} />
                      <View style={styles.messageContentSent}>
                        <View style={styles.messageMetaSent}>
                          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginRight: 4 }}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          {msg.is_pinned ? (
                            <MaterialIcons name="push-pin" size={12} color={'rgba(255,255,255,0.7)'} style={{ marginRight: 4 }} />
                          ) : null}
                        </View>
                        <View style={styles.bubbleSent}>
                          <Markdown style={{ body: { color: colors.onPrimary, fontSize: 15 }, paragraph: { marginTop: 2, marginBottom: 2 } }}>
                            {msg.body}
                          </Markdown>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <View style={{ marginTop: 8, gap: 8 }}>
                              {msg.attachments.map((att: any) => {
                                const fileUrl = att.storage_key.startsWith('http') ? att.storage_key : `${API_BASE_URL.replace('/api', '')}/${att.storage_key}`;
                                const isImage = att.mime_type?.startsWith('image/');
                                return isImage ? (
                                  <Image key={att.id} source={{ uri: fileUrl }} style={{ width: 200, height: 150, borderRadius: 12 }} resizeMode="cover" />
                                ) : (
                                  <TouchableOpacity key={att.id} onPress={() => WebBrowser.openBrowserAsync(fileUrl)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', padding: 8, borderRadius: 8 }}>
                                    <MaterialIcons name="insert-drive-file" size={20} color={'#fff'} />
                                    <Text style={{ color: '#fff', marginLeft: 8, flex: 1 }} numberOfLines={1}>{att.original_name || att.filename}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}
                          {renderReactions(msg.reactions)}
                        </View>
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={msg.id}>
                  {showDateHeader && (
                    <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 8, zIndex: 10 }}>
                      <View style={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: colors.iconDefault, fontSize: 12, fontWeight: '500' }}>{dateHeaderText}</Text>
                      </View>
                    </View>
                  )}
                  <TouchableOpacity style={styles.replyRow} onLongPress={() => openModal(msg)} delayLongPress={250} activeOpacity={0.7}>
                    <View style={styles.connectorLine} />
                    <Image 
                      source={{ uri: renderAvatar(authorName, msgUser.avatar) }} 
                      style={styles.replyAvatar} 
                    />
                    <View style={styles.messageContent}>
                      <View style={styles.messageMeta}>
                        <Text style={styles.authorName}>{authorName}</Text>
                        <Text style={styles.timeText}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {msg.is_pinned ? (
                          <MaterialIcons name="push-pin" size={12} color={colors.iconDefault} style={{ marginLeft: 4 }} />
                        ) : null}
                      </View>
                      <View style={styles.bubbleReceived}>
                        <Markdown style={{ body: { color: colors.text, fontSize: 15 }, paragraph: { marginTop: 2, marginBottom: 2 } }}>
                          {msg.body}
                        </Markdown>
                      </View>
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>

        {typingUsers.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ color: colors.iconDefault, fontSize: 12, fontStyle: 'italic', textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}>
                {typingUsers.join(', ')} {typingUsers.length > 1 ? t('chat.are_typing', 'are typing...') : t('chat.is_typing', 'is typing...')}
              </Text>
            </View>
          )}
          
        {/* Mentions Autocomplete List */}
        {showMentions && filteredMembers.length > 0 && (
          <View style={{ maxHeight: 150, backgroundColor: colors.surfaceContainerHigh, borderTopLeftRadius: 12, borderTopRightRadius: 12, marginHorizontal: 16, elevation: 4 }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredMembers.map((member: any) => {
                let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.username)}&background=1E293B&color=fff`;
                if (member.avatar) {
                  avatarUrl = member.avatar.startsWith('http') ? member.avatar : `${API_BASE_URL}${member.avatar}`;
                }
                return (
                  <TouchableOpacity 
                    key={member.id} 
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.reactionBorder }}
                    onPress={() => handleSelectMention(member)}
                  >
                    {member.special ? (
                      <View style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: colors.pillBg, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 12 }}>{member.initials}</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: avatarUrl }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />
                    )}
                    <View>
                      <Text style={{ color: colors.text, fontWeight: '500' }}>{member.name || member.username}</Text>
                      {member.fullname ? <Text style={{ color: colors.iconDefault, fontSize: 11 }}>{member.fullname}</Text> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Rich Composer */}
        {canPostInChannel ? (
          <View style={[styles.inputWrapper, (showMentions && filteredMembers.length > 0) ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : {}]}>
            {editingMessage && (
              <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 8 }}>
                <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="edit" size={16} color={colors.primary} />
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{t('chat.editing_message', 'Editing message')}</Text>
                </View>
                <TouchableOpacity onPress={() => { setEditingMessage(null); setBody(''); }}>
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
                placeholder={t('chat.reply_in_thread', 'Reply in thread...')}
                placeholderTextColor={colors.iconDefault}
                multiline
                value={body}
                onChangeText={handleTextChange}
                onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                onFocus={() => setShowEmojiPicker(false)}
              />
              
              <View style={styles.composerFooter}>
                <View style={styles.composerFooterLeft}>
                  { (user?.role === 'superadmin' || user?.permissions?.['upload']) && (
                    <TouchableOpacity style={styles.composerPlusBtn} onPress={pickAttachment}>
                      <MaterialIcons name="add" size={20} color={colors.iconDefault} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.composerActionBtn} onPress={() => setBody(prev => prev + '**bold** ')}>
                    <MaterialIcons name="format-bold" size={20} color={colors.iconDefault} />
                  </TouchableOpacity>
                  <TouchableOpacity style={{ padding: 8, borderRadius: 20 }} onPress={() => {
                    if (!showEmojiPicker) Keyboard.dismiss();
                    setShowEmojiPicker(!showEmojiPicker);
                  }}>
                    <MaterialIcons name="emoji-emotions" size={20} color={colors.iconDefault} />
                  </TouchableOpacity>
                  { (user?.role === 'superadmin' || user?.permissions?.['at-user']) && (
                    <TouchableOpacity style={styles.composerActionBtn} onPress={() => setBody(prev => prev + '@')}>
                      <MaterialIcons name="alternate-email" size={20} color={colors.iconDefault} />
                    </TouchableOpacity>
                  )}
                </View>
                
                <TouchableOpacity 
                  style={[styles.sendButton, !(body.trim() || attachment) && { backgroundColor: 'rgba(59, 167, 214, 0.2)' }]} 
                  onPress={handleSend}
                  disabled={!(body.trim() || attachment)}
                >
                  <MaterialIcons name="send" size={18} color={(body.trim() || attachment) ? colors.onPrimary : colors.iconDefault} style={[styles.sendIconFix, { transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.inputWrapper, { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }]}>
            <Text style={{ color: colors.iconDefault, fontSize: 14 }}>
              {isReadOnly ? 'This channel is read-only.' : 'You do not have permission to post.'}
            </Text>
          </View>
        )}

      </KeyboardAvoidingView>

        {/* Inline Emoji Picker */}
        {showEmojiPicker && (
          <View style={{ backgroundColor: colors.composerBg, height: 320, width: '100%', borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{t('chat.emojis') || 'Emojis'}</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)} style={{ backgroundColor: colors.pillBg, padding: 6, borderRadius: 20 }}>
                <MaterialIcons name="close" size={20} color={colors.iconDefault} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'].map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    style={{ width: '16.66%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => handleEmojiSelect(emoji)}
                  >
                    <Text style={{ fontSize: 28 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Long Press Bottom Sheet Modal */}
        <Modal visible={!!selectedMessage} transparent={true} animationType="fade" onRequestClose={closeModal}>
          <TouchableWithoutFeedback onPress={closeModal}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <Animated.View style={[{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }, { transform: [{ translateY: slideAnim }] }]}>
                  <View style={{ width: 40, height: 4, backgroundColor: colors.iconDefault, borderRadius: 2, alignSelf: 'center', marginBottom: 20, opacity: 0.3 }} />
                  
                  {/* Quick Reactions */}
                  {(user?.role === 'superadmin' || user?.permissions?.['react']) ? (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 12 }}>
                        {['👍', '❤️', '😂', '🎉', '👀'].map(emoji => (
                          <TouchableOpacity key={emoji} onPress={() => handleReact(selectedMessage.id, emoji)} style={{ backgroundColor: colors.surfaceContainer, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 24 }}>{emoji}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={{ height: 1, backgroundColor: colors.pillBg, marginBottom: 16 }} />
                    </>
                  ) : null}
                  
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={async () => { 
                    if (selectedMessage?.body) await Clipboard.setStringAsync(selectedMessage.body);
                    closeModal(); 
                  }}>
                    <MaterialIcons name="content-copy" size={24} color={colors.text} style={{ marginRight: 16 }} />
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{t('common.copy_text', 'Copy text')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={handleForwardPress}>
                    <MaterialIcons name="forward" size={24} color={colors.text} style={{ marginRight: 16 }} />
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{t('common.forward', 'Forward message')}</Text>
                  </TouchableOpacity>

                  {canPin && (
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={handleTogglePin}>
                      <MaterialIcons name="push-pin" size={24} color={colors.text} style={{ marginRight: 16 }} />
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{selectedMessage?.is_pinned ? t('chat.unpin_message', 'Unpin message') : t('chat.pin_message', 'Pin message')}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={handleToggleSave}>
                    <MaterialIcons name={selectedMessage?.is_saved ? "bookmark" : "bookmark-border"} size={24} color={colors.text} style={{ marginRight: 16 }} />
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{selectedMessage?.is_saved ? t('chat.unsave_message', 'Unsave message') : t('chat.save_message', 'Save message')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={() => { 
                        const msg = selectedMessage;
                        closeModal(); 
                        setTimeout(() => setActiveReadersMessage(msg), 300);
                      }}>
                        <MaterialIcons name="info-outline" size={24} color={colors.text} style={{ marginRight: 16 }} />
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{t('common.message_info', 'Message info')}</Text>
                  </TouchableOpacity>

                  {(selectedMessage?.user_id === user?.id || selectedMessage?.author_id === user?.id) ? (
                    <>
                      {((user?.role === 'superadmin' || user?.permissions?.['edit-own']) && (new Date().getTime() - new Date(selectedMessage.created_at + (selectedMessage.created_at.endsWith('Z') ? '' : 'Z')).getTime() < 15 * 60 * 1000)) ? (
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={handleEditPress}>
                          <MaterialIcons name="edit" size={24} color={colors.text} style={{ marginRight: 16 }} />
                          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{t('common.edit_message', 'Edit message')}</Text>
                        </TouchableOpacity>
                      ) : null}
                      {(user?.role === 'superadmin' || user?.permissions?.['delete-own'] || channelDetails?.membership?.can_delete_messages) ? (
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={handleDeletePress}>
                          <MaterialIcons name="delete-outline" size={24} color="#F43F5E" style={{ marginRight: 16 }} />
                          <Text style={{ color: '#F43F5E', fontSize: 16, fontWeight: '500' }}>{t('common.delete_message', 'Delete message')}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {(user?.role === 'superadmin' || channelDetails?.membership?.can_delete_messages) ? (
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={handleDeletePress}>
                          <MaterialIcons name="delete-outline" size={24} color="#F43F5E" style={{ marginRight: 16 }} />
                          <Text style={{ color: '#F43F5E', fontSize: 16, fontWeight: '500' }}>{t('common.delete_message', 'Delete message')}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  )}
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Readers Modal */}
        <Modal
          visible={!!activeReadersMessage}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setActiveReadersMessage(null)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.background, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: '100%', maxHeight: '70%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="done-all" size={24} color={colors.primary} />
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{t('chat.read_by', 'Read by')}</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveReadersMessage(null)} style={{ backgroundColor: colors.pillBg, padding: 6, borderRadius: 20 }}>
                  <MaterialIcons name="close" size={20} color={colors.iconDefault} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {(activeReadersMessage?.readers && activeReadersMessage.readers.length > 0) ? (
                  activeReadersMessage.readers.map((reader: any) => {
                    let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(reader.name || reader.username || '?')}&background=1E293B&color=fff`;
                    if (reader.avatar) {
                      avatarUrl = reader.avatar.startsWith('http') ? reader.avatar : `${API_BASE_URL}${reader.avatar}`;
                    }
                    return (
                      <View key={reader.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.pillBg }}>
                        <Image source={{ uri: avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 16 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{reader.name || reader.username}</Text>
                        </View>
                        <MaterialIcons name="check-circle" size={16} color={colors.primary} />
                      </View>
                    );
                  })
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <MaterialIcons name="visibility-off" size={48} color={colors.iconDefault} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <Text style={{ color: colors.iconDefault, fontSize: 16, textAlign: 'center' }}>{t('chat.no_readers_yet', 'No one has read this message yet.')}</Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                onPress={() => setActiveReadersMessage(null)}
                style={{ marginTop: 24, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ color: colors.onPrimary, fontWeight: '600', fontSize: 16 }}>{t('common.close', 'Done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ForwardModal visible={!!forwardMessage} onClose={() => setForwardMessage(null)} message={forwardMessage} />

    </SafeAreaView>
  );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: insets?.top || 0, height: 64 + (insets?.top || 0),
    backgroundColor: 'rgba(5, 20, 36, 0.9)', zIndex: 10,
  },
  iconButton: { padding: 8, borderRadius: 20 },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  headerSubtitle: { fontSize: 11, color: colors.textDim, marginTop: 2 },
  canvas: { flex: 1 },
  canvasContent: { padding: 16, paddingTop: 24, paddingBottom: 40 },
  originalMessageContainer: { flexDirection: 'row', marginBottom: 24 },
  avatarContainer: { marginRight: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  messageContent: { flex: 1 },
  messageMeta: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  authorName: { fontSize: 12, fontWeight: '600', color: colors.text, marginRight: 8 },
  timeText: { fontSize: 11, color: colors.textDim },
  bubbleReceived: {
    backgroundColor: colors.surfaceContainer, padding: 12,
    borderTopRightRadius: 16, borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16, borderTopLeftRadius: 0,
    borderWidth: 1, borderColor: colors.border,
  },
  repliesCountContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  repliesText: { fontSize: 11, color: colors.primary, marginRight: 8 },
  repliesLine: { flex: 1, height: 1, backgroundColor: 'rgba(118, 209, 255, 0.3)' },
  timelineContainer: {
    marginLeft: 20, paddingLeft: 16, borderLeftWidth: 2,
    borderLeftColor: 'rgba(118, 209, 255, 0.3)', gap: 16,
  },
  replyRow: { flexDirection: 'row', position: 'relative' },
  connectorLine: { position: 'absolute', left: -32, top: 16, width: 16, height: 2, backgroundColor: 'rgba(118, 209, 255, 0.3)' },
  replyAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
  replyRowSent: { flexDirection: 'row', justifyContent: 'flex-end', position: 'relative' },
  connectorLineSent: { position: 'absolute', left: -32, top: 16, width: 16, height: 2, backgroundColor: 'rgba(118, 209, 255, 0.3)' },
  messageContentSent: { flex: 1, alignItems: 'flex-end' },
  messageMetaSent: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  bubbleSent: {
    backgroundColor: colors.primary, padding: 12,
    borderTopLeftRadius: 16, borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16, borderTopRightRadius: 0,
    maxWidth: '90%', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  inputWrapper: {
    backgroundColor: colors.background,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  composerContainer: {
    backgroundColor: colors.composerBg || colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.composerBorder || colors.border,
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
    backgroundColor: colors.pillBg || 'rgba(255,255,255,0.1)',
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
    backgroundColor: colors.pillBg || 'rgba(255,255,255,0.1)',
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
  }
});
