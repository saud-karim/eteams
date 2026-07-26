import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function ThreadScreen() {
  const { theme, colors } = useTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);

  return (
    <View style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Thread</Text>
            <Text style={styles.headerSubtitle}>#hvac-maintenance</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="more-vert" size={24} color={colors.iconDefault} />
          </TouchableOpacity>
        </View>

        {/* Main Content Area (Timeline) */}
        <ScrollView style={styles.canvas} contentContainerStyle={styles.canvasContent}>
          {/* Original Message */}
          <View style={styles.originalMessageContainer}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDHhG7LZQBJ7B-RvlvTjQLgZCrLpZ_HxEwerzekcxOOWDcwXIsjCXdQHbY3-7sI3fUcEqhB8jDZ8drT-MGyFUpbawTxzQsM4ssHw8QvqmtLceSugpGsz78WzGkEuNluv9Yz-UGRpCWAeWgzpVPLgI1b3zwAUCnV6woh2iIJvczCJBBog5WLtv-_FLKWTWTjkoQA--ovLFAp7hbaRv0Dd4XSRznvIh8jwh1PGUJgHdp6pcc4ZnZQ4k-z' }} 
                style={styles.avatar} 
              />
              <View style={styles.onlineBadgeSecondary} />
            </View>
            <View style={styles.messageContent}>
              <View style={styles.messageMeta}>
                <Text style={styles.authorName}>David Chen</Text>
                <Text style={styles.timeText}>10:42 AM</Text>
              </View>
              <View style={styles.bubbleReceived}>
                <Text style={styles.messageTextReceived}>
                  The AHU-3 unit on the 4th floor is showing irregular pressure readings again. Anyone available to take a look before the afternoon shift?
                </Text>
              </View>
              <View style={styles.repliesCountContainer}>
                <Text style={styles.repliesText}>3 replies</Text>
                <View style={styles.repliesLine} />
              </View>
            </View>
          </View>

          {/* Replies Timeline */}
          <View style={styles.timelineContainer}>
            
            {/* Reply 1 */}
            <View style={styles.replyRow}>
              <View style={styles.connectorLine} />
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAjfnE25HLKJ_HtuHoS_Yy1IvYB7LHIUmXFyQVvvDrC-y5lr0-oKNGlqpun_LiiPG4bZ8rqRosAyurXSjiqbdqcWXufh5YcZSB3_P6G72AyjYgKNnhPX6L-tO-MESbXWnZfhjy9PFjZWZHM9ihZLXzJYrhUg_WF98bTGcqaLD_XHSFBeIsGr_xWDVRg3YvUOQq9d8_X2DFi01ZnUsMw8QPfB9yhcL-5IKszxnxSiJxOjYwGMP3ZpNy' }} 
                style={styles.replyAvatar} 
              />
              <View style={styles.messageContent}>
                <View style={styles.messageMeta}>
                  <Text style={styles.authorName}>Sarah Jenkins</Text>
                  <Text style={styles.timeText}>10:45 AM</Text>
                </View>
                <View style={styles.bubbleReceived}>
                  <Text style={styles.messageTextReceived}>
                    I'm wrapping up on floor 2. I can head up there in about 15 minutes.
                  </Text>
                </View>
              </View>
            </View>

            {/* Reply 2 (Current User - Sent Bubble) */}
            <View style={styles.replyRowSent}>
              <View style={styles.connectorLineSent} />
              <View style={styles.messageContentSent}>
                <View style={styles.messageMetaSent}>
                  <Text style={styles.timeText}>10:48 AM</Text>
                </View>
                <View style={styles.bubbleSent}>
                  <Text style={styles.messageTextSent}>
                    Thanks Sarah. Let me know if you need me to pull the maintenance logs for that unit.
                  </Text>
                </View>
              </View>
            </View>

            {/* Reply 3 */}
            <View style={styles.replyRow}>
              <View style={styles.connectorLine} />
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoZZOoHfagxtveKQ_TU1x6gCNlwE8TAGPKKmglTjgy4rl7m5LNoifnSbxYRDmgmzGaPiU6yOC5_M4niMadaWVlJZuY2tfERfkj0aD0NmvWXAGPTXfEUnkYeCbkN7LxblW3vd2hk6-pE4h3B9hjWNqQCDhAd0i69Q_-mshpFRASMwraB45nU0vJgTNWK0Cj2RWAMANQONx8CK995GWIN-xEQ00OPoL-1iIGPAvJ437cEeMjjKiZstco' }} 
                style={styles.replyAvatar} 
              />
              <View style={styles.messageContent}>
                <View style={styles.messageMeta}>
                  <Text style={styles.authorName}>David Chen</Text>
                  <Text style={styles.timeText}>10:50 AM</Text>
                </View>
                <View style={styles.bubbleReceivedReaction}>
                  <MaterialIcons name="thumb-up" size={16} color={colors.iconDefault} style={styles.reactionIcon} />
                  <Text style={styles.messageTextReceived}>
                    Perfect, keeping an eye on the dashboard till you get there.
                  </Text>
                </View>
              </View>
            </View>

          </View>
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.actionIcon}>
              <MaterialIcons name="add-circle-outline" size={24} color={colors.iconDefault} />
            </TouchableOpacity>
            <TextInput 
              style={styles.textInput}
              placeholder="Reply to thread..."
              placeholderTextColor={colors.iconDefault}
              multiline
            />
            <TouchableOpacity style={styles.sendButton}>
              <MaterialIcons name="send" size={18} color="#003548" />
            </TouchableOpacity>
          </View>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: insets?.top || 0,
    height: 64 + (insets?.top || 0),
    backgroundColor: 'rgba(5, 20, 36, 0.9)',
    zIndex: 10,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 2,
  },
  canvas: {
    flex: 1,
  },
  canvasContent: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  originalMessageContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onlineBadgeSecondary: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    backgroundColor: colors.secondary,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.background,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  messageContent: {
    flex: 1,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    color: colors.textDim,
  },
  bubbleReceived: {
    backgroundColor: colors.surfaceContainer,
    padding: 12,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopLeftRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleReceivedReaction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    padding: 12,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopLeftRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionIcon: {
    marginRight: 8,
  },
  messageTextReceived: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    flexShrink: 1,
  },
  repliesCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  repliesText: {
    fontSize: 11,
    color: colors.primary,
    marginRight: 8,
  },
  repliesLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(118, 209, 255, 0.3)',
  },
  timelineContainer: {
    marginLeft: 20,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(118, 209, 255, 0.3)', // Glowing timeline line
    gap: 16,
  },
  replyRow: {
    flexDirection: 'row',
    position: 'relative',
  },
  connectorLine: {
    position: 'absolute',
    left: -32,
    top: 16,
    width: 16,
    height: 2,
    backgroundColor: 'rgba(118, 209, 255, 0.3)',
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  replyRowSent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  connectorLineSent: {
    position: 'absolute',
    left: -32,
    top: 16,
    width: 16,
    height: 2,
    backgroundColor: 'rgba(118, 209, 255, 0.3)',
  },
  messageContentSent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  messageMetaSent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  bubbleSent: {
    backgroundColor: colors.primary,
    padding: 12,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 0,
    maxWidth: '90%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  messageTextSent: {
    fontSize: 14,
    color: '#00394d',
    lineHeight: 20,
  },
  inputWrapper: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(62, 72, 78, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(118, 209, 255, 0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    padding: 8,
    marginRight: 4,
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    maxHeight: 120,
    minHeight: 40,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  }
});
