import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
            <MaterialIcons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="done-all" size={24} color={colors.iconDefault} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="filter-list" size={24} color={colors.iconDefault} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Today Group */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>TODAY</Text>
          
          {/* Unread Mention */}
          <TouchableOpacity style={[styles.notificationCard, styles.unreadCard]}>
            <View style={styles.unreadIndicator} />
            
            <View style={styles.avatarContainer}>
              <Image source={{ uri: 'https://i.pravatar.cc/150?img=5' }} style={styles.avatar} />
              <View style={styles.avatarBadge}>
                <MaterialIcons name="alternate-email" size={12} color={colors.primary} />
              </View>
            </View>

            <View style={styles.contentContainer}>
              <View style={styles.contentHeader}>
                <Text style={styles.nameText}>Sarah Jenkins</Text>
                <Text style={styles.timeText}>10:42 AM</Text>
              </View>
              <Text style={styles.messageText} numberOfLines={2}>
                Mentioned you in <Text style={styles.boldText}>HVAC Maintenance - West Wing</Text>: "Can you confirm the filter replacement schedule for unit B4?"
              </Text>
            </View>
          </TouchableOpacity>

          {/* System Alert (High Priority) */}
          <TouchableOpacity style={styles.alertCard}>
            <View style={styles.alertIconContainer}>
              <MaterialIcons name="warning" size={24} color="#ffdad6" />
            </View>

            <View style={styles.contentContainer}>
              <View style={styles.contentHeader}>
                <Text style={styles.alertNameText}>System Alert</Text>
                <Text style={styles.alertTimeText}>09:15 AM</Text>
              </View>
              <Text style={styles.alertMessageText} numberOfLines={2}>
                Server load critically high in <Text style={styles.boldText}>Datacenter Alpha</Text>. Immediate review requested.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Yesterday Group */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>YESTERDAY</Text>
          
          {/* Read Reply */}
          <TouchableOpacity style={styles.notificationCard}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: 'https://i.pravatar.cc/150?img=11' }} style={styles.avatar} />
              <View style={styles.avatarBadgeDefault}>
                <MaterialIcons name="reply" size={12} color={colors.iconDefault} />
              </View>
            </View>

            <View style={styles.contentContainer}>
              <View style={styles.contentHeader}>
                <Text style={styles.nameTextRead}>Marcus Chen</Text>
                <Text style={styles.timeTextRead}>Yesterday, 4:30 PM</Text>
              </View>
              <Text style={styles.messageTextRead} numberOfLines={2}>
                Replied to your thread in <Text style={styles.boldTextRead}>#general-announcements</Text>: "I agree, let's proceed with the new layout."
              </Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
    paddingBottom: 40,
  },
  group: {
    gap: 12,
  },
  groupTitle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  unreadCard: {
    backgroundColor: '#1A2639',
    borderColor: 'rgba(118, 209, 255, 0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.surfaceContainer,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(118, 209, 255, 0.3)',
  },
  avatarBadgeDefault: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  timeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: colors.text,
  },
  nameTextRead: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: '600',
  },
  timeTextRead: {
    color: colors.iconDefault,
    fontSize: 12,
  },
  messageTextRead: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  boldTextRead: {
    fontWeight: '600',
    color: colors.text,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#93000a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertNameText: {
    color: '#ffdad6',
    fontSize: 16,
    fontWeight: '700',
  },
  alertTimeText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  alertMessageText: {
    color: '#ffdad6',
    fontSize: 14,
    lineHeight: 20,
  },
});
