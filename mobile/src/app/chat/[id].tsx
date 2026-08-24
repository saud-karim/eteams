import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, Modal, TouchableWithoutFeedback, Animated, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useSocket } from '../../context/SocketContext';
import { api, API_BASE_URL } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-native-markdown-display';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ForwardModal from '../../components/ForwardModal';
import MemberPermissionsModal from '../../components/MemberPermissionsModal';
import AddMemberModal from '../../components/AddMemberModal';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);
  const { t, i18n } = useTranslation();
  
  const { user } = useAuth();
  const { channels, users, setChannels, refreshWorkspace } = useWorkspace();
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
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [channelDetails, setChannelDetails] = useState<any>(null);
  
  // Mentions State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  
  // Typing Indicator State
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Modal State
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showReadersModal, setShowReadersModal] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<any>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'files' | 'pinned'>('members');
  const [selectedMemberForPerms, setSelectedMemberForPerms] = useState<any>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [viewedImage, setViewedImage] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<any>(null);
  const [highlightedMessage, setHighlightedMessage] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  const swipeableRefs = useRef<{ [key: string]: any }>({});
  const messageLayouts = useRef<{ [key: string]: number }>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToMessage = (msgId: string) => {
    const yOffset = messageLayouts.current[msgId];
    if (yOffset !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: yOffset, animated: true });
      setHighlightedMessage(msgId);
      setTimeout(() => setHighlightedMessage(null), 2000);
    }
  };

  useEffect(() => {
    if (!channelObj?.id) return;
    
    setLoading(true);
    
    // Mark channel as read
    api.channels.markRead(channelObj.id).catch(console.error);
    if (channelObj.unread_count > 0 && setChannels) {
      setChannels((prev: any[]) => prev.map(c => c.id === channelObj.id ? { ...c, unread_count: 0 } : c));
    }

    const cacheKey = `messages_${channelObj.id}`;
    
    // Load cached messages first
    AsyncStorage.getItem(cacheKey).then(cached => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.length > 0) {
            setMessages(parsed);
            setLoading(false); // UI will show cached messages immediately
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
          }
        } catch (e) {
          console.error('Error parsing cached messages', e);
        }
      }
    });

    api.messages.list(channelObj.id)
      .then((res: any) => {
        const msgs = res.messages || [];
        setMessages(msgs);
        
        // Cache the fresh messages
        AsyncStorage.setItem(cacheKey, JSON.stringify(msgs)).catch(console.error);

        if (msgs.length < 50) setHasMore(false);
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

    api.channels.get(channelObj.slug)
      .then((res: any) => {
        if (res.members) {
          setChannelDetails(res);
        }
      })
      .catch((err: any) => {
        if (!err.message?.includes('404')) {
          console.error(err);
        }
      });
  }, [channelObj?.id]);

  useEffect(() => {
    if (!socket || !channelObj?.id) return;
    
    socket.emit('channel:join', { channelId: channelObj.id });

    const handleNewMessage = (msg: any) => {
      // Do not append thread replies to the main channel chat
      if (msg.parent_id) return;
      
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      // If new message is from someone else, mark it as read immediately (we're active in chat)
      if (msg.user_id !== user?.id) {
        api.messages.markRead([msg.id]).catch(console.error);
        if (setChannels) {
          setChannels((prev: any[]) => prev.map(c => c.id === channelObj.id ? { ...c, unread_count: 0 } : c));
        }
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

    const handleTypingStart = (data: any) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => {
          if (!prev.includes(data.name)) return [...prev, data.name];
          return prev;
        });
        
        // Auto clear after 5s if stop event is missed
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers(prev => prev.filter(name => name !== data.name));
        }, 5000);
      }
    };

    const handleTypingStop = (data: any) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => prev.filter(name => name !== data.name));
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:reactions', handleReaction);
    socket.on('message:updated', handleUpdatedMessage);
    socket.on('message:deleted', handleDeletedMessage);
    socket.on('message:read_receipt', handleReadReceipt);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:reactions', handleReaction);
      socket.off('message:updated', handleUpdatedMessage);
      socket.off('message:deleted', handleDeletedMessage);
      socket.off('message:read_receipt', handleReadReceipt);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
    };
  }, [socket, channelObj?.id]);

  const fetchOlderMessages = async () => {
    if (!channelObj?.id || messages.length === 0 || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    const oldestMessage = messages[0];
    
    try {
      const res = await api.messages.list(channelObj.id, oldestMessage.created_at, 50);
      const olderMsgs = res.messages || [];
      if (olderMsgs.length < 50) setHasMore(false);
      
      if (olderMsgs.length > 0) {
        setMessages(prev => [...olderMsgs, ...prev]);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load older messages', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    // When user scrolls to top of ScrollView (y <= 50)
    if (contentOffset.y <= 50 && !loadingOlder && hasMore) {
      fetchOlderMessages();
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    
    // Typing indicator
    if (socket && channelObj?.id) {
      socket.emit('typing:start', { channelId: channelObj.id });
      if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
      myTypingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { channelId: channelObj.id });
      }, 2000);
    }
    
    // Mention Detection
    const words = text.split(' ');
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith('@') && (user?.role === 'superadmin' || user?.permissions?.['at-user'])) {
      const query = lastWord.substring(1).toLowerCase();
      setMentionQuery(query);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertText = (text: string) => {
    const before = inputText.substring(0, selection.start);
    const after = inputText.substring(selection.end);
    const newText = before + text + after;
    setInputText(newText);
    
    // Trigger handleTextChange so mentions or typing indicator work
    handleTextChange(newText);
  };

  const handleBold = () => {
    if (selection.start !== selection.end) {
      const selected = inputText.substring(selection.start, selection.end);
      const before = inputText.substring(0, selection.start);
      const after = inputText.substring(selection.end);
      setInputText(before + `**${selected}**` + after);
    } else {
      insertText('**bold** ');
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    insertText(emoji);
  };

  const handleSelectMention = (member: any) => {
    const words = inputText.split(' ');
    words.pop(); // remove the partial mention
    const newText = [...words, `@${member.name || member.username} `].join(' ');
    setInputText(newText);
    setShowMentions(false);
  };

  const filteredMembers = showMentions && channelDetails?.members ? channelDetails.members.filter((m: any) => 
    (m.name || '').toLowerCase().includes(mentionQuery) || (m.username || '').toLowerCase().includes(mentionQuery)
  ) : [];

  const handleSend = async () => {
    if ((!inputText.trim() && !attachment) || !channelObj?.id) return;
    
    const body = inputText.trim();
    const attach = attachment;
    const isEdit = !!editingMessage;
    const editId = editingMessage?.id;
    
    setInputText('');
    setAttachment(null);
    setEditingMessage(null);
    const replyToId = replyingToMessage?.id || null;
    setReplyingToMessage(null);
    
    // Stop typing
    if (socket && channelObj?.id) {
      socket.emit('typing:stop', { channelId: channelObj.id });
    }
    if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
    
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
          attach.name || 'attachment',
          replyToId
        );
      } else {
        await api.messages.send(channelObj.id, body, null, replyToId);
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

  const handleForwardPress = () => {
    if (!selectedMessage) return;
    setForwardMessage(selectedMessage);
    closeModal();
  };

  const handleTogglePin = async () => {
    if (!selectedMessage) return;
    try {
      const isCurrentlyPinned = selectedMessage.is_pinned;
      const res = await api.messages.togglePin(selectedMessage.id, !isCurrentlyPinned);
      setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, is_pinned: res.pinned } : m));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to pin/unpin message');
    } finally {
      closeModal();
    }
  };

  const handleToggleSave = async () => {
    if (!selectedMessage) return;
    try {
      const isCurrentlySaved = selectedMessage.is_saved;
      const res = await api.messages.toggleSave(selectedMessage.id, !isCurrentlySaved);
      setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, is_saved: res.saved ? 1 : 0 } : m));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to save/unsave message');
    } finally {
      closeModal();
    }
  };

  const handleRemoveMember = (memberId: string | number, memberName: string) => {
    Alert.alert(
      t('common.confirm', 'Confirm'),
      `Remove ${memberName} from #${channelObj?.name}?`,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.remove', 'Remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.channels.removeMember(channelObj.id, memberId);
              if (channelDetails) {
                setChannelDetails({
                  ...channelDetails,
                  members: channelDetails.members.filter((m: any) => m.id !== memberId)
                });
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  const handleDeleteChannel = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to DELETE this channel for everyone?`)) {
        api.channels.delete(channelObj.id).then(() => {
          setShowChannelInfo(false);
          refreshWorkspace();
          router.replace('/(tabs)');
        }).catch((err: any) => {
          window.alert(err.message || 'Failed to delete channel');
        });
      }
      return;
    }

    Alert.alert(
      t('common.confirm', 'Confirm'),
      `Are you sure you want to DELETE this channel for everyone?`,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.channels.delete(channelObj.id);
              setShowChannelInfo(false);
              refreshWorkspace();
              router.replace('/(tabs)');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete channel');
            }
          }
        }
      ]
    );
  };

  const handleLeaveChannel = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to leave #${channelObj?.name}?`)) {
        api.channels.leave(channelObj.id).then(() => {
          setShowChannelInfo(false);
          refreshWorkspace();
          router.replace('/(tabs)');
        }).catch((err: any) => {
          window.alert(err.message || 'Failed to leave channel');
        });
      }
      return;
    }

    Alert.alert(
      t('common.confirm', 'Confirm'),
      `Are you sure you want to leave #${channelObj?.name}?`,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.leave', 'Leave'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.channels.leave(channelObj.id);
              setShowChannelInfo(false);
              refreshWorkspace();
              router.replace('/(tabs)');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to leave channel');
            }
          }
        }
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
          
          <TouchableOpacity style={styles.headerTitlePill} onPress={() => setShowChannelInfo(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.headerName}>
                {(channelObj?.type === 'dm' || channelObj?.type === 'group_dm' || channelObj?.type === 'direct') ? displayName : `#${channelObj?.name}`}
              </Text>
              {(channelObj?.type === 'dm' || channelObj?.type === 'group_dm' || channelObj?.type === 'direct') && (
                <MaterialIcons name="chevron-right" size={20} color={colors.text} />
              )}
            </View>
            {channelObj?.type !== 'dm' && channelObj?.type !== 'direct' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.headerMembers}>{channelDetails?.members?.length || channelObj?.member_count || 0} members</Text>
                <MaterialIcons name="chevron-right" size={14} color={colors.iconDefault} />
              </View>
            ) : null}
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
          </View>
        </View>

        {/* Pinned Messages Banner */}
        {messages.filter(m => m.is_pinned).length > 0 && (
          <TouchableOpacity 
            style={{ backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.15)', borderLeftWidth: 4, borderLeftColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            onPress={() => { setShowChannelInfo(true); setActiveTab('pinned'); }}
          >
            <MaterialIcons name="push-pin" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600', marginBottom: 2 }}>
                {t('chat.pinned_message', 'Pinned Message')}
              </Text>
              <Text style={{ color: colors.text, fontSize: 14 }} numberOfLines={1}>
                {messages.filter(m => m.is_pinned).slice(-1)[0].body}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Chat Canvas */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatCanvas} 
          contentContainerStyle={styles.chatContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {loading ? (
            <Text style={{ color: '#94A3B8', textAlign: 'center', margin: 20 }}>{t('common.loading')}</Text>
          ) : messages.length === 0 ? (
            <Text style={{ color: '#94A3B8', textAlign: 'center', margin: 20 }}>This is the beginning of the chat.</Text>
          ) : (
            <>
              {loadingOlder && (
                <View style={{ padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>Loading older messages...</Text>
                </View>
              )}
              {messages.map((msg, idx) => {
              const prevMsg = messages[idx - 1];
              const showHeader = !prevMsg || prevMsg.user_id !== msg.user_id || (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000);
              
              const msgUser = users?.find((u: any) => u.id === msg.user_id);
              const authorName = msg.author_name || msgUser?.name || msgUser?.username || 'Unknown';
              const isMe = msg.user_id === user?.id || msg.author_id === user?.id;
              
              let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=1E293B&color=fff`;
              if (msgUser?.avatar) {
                avatarUrl = msgUser.avatar.startsWith('http') ? msgUser.avatar : `${API_BASE_URL}${msgUser.avatar}`;
              }

              const renderLeftActions = (progress: any, dragX: any) => {
                const trans = dragX.interpolate({
                  inputRange: [0, 50, 100, 101],
                  outputRange: [-20, 0, 0, 1],
                });
                return (
                  <Animated.View
                    style={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: 50,
                      transform: [{ translateX: trans }],
                    }}
                  >
                    <MaterialIcons name="reply" size={24} color={colors.primary} />
                  </Animated.View>
                );
              };

              return (
                <View 
                  key={msg.id} 
                  onLayout={(e) => {
                    messageLayouts.current[msg.id] = e.nativeEvent.layout.y;
                  }}
                  style={highlightedMessage === msg.id ? { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' } : {}}
                >
                <Swipeable
                  ref={ref => {
                    if (ref) swipeableRefs.current[msg.id] = ref;
                  }}
                  renderLeftActions={renderLeftActions}
                  onSwipeableWillOpen={() => {
                    setReplyingToMessage(msg);
                    swipeableRefs.current[msg.id]?.close();
                  }}
                  friction={2}
                >
                  <TouchableOpacity 
                    style={[
                      styles.messageRow, 
                      !showHeader && styles.messageRowCompact,
                      { justifyContent: isMe ? 'flex-end' : 'flex-start' }
                    ]}
                    onLongPress={() => openModal(msg)}
                    delayLongPress={250}
                    activeOpacity={0.7}
                  >
                    {!isMe && (
                      <View style={styles.messageAvatarContainer}>
                        {showHeader ? (
                          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        ) : (
                          <View style={styles.avatarPlaceholder} />
                        )}
                      </View>
                    )}
                    
                    <View style={[styles.messageContent, isMe ? { alignItems: 'flex-end', marginLeft: 40 } : { alignItems: 'flex-start', marginRight: 40 }]}>
                      {!isMe && showHeader && (
                        <View style={styles.messageHeader}>
                          <Text style={styles.messageAuthor}>{authorName}</Text>
                        </View>
                      )}
                      
                      <View style={[
                        styles.chatBubble,
                        isMe ? styles.chatBubbleSent : styles.chatBubbleReceived,
                        !showHeader && (isMe ? { borderTopRightRadius: 4 } : { borderTopLeftRadius: 4 })
                      ]}>
                        {msg.reply_to_id && (
                          <TouchableOpacity 
                            onPress={() => scrollToMessage(msg.reply_to_id)}
                            style={{
                              backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                              padding: 6,
                              borderRadius: 4,
                              marginBottom: 4,
                              borderLeftWidth: 3,
                              borderLeftColor: isMe ? '#fff' : colors.primary
                            }}
                          >
                            <Text style={{ color: isMe ? '#fff' : colors.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>
                              {msg.reply_to_author_name || t('chat.user', 'User')}
                            </Text>
                            <Text style={{ color: isMe ? 'rgba(255,255,255,0.9)' : colors.text, fontSize: 13 }} numberOfLines={2}>
                              {msg.reply_to_body || t('chat.attachment', 'Attachment')}
                            </Text>
                          </TouchableOpacity>
                        )}
                        {msg.body ? (
                          <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <View style={{ flexShrink: 1 }}>
                              <Markdown
                                style={{
                                  body: { 
                                    color: isMe ? colors.onPrimary : colors.text, 
                                    fontSize: 15, 
                                    textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' 
                                  },
                                  paragraph: { marginTop: 2, marginBottom: 2 },
                                  link: { color: isMe ? '#e0f7fa' : colors.primary },
                                }}
                              >
                                {msg.body}
                              </Markdown>
                            </View>
                            
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, marginTop: 4 }}>
                              {(msg.is_edited || msg.edited_at) && (
                                <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.7)' : colors.iconDefault, marginRight: 4 }}>
                                  ({t('chat.edited', 'edited')})
                                </Text>
                              )}
                              
                              <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.7)' : colors.iconDefault, marginRight: 4 }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>

                              {msg.is_pinned ? (
                                <MaterialIcons name="push-pin" size={12} color={isMe ? 'rgba(255,255,255,0.7)' : colors.iconDefault} style={{ marginRight: 4 }} />
                              ) : null}

                              {isMe && (
                                <MaterialIcons 
                                  name="done-all" 
                                  size={14} 
                                  color={(msg.readers && msg.readers.length > 0) ? '#4ade80' : 'rgba(255,255,255,0.7)'} 
                                />
                              )}
                            </View>
                          </View>
                        ) : null}

                        {msg.attachments && msg.attachments.length > 0 && (
                          <View style={{ marginTop: 8, gap: 8 }}>
                            {msg.attachments.map((att: any) => {
                              const fileUrl = att.storage_key.startsWith('http') ? att.storage_key : `${API_BASE_URL.replace('/api', '')}/${att.storage_key}`;
                              const isImage = att.mime_type?.startsWith('image/');
                              return isImage ? (
                                <TouchableOpacity key={att.id} onPress={() => setViewedImage(fileUrl)}>
                                  <Image source={{ uri: fileUrl }} style={{ width: 250, height: 180, borderRadius: 12, backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : colors.pillBg }} resizeMode="cover" />
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity 
                                  key={att.id} 
                                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : colors.pillBg, padding: 12, borderRadius: 8, maxWidth: 250 }}
                                  onPress={() => WebBrowser.openBrowserAsync(fileUrl)}
                                >
                                  <MaterialIcons name="insert-drive-file" size={24} color={isMe ? '#fff' : colors.primary} />
                                  <View style={{ marginLeft: 8, flex: 1 }}>
                                    <Text style={{ color: isMe ? '#fff' : colors.text, fontWeight: '500' }} numberOfLines={1} ellipsizeMode="middle">{att.original_name || att.filename}</Text>
                                    <Text style={{ color: isMe ? 'rgba(255,255,255,0.7)' : colors.iconDefault, fontSize: 11 }}>{(att.size_bytes / 1024).toFixed(1)} KB</Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                        
                        {renderReactions(msg.reactions)}
                      </View>
                    </View>
                  </TouchableOpacity>
                </Swipeable>
                </View>
              );
            })}
            </>
          )}
          
          {typingUsers.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ color: colors.iconDefault, fontSize: 12, fontStyle: 'italic', textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}>
                {typingUsers.join(', ')} {typingUsers.length > 1 ? t('chat.are_typing', 'are typing...') : t('chat.is_typing', 'is typing...')}
              </Text>
            </View>
          )}
        </ScrollView>
        
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
                    <Image source={{ uri: avatarUrl }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />
                    <Text style={{ color: colors.text, fontWeight: '500' }}>{member.name || member.username}</Text>
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
              <View style={styles.editingBanner}>
                <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="edit" size={16} color={colors.primary} />
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{t('chat.editing_message', 'Editing message')}</Text>
                </View>
                <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
                  <MaterialIcons name="close" size={18} color={colors.iconDefault} />
                </TouchableOpacity>
              </View>
            )}
            {replyingToMessage && !editingMessage && (
              <View style={styles.editingBanner}>
                <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <MaterialIcons name="reply" size={16} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{replyingToMessage.author_name || t('chat.user', 'User')}</Text>
                    <Text style={{ color: colors.text, fontSize: 12 }} numberOfLines={1}>{replyingToMessage.body || t('chat.attachment', 'Attachment')}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setReplyingToMessage(null)}>
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
                onChangeText={handleTextChange}
                onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
              />
              
              <View style={styles.composerFooter}>
                <View style={styles.composerFooterLeft}>
                  { (isSuperadmin || user?.permissions?.['upload']) && (
                    <TouchableOpacity style={styles.composerPlusBtn} onPress={pickAttachment}>
                      <MaterialIcons name="add" size={20} color={colors.iconDefault} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.composerActionBtn} onPress={handleBold}>
                    <MaterialIcons name="format-bold" size={20} color={colors.iconDefault} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.composerActionBtn} onPress={() => setShowEmojiPicker(true)}>
                    <MaterialIcons name="emoji-emotions" size={20} color={colors.iconDefault} />
                  </TouchableOpacity>
                  { (isSuperadmin || user?.permissions?.['at-user']) && (
                    <TouchableOpacity style={styles.composerActionBtn} onPress={() => insertText('@')}>
                      <MaterialIcons name="alternate-email" size={20} color={colors.iconDefault} />
                    </TouchableOpacity>
                  )}
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
        ) : (
          <View style={[styles.inputWrapper, { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }]}>
            <Text style={{ color: colors.iconDefault, fontSize: 14 }}>
              {isReadOnly ? 'This channel is read-only.' : 'You do not have permission to post.'}
            </Text>
          </View>
        )}

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
                  
                  <TouchableOpacity style={styles.sheetOption} onPress={async () => { 
                    if (selectedMessage?.body) {
                      await Clipboard.setStringAsync(selectedMessage.body);
                    }
                    closeModal(); 
                  }}>
                    <MaterialIcons name="content-copy" size={24} color={colors.text} style={styles.sheetOptionIcon} />
                    <Text style={styles.sheetOptionText}>{t('common.copy_text', 'Copy text')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.sheetOption} onPress={handleForwardPress}>
                    <MaterialIcons name="forward" size={24} color={colors.text} style={styles.sheetOptionIcon} />
                    <Text style={styles.sheetOptionText}>{t('common.forward', 'Forward message')}</Text>
                  </TouchableOpacity>

                  {canPin && (
                    <TouchableOpacity style={styles.sheetOption} onPress={handleTogglePin}>
                      <MaterialIcons name="push-pin" size={24} color={colors.text} style={styles.sheetOptionIcon} />
                      <Text style={styles.sheetOptionText}>{selectedMessage?.is_pinned ? t('chat.unpin_message', 'Unpin message') : t('chat.pin_message', 'Pin message')}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.sheetOption} onPress={handleToggleSave}>
                    <MaterialIcons name={selectedMessage?.is_saved ? "bookmark" : "bookmark-border"} size={24} color={colors.text} style={styles.sheetOptionIcon} />
                    <Text style={styles.sheetOptionText}>{selectedMessage?.is_saved ? t('chat.unsave_message', 'Unsave message') : t('chat.save_message', 'Save message')}</Text>
                  </TouchableOpacity>

                  {(selectedMessage?.user_id === user?.id || selectedMessage?.author_id === user?.id) && (
                    <>
                      <TouchableOpacity style={styles.sheetOption} onPress={handleEditPress}>
                        <MaterialIcons name="edit" size={24} color={colors.text} style={styles.sheetOptionIcon} />
                        <Text style={styles.sheetOptionText}>{t('common.edit_message', 'Edit message')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.sheetOption} onPress={() => { setShowReadersModal(true); }}>
                        <MaterialIcons name="info-outline" size={24} color={colors.text} style={styles.sheetOptionIcon} />
                        <Text style={styles.sheetOptionText}>{t('common.message_info', 'Message info')}</Text>
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

        {/* Readers Modal */}
        <Modal
          visible={showReadersModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowReadersModal(false)}
        >
          <View style={[styles.modalOverlay, { justifyContent: 'flex-end', margin: 0, padding: 0 }]}>
            <View style={{ backgroundColor: colors.background, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: '100%', maxHeight: '70%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="done-all" size={24} color={colors.primary} />
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{t('chat.read_by', 'Read by')}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowReadersModal(false)} style={{ backgroundColor: colors.pillBg, padding: 6, borderRadius: 20 }}>
                  <MaterialIcons name="close" size={20} color={colors.iconDefault} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {(selectedMessage?.readers && selectedMessage.readers.length > 0) ? (
                  selectedMessage.readers.map((reader: any) => {
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
                onPress={() => setShowReadersModal(false)} 
                style={{ marginTop: 24, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ color: colors.onPrimary, fontWeight: '600', fontSize: 16 }}>{t('common.close', 'Done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Channel Info Modal */}
        <Modal
          visible={showChannelInfo}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowChannelInfo(false)}
        >
          <View style={[styles.modalOverlay, { justifyContent: 'flex-end', margin: 0, padding: 0 }]}>
            <View style={{ backgroundColor: colors.background, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: '100%', maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="info-outline" size={24} color={colors.primary} />
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Channel Info</Text>
                </View>
                <TouchableOpacity onPress={() => setShowChannelInfo(false)} style={{ backgroundColor: colors.pillBg, padding: 6, borderRadius: 20 }}>
                  <MaterialIcons name="close" size={20} color={colors.iconDefault} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>
                    {(channelObj?.type === 'dm' || channelObj?.type === 'group_dm' || channelObj?.type === 'direct') ? displayName : `#${channelObj?.name}`}
                  </Text>
                  {!!channelObj?.description && (
                    <Text style={{ color: colors.iconDefault, fontSize: 14 }}>{channelObj.description}</Text>
                  )}
                </View>

              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.pillBg, marginBottom: 16 }}>
                <TouchableOpacity onPress={() => setActiveTab('members')} style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: activeTab === 'members' ? colors.primary : 'transparent', alignItems: 'center' }}>
                  <Text style={{ color: activeTab === 'members' ? colors.text : colors.iconDefault, fontWeight: '600' }}>Members</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('files')} style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: activeTab === 'files' ? colors.primary : 'transparent', alignItems: 'center' }}>
                  <Text style={{ color: activeTab === 'files' ? colors.text : colors.iconDefault, fontWeight: '600' }}>Files</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('pinned')} style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: activeTab === 'pinned' ? colors.primary : 'transparent', alignItems: 'center' }}>
                  <Text style={{ color: activeTab === 'pinned' ? colors.text : colors.iconDefault, fontWeight: '600' }}>Pinned</Text>
                </TouchableOpacity>
              </View>

              {activeTab === 'members' && (
                <View style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                      Members ({channelDetails?.members?.length || 0})
                    </Text>
                    
                    {(user?.role === 'superadmin' || user?.permissions?.['is_manager'] || user?.permissions?.['can_add_members']) && (
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                        onPress={() => setShowAddMemberModal(true)}
                      >
                        <MaterialIcons name="person-add" size={16} color={colors.onPrimary} style={{ marginRight: 4 }} />
                        <Text style={{ color: colors.onPrimary, fontSize: 13, fontWeight: '600' }}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {channelDetails?.members && channelDetails.members.length > 0 && channelDetails.members.map((member: any) => {
                      let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.username || '?')}&background=1E293B&color=fff`;
                      if (member.avatar) {
                        avatarUrl = member.avatar.startsWith('http') ? member.avatar : `${API_BASE_URL}${member.avatar}`;
                      }
                      
                      const canManage = user?.role === 'superadmin' || user?.permissions?.['is_manager'];

                      return (
                        <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.pillBg }}>
                          <Image source={{ uri: avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{member.name || member.username}</Text>
                            {member.is_manager && <Text style={{ color: colors.primary, fontSize: 12 }}>Manager</Text>}
                          </View>
                          {canManage && (
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <TouchableOpacity onPress={() => setSelectedMemberForPerms(member)} style={{ padding: 6, backgroundColor: colors.surfaceContainer, borderRadius: 6 }}>
                                <MaterialIcons name="settings" size={18} color={colors.iconDefault} />
                              </TouchableOpacity>
                              {member.id !== user?.id && (
                                <TouchableOpacity onPress={() => handleRemoveMember(member.id, member.name || member.username)} style={{ padding: 6, backgroundColor: 'rgba(244,63,94,0.1)', borderRadius: 6 }}>
                                  <MaterialIcons name="person-remove" size={18} color="#F43F5E" />
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {activeTab === 'files' && (
                  <View style={{ marginBottom: 24 }}>
                    {messages.filter(m => m.attachments && m.attachments.length > 0).length === 0 ? (
                      <Text style={{ color: colors.iconDefault, textAlign: 'center', marginTop: 20 }}>No files shared yet.</Text>
                    ) : (
                      messages.filter(m => m.attachments && m.attachments.length > 0).map((msg) => (
                        <View key={msg.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.pillBg }}>
                          {msg.attachments.map((att: any, idx: number) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              <MaterialIcons name="insert-drive-file" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontSize: 14 }}>{att.filename || 'File'}</Text>
                                <Text style={{ color: colors.iconDefault, fontSize: 12 }}>From {msg.author_name}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      ))
                    )}
                  </View>
                )}

                {activeTab === 'pinned' && (
                  <View style={{ marginBottom: 24 }}>
                    {messages.filter(m => m.is_pinned).length === 0 ? (
                      <Text style={{ color: colors.iconDefault, textAlign: 'center', marginTop: 20 }}>No pinned messages.</Text>
                    ) : (
                      messages.filter(m => m.is_pinned).map((msg) => (
                        <View key={msg.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.pillBg }}>
                          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{msg.author_name}</Text>
                          <Text style={{ color: colors.textDim, fontSize: 13, marginTop: 4 }}>{msg.body}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {channelObj?.type !== 'announcement' && (
                  <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.pillBg }}>
                    {(user?.id === channelObj?.created_by || user?.role === 'superadmin' || channelObj?.type === 'dm' || channelObj?.type === 'group_dm') && (
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingVertical: 12, borderRadius: 8, marginBottom: 12 }}
                        onPress={handleDeleteChannel}
                      >
                        <MaterialIcons name="delete" size={20} color="#F43F5E" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#F43F5E', fontSize: 15, fontWeight: '600' }}>Delete Channel</Text>
                      </TouchableOpacity>
                    )}
                    {channelObj?.type !== 'dm' && channelObj?.type !== 'group_dm' && (
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingVertical: 12, borderRadius: 8 }}
                        onPress={handleLeaveChannel}
                      >
                        <MaterialIcons name="logout" size={20} color="#F43F5E" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#F43F5E', fontSize: 15, fontWeight: '600' }}>Leave Channel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Emoji Picker Modal */}
        <Modal
          visible={showEmojiPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEmojiPicker(false)}
        >
          <View style={[styles.modalOverlay, { justifyContent: 'flex-end', margin: 0, padding: 0 }]}>
            <View style={{ backgroundColor: colors.composerBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: '100%', height: 450, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 }}>
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{t('chat.emojis') || 'Emojis'}</Text>
                <TouchableOpacity onPress={() => setShowEmojiPicker(false)} style={{ backgroundColor: colors.pillBg, padding: 6, borderRadius: 20 }}>
                  <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.iconDefault} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  {['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','☺️','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'].map(emoji => (
                    <TouchableOpacity 
                      key={emoji} 
                      style={{ width: '16.66%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => handleEmojiSelect(emoji)}
                    >
                      <Text style={{ fontSize: 32 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <ForwardModal visible={!!forwardMessage} onClose={() => setForwardMessage(null)} message={forwardMessage} />
        <MemberPermissionsModal 
          visible={!!selectedMemberForPerms} 
          onClose={() => setSelectedMemberForPerms(null)} 
          channelId={channelObj?.id} 
          member={selectedMemberForPerms} 
          onPermissionsUpdated={(memberId, perms) => {
            if (channelDetails?.members) {
              setChannelDetails({
                ...channelDetails,
                members: channelDetails.members.map((m: any) => m.id === memberId ? { ...m, ...perms } : m)
              });
            }
          }}
        />

        <AddMemberModal
          visible={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          channelId={channelObj?.id}
          currentMembers={channelDetails?.members || []}
          onMemberAdded={(newUser) => {
            if (channelDetails) {
              setChannelDetails({
                ...channelDetails,
                members: [...(channelDetails.members || []), newUser]
              });
            }
            setShowAddMemberModal(false);
          }}
        />

        <Modal
          visible={!!viewedImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setViewedImage(null)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity 
              style={{ position: 'absolute', top: 40 + (insets?.top || 0), right: 20, zIndex: 10, padding: 8 }} 
              onPress={() => setViewedImage(null)}
            >
              <MaterialIcons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            {viewedImage && (
              <Image source={{ uri: viewedImage }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            )}
          </View>
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
  chatBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  chatBubbleSent: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  chatBubbleReceived: {
    backgroundColor: colors.surfaceContainer,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
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
    flexShrink: 1,
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
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
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
