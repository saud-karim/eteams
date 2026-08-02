const fs = require('fs');

const chatFile = 'd:/eteams/mobile/src/app/chat/[id].tsx';
const threadFile = 'd:/eteams/mobile/src/app/thread/[id].tsx';

const chatCode = fs.readFileSync(chatFile, 'utf8');
let threadCode = fs.readFileSync(threadFile, 'utf8');

// 1. Add Missing Imports
const missingImports = `import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { Modal, TouchableWithoutFeedback, Animated, Alert } from 'react-native';
`;
threadCode = threadCode.replace("import * as WebBrowser from 'expo-web-browser';", "import * as WebBrowser from 'expo-web-browser';\n" + missingImports);

// 2. Add Missing States
const missingStates = `  const [attachment, setAttachment] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showReadersModal, setShowReadersModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
`;
threadCode = threadCode.replace("const [sending, setSending] = useState(false);", "const [sending, setSending] = useState(false);\n" + missingStates);

// 3. Add Typing Handlers in useEffect
const socketHandlers = `
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
      if (data.userId !== user?.id && data.parentId === id) {
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
      if (data.userId !== user?.id && data.parentId === id) {
        setTypingUsers(prev => prev.filter(name => name !== data.name));
      }
    };
`;
threadCode = threadCode.replace(
  "socket.on('message:new', handleNewMessage);", 
  "socket.on('message:new', handleNewMessage);\n" + socketHandlers + `
    socket.on('message:reactions', handleReaction);
    socket.on('message:updated', handleUpdatedMessage);
    socket.on('message:deleted', handleDeletedMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
  `
);
threadCode = threadCode.replace(
  "socket.off('message:new', handleNewMessage);",
  `socket.off('message:new', handleNewMessage);
        socket.off('message:reactions', handleReaction);
        socket.off('message:updated', handleUpdatedMessage);
        socket.off('message:deleted', handleDeletedMessage);
        socket.off('typing:start', handleTypingStart);
        socket.off('typing:stop', handleTypingStop);`
);

// 4. Update handleSend to use attachment
const newHandleSend = `
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

        messageRes = await api.messages.sendWithAttachment(formData);
      } else {
        if (editingMessage) {
           await api.messages.edit(editingMessage.id, body.trim());
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
    if (lastWord && lastWord.startsWith('@')) {
      setMentionQuery(lastWord.substring(1).toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const filteredMembers = users?.filter((m: any) => 
    (m.name?.toLowerCase().includes(mentionQuery) || m.username?.toLowerCase().includes(mentionQuery)) && m.id !== user?.id
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
`;
// Replace handleSend entirely. Note: we slice from handleSend up to renderAvatar
const handleSendMatch = threadCode.match(/const handleSend = async \(\) => {[\s\S]*?};/);
if (handleSendMatch) {
    threadCode = threadCode.replace(handleSendMatch[0], newHandleSend);
}

// 5. Update Message Rendering (onLongPress and Reactions)
threadCode = threadCode.replace(
  '<View key={msg.id} style={styles.replyRowSent}>',
  '<TouchableOpacity key={msg.id} style={styles.replyRowSent} onLongPress={() => openModal(msg)} delayLongPress={250} activeOpacity={0.7}>'
).replace(
  '</View>\n                );',
  '</TouchableOpacity>\n                );'
);

threadCode = threadCode.replace(
  '<View key={msg.id} style={styles.replyRow}>',
  '<TouchableOpacity key={msg.id} style={styles.replyRow} onLongPress={() => openModal(msg)} delayLongPress={250} activeOpacity={0.7}>'
).replace(
  '</View>\n              );',
  '</TouchableOpacity>\n              );'
);

// Inject attachments rendering and reactions rendering into the bubbles (sent and received)
threadCode = threadCode.replace(
  /{msg.body}\n                        <\/Markdown>\n                      <\/View>/g,
  `{msg.body}\n                        </Markdown>\n                        {msg.attachments && msg.attachments.length > 0 && (
                          <View style={{ marginTop: 8, gap: 8 }}>
                            {msg.attachments.map((att: any) => {
                              const fileUrl = att.storage_key.startsWith('http') ? att.storage_key : \`\${API_BASE_URL.replace('/api', '')}/\${att.storage_key}\`;
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
                      </View>`
);

// Add Typing indicator UI above Input Area
threadCode = threadCode.replace(
  "{/* Input Area */}",
  `{typingUsers.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ color: colors.iconDefault, fontSize: 12, fontStyle: 'italic', textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }}>
                {typingUsers.join(', ')} {typingUsers.length > 1 ? t('chat.are_typing', 'are typing...') : t('chat.is_typing', 'is typing...')}
              </Text>
            </View>
          )}
          {/* Input Area */}`
);

