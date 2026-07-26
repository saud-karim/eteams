import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';

export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState(user?.name || user?.username || '');
  const [jobTitle, setJobTitle] = useState(user?.job_title || '');
  const [statusText, setStatusText] = useState(user?.status_text || '');
  const [presence, setPresence] = useState(user?.presence || 'online');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = createStyles(colors);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      // Update basic profile
      const res = await api.users.updateMe(name, jobTitle, statusText);
      // Update presence
      await api.users.setPresence(presence, statusText);

      if (res.user) {
        setUser({ ...res.user, presence });
      }

      // If user wants to change password
      if (newPassword) {
        if (!currentPassword) {
          Alert.alert('Error', 'Please enter your current password to set a new one.');
          setLoading(false);
          return;
        }
        await api.users.updatePassword(currentPassword, newPassword);
        Alert.alert('Success', 'Profile and password updated successfully');
      } else {
        Alert.alert('Success', 'Profile updated successfully');
      }

      router.back();
    } catch (err: any) {
      Alert.alert('Error updating profile', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getPresenceColor = (p: string) => {
    switch (p) {
      case 'online': return '#10B981';
      case 'away': return '#F59E0B';
      case 'dnd': return '#EF4444';
      case 'meeting': return '#8B5CF6';
      case 'offline': return '#6B7280';
      default: return '#10B981';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.saveButtonText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textDim}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Job Title</Text>
          <TextInput
            style={styles.input}
            value={jobTitle}
            onChangeText={setJobTitle}
            placeholder="e.g. Senior Developer"
            placeholderTextColor={colors.textDim}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Presence Status</Text>
          <View style={styles.presenceContainer}>
            {['online', 'away', 'dnd', 'meeting', 'offline'].map(p => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.presenceChip,
                  presence === p && styles.presenceChipActive,
                  presence === p && { backgroundColor: getPresenceColor(p) }
                ]}
                onPress={() => setPresence(p)}
              >
                <View style={[styles.presenceDot, { backgroundColor: presence === p ? '#fff' : getPresenceColor(p) }]} />
                <Text style={[styles.presenceChipText, presence === p && { color: '#fff' }]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Status Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={statusText}
            onChangeText={setStatusText}
            placeholder="What are you working on?"
            placeholderTextColor={colors.textDim}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Change Password</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Required to change password"
            placeholderTextColor={colors.textDim}
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Min 6 characters"
            placeholderTextColor={colors.textDim}
            secureTextEntry
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDim,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  textArea: {
    height: 100,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  presenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  presenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  presenceChipActive: {
    borderColor: 'transparent',
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presenceChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
});
