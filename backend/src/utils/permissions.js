/**
 * Central Authorization Helpers
 * Enforces unified access control rules for channels, messages, and attachments.
 */

/**
 * Checks if a user has basic view access to a channel.
 * @param {Object} user - The requesting user object (must contain role).
 * @param {Object} channel - The channel object (type, deleted_at, archived_at).
 * @param {Object|null} membership - The user's membership record for this channel, if any.
 * @returns {boolean}
 */
function canViewChannel(user, channel, membership) {
  if (!user || !channel) return false;
  
  // Superadmin has global view access
  if (user.role === 'superadmin') {
    return true;
  }

  // Regular users cannot view deleted or archived channels
  if (channel.deleted_at || channel.archived_at) return false;

  // Public/Announcement channels are viewable by anyone
  if (channel.type === 'public' || channel.type === 'announcement') {
    return true;
  }

  // Private, DM, Group DM, Direct require explicit membership
  if (['private', 'dm', 'group_dm', 'direct'].includes(channel.type)) {
    return !!membership;
  }

  return false;
}

/**
 * Checks if a user can send a message in a channel.
 * @param {Object} user 
 * @param {Object} channel 
 * @param {Object|null} membership 
 * @returns {boolean}
 */
function canSendMessage(user, channel, membership) {
  if (!user || !channel) return false;
  if (!canViewChannel(user, channel, membership)) return false;

  if (user.role === 'superadmin') return true;
  
  // Cannot send to deleted/archived channels
  if (channel.deleted_at || channel.archived_at) return false;

  // If the channel is strictly read-only (e.g. announcement), only managers can post
  if (channel.is_readonly) {
    return !!(membership && membership.is_manager);
  }

  // Must be a member to post
  if (membership) {
    return !!(membership.is_manager || membership.can_post);
  }

  return false;
}

/**
 * Checks if a user can manage a channel (edit topic, pin messages, etc.)
 */
function canManageChannel(user, channel, membership) {
  if (!user || !channel) return false;
  if (user.role === 'superadmin') return true;
  
  return !!(membership && membership.is_manager);
}

/**
 * Checks if a user can delete a channel.
 * For DMs and Group DMs, only the creator (or superadmin) can delete it.
 */
function canDeleteChannel(user, channel) {
  if (!user || !channel) return false;
  if (user.role === 'superadmin') return true;
  
  return channel.created_by === user.id;
}

/**
 * Checks if a user can manage members (add/remove).
 */
function canManageMembers(user, channel, membership) {
  if (!user || !channel) return false;
  if (user.role === 'superadmin') return true;
  
  return !!(membership && (membership.is_manager || membership.can_add_members || membership.can_remove_members));
}

module.exports = {
  canViewChannel,
  canSendMessage,
  canManageChannel,
  canDeleteChannel,
  canManageMembers
};
