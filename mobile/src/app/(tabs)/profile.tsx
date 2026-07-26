import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TabHeader } from '../../components/TabHeader';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/UserAvatar';

export default function ProfileScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <View style={styles.container}>
      <TabHeader title="Profile" showLogo={false} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.coverPhoto} />
          
          <View style={styles.profileInfoContainer}>
            <View style={styles.avatarWrapper}>
              <UserAvatar 
                name={user.name || user.username || '?'} 
                avatarUrl={user.avatar_url} 
                size={90} 
              />
              <View style={styles.onlineBadge} />
            </View>

            <TouchableOpacity style={styles.editButton} onPress={() => router.push('/edit-profile')}>
              <MaterialIcons name="edit" size={16} color="#003548" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailsContainer}>
            <Text style={styles.nameText}>{user.name || user.username}</Text>
            <Text style={styles.roleText}>{user.job_title || (user.role === 'superadmin' ? 'System Administrator' : 'Member')}</Text>

            <View style={styles.tagsContainer}>
              {user.department && (
                <View style={styles.tag}>
                  <MaterialIcons name="corporate-fare" size={14} color={colors.iconDefault} />
                  <Text style={styles.tagText}>{user.department}</Text>
                </View>
              )}
              {user.company_rank && (
                <View style={styles.tag}>
                  <MaterialIcons name="star" size={14} color={colors.iconDefault} />
                  <Text style={styles.tagText}>{user.company_rank}</Text>
                </View>
              )}
              <View style={styles.tag}>
                <MaterialIcons name="badge" size={14} color={colors.iconDefault} />
                <Text style={styles.tagText}>ID: {user.id.substring(0, 8)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Update */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="history-edu" size={20} color="#ffb95f" />
            <Text style={styles.cardTitle}>Current Status</Text>
          </View>
          <View style={styles.statusBox}>
            <MaterialIcons name="engineering" size={20} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusText}>
                {user.status_text || (user.presence === 'dnd' ? 'Do Not Disturb' : `Available (${user.presence})`)}
              </Text>
              {user.last_seen_at && <Text style={styles.statusTime}>Updated recently</Text>}
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="contact-mail" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Contact Information</Text>
          </View>
          
          <View style={styles.contactItem}>
            <MaterialIcons name="email" size={20} color={colors.iconDefault} />
            <View>
              <Text style={styles.contactLabel}>Email Address</Text>
              <Text style={styles.contactValue}>{user.email || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.contactItem}>
            <MaterialIcons name="phone" size={20} color={colors.iconDefault} />
            <View>
              <Text style={styles.contactLabel}>Phone Number</Text>
              <Text style={styles.contactValue}>{user.phone || 'Not provided'}</Text>
            </View>
          </View>
        </View>

        {/* Settings Button */}
        <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
          <View style={styles.settingsLeft}>
            <MaterialIcons name="settings" size={24} color={colors.text} />
            <Text style={styles.settingsText}>Settings</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.iconDefault} />
        </TouchableOpacity>

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
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  coverPhoto: {
    height: 100,
    backgroundColor: colors.primary,
    opacity: 0.8,
  },
  profileInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginTop: -40,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.surfaceContainer,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.surfaceContainer,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    marginBottom: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  detailsContainer: {
    padding: 16,
  },
  nameText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  roleText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  statusBox: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.surfaceContainerHigh,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  statusTime: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactLabel: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: 2,
  },
  contactValue: {
    color: colors.text,
    fontSize: 14,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 8,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  }
});