// 6. Update Input Area to be Composer like chat/[id].tsx
const composerJSX = `
        {/* Mentions Autocomplete List */}
        {showMentions && filteredMembers.length > 0 && (
          <View style={{ maxHeight: 150, backgroundColor: colors.surfaceContainerHigh, borderTopLeftRadius: 12, borderTopRightRadius: 12, marginHorizontal: 16, elevation: 4 }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredMembers.map((member: any) => {
                let avatarUrl = \`https://ui-avatars.com/api/?name=\${encodeURIComponent(member.name || member.username)}&background=1E293B&color=fff\`;
                if (member.avatar) {
                  avatarUrl = member.avatar.startsWith('http') ? member.avatar : \`\${API_BASE_URL}\${member.avatar}\`;
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

        {/* Input Area */}
        <View style={styles.inputWrapper}>
          {editingMessage && (
            <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 8 }}>
              <View style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="edit" size={16} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Editing message</Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingMessage(null); setBody(''); }}>
                <MaterialIcons name="close" size={18} color={colors.iconDefault} />
              </TouchableOpacity>
            </View>
          )}
          {attachment && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerHigh, padding: 8, borderRadius: 8, marginBottom: 8, alignSelf: 'flex-start' }}>
                <MaterialIcons name={attachment.isImage ? "image" : "insert-drive-file"} size={20} color={colors.primary} />
                <Text style={{ color: colors.text, marginHorizontal: 8, maxWidth: 200 }} numberOfLines={1}>{attachment.name}</Text>
                <TouchableOpacity onPress={() => setAttachment(null)}>
                  <MaterialIcons name="close" size={18} color={colors.iconDefault} />
                </TouchableOpacity>
              </View>
          )}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={{ padding: 8 }} onPress={pickAttachment}>
              <MaterialIcons name="add" size={24} color={colors.iconDefault} />
            </TouchableOpacity>
            <TextInput 
              style={[styles.textInput, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}
              placeholder={t('chat.reply_in_thread', 'Reply in thread...')}
              placeholderTextColor={colors.iconDefault}
              multiline
              value={body}
              onChangeText={handleTextChange}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={sending || (!body.trim() && !attachment)}>
              {sending ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <MaterialIcons name="send" size={18} color={(!body.trim() && !attachment) ? colors.iconDefault : colors.onPrimary} style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />
              )}
            </TouchableOpacity>
          </View>
        </View>
`;
threadCode = threadCode.replace(/\{\/\* Input Area \*\/\}[\s\S]*?<\/KeyboardAvoidingView>/, composerJSX + "\n      </KeyboardAvoidingView>");

// 7. Inject Modal at the end, before the closing </View> (the root view)
const modalJSX = `
        {/* Long Press Bottom Sheet Modal */}
        <Modal visible={!!selectedMessage} transparent={true} animationType="fade" onRequestClose={closeModal}>
          <TouchableWithoutFeedback onPress={closeModal}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <Animated.View style={[{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }, { transform: [{ translateY: slideAnim }] }]}>
                  <View style={{ width: 40, height: 4, backgroundColor: colors.iconDefault, borderRadius: 2, alignSelf: 'center', marginBottom: 20, opacity: 0.3 }} />
                  
                  {/* Quick Reactions */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 12 }}>
                    {['👍', '❤️', '😂', '🎉', '👀'].map(emoji => (
                      <TouchableOpacity key={emoji} onPress={() => handleReact(selectedMessage.id, emoji)} style={{ backgroundColor: colors.surfaceContainer, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <View style={{ height: 1, backgroundColor: colors.pillBg, marginBottom: 16 }} />
                  
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={async () => { 
                    if (selectedMessage?.body) await Clipboard.setStringAsync(selectedMessage.body);
                    closeModal(); 
                  }}>
                    <MaterialIcons name="content-copy" size={24} color={colors.text} style={{ marginRight: 16 }} />
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{t('common.copy_text', 'Copy text')}</Text>
                  </TouchableOpacity>

                  {(selectedMessage?.user_id === user?.id) && (
                    <>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={handleEditPress}>
                        <MaterialIcons name="edit" size={24} color={colors.text} style={{ marginRight: 16 }} />
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{t('common.edit_message', 'Edit message')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={handleDeletePress}>
                        <MaterialIcons name="delete-outline" size={24} color="#F43F5E" style={{ marginRight: 16 }} />
                        <Text style={{ color: '#F43F5E', fontSize: 16, fontWeight: '500' }}>{t('common.delete_message', 'Delete message')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
`;
threadCode = threadCode.replace("      </KeyboardAvoidingView>\n    </View>", "      </KeyboardAvoidingView>\n" + modalJSX + "\n    </View>");

fs.writeFileSync(threadFile, threadCode);
console.log('Successfully updated thread/[id].tsx');
