import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface MemberPermissionsModalProps {
  visible: boolean;
  onClose: () => void;
  channelId: string;
  member: any;
  onPermissionsUpdated: (memberId: string, perms: any) => void;
}

export default function MemberPermissionsModal({ visible, onClose, channelId, member, onPermissionsUpdated }: MemberPermissionsModalProps) {
  const { user } = useAuth();
  const { theme, colors } = useTheme();
  const styles = createStyles(colors);

  const [permissions, setPermissions] = useState({
    is_manager: false,
    can_post: false,
    can_pin_messages: false,
    can_delete_messages: false,
    can_add_members: false,
    can_remove_members: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && member) {
      setPermissions({
        is_manager: !!member.is_manager,
        can_post: !!member.can_post,
        can_pin_messages: !!member.can_pin_messages,
        can_delete_messages: !!member.can_delete_messages,
        can_add_members: !!member.can_add_members,
        can_remove_members: !!member.can_remove_members,
      });
    }
  }, [visible, member]);

  const togglePerm = (key: keyof typeof permissions) => {
    if (permissions.is_manager && key !== 'is_manager') return;
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.channels.updateMemberPermissions(channelId, member.id, permissions);
      onPermissionsUpdated(member.id, permissions);
      onClose();
    } catch (e: any) {
      alert(e.error || e.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const isSuperadmin = user?.role === 'superadmin';
  const canEditManager = isSuperadmin || user?.id !== member?.id;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Role: {member?.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={colors.iconDefault} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="security" size={16} color="#F59E0B" /> Channel Management
            </Text>
            
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Channel Manager (Full Access)</Text>
              <Switch 
                value={permissions.is_manager} 
                onValueChange={() => togglePerm('is_manager')} 
                disabled={!canEditManager}
                trackColor={{ false: colors.surfaceContainer, true: colors.primary }}
                thumbColor={colors.onPrimary}
              />
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, permissions.is_manager && styles.disabledText]}>Can Add Members</Text>
              <Switch 
                value={permissions.can_add_members || permissions.is_manager} 
                onValueChange={() => togglePerm('can_add_members')} 
                disabled={permissions.is_manager}
                trackColor={{ false: colors.surfaceContainer, true: colors.primary }}
                thumbColor={colors.onPrimary}
              />
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, permissions.is_manager && styles.disabledText]}>Can Remove Members</Text>
              <Switch 
                value={permissions.can_remove_members || permissions.is_manager} 
                onValueChange={() => togglePerm('can_remove_members')} 
                disabled={permissions.is_manager}
                trackColor={{ false: colors.surfaceContainer, true: colors.primary }}
                thumbColor={colors.onPrimary}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="message" size={16} color="#10B981" /> Messaging & Moderation
            </Text>
            
            <View style={styles.row}>
              <Text style={[styles.rowLabel, permissions.is_manager && styles.disabledText]}>Can Send Messages</Text>
              <Switch 
                value={permissions.can_post || permissions.is_manager} 
                onValueChange={() => togglePerm('can_post')} 
                disabled={permissions.is_manager}
                trackColor={{ false: colors.surfaceContainer, true: colors.primary }}
                thumbColor={colors.onPrimary}
              />
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, permissions.is_manager && styles.disabledText]}>Can Pin Messages</Text>
              <Switch 
                value={permissions.can_pin_messages || permissions.is_manager} 
                onValueChange={() => togglePerm('can_pin_messages')} 
                disabled={permissions.is_manager}
                trackColor={{ false: colors.surfaceContainer, true: colors.primary }}
                thumbColor={colors.onPrimary}
              />
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, permissions.is_manager && styles.disabledText]}>Can Delete Others' Messages</Text>
              <Switch 
                value={permissions.can_delete_messages || permissions.is_manager} 
                onValueChange={() => togglePerm('can_delete_messages')} 
                disabled={permissions.is_manager}
                trackColor={{ false: colors.surfaceContainer, true: colors.primary }}
                thumbColor={colors.onPrimary}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.onPrimary} size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  section: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowLabel: {
    color: colors.textDim,
    fontSize: 14,
  },
  disabledText: {
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: colors.iconDefault,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.onPrimary,
    fontWeight: 'bold',
  },
});
