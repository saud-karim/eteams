const { Server } = require('socket.io');
const { verify } = require('../utils/token');
const User = require('../models/User');
const Channel = require('../models/Channel');
const { canViewChannel } = require('../utils/permissions');
const { z } = require('zod');

const presenceSchema = z.object({
  presence: z.enum(['online', 'offline', 'away', 'dnd']),
  statusText: z.string().max(100).nullable().optional()
}).strict();

const typingSchema = z.object({
  channelId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional()
}).strict();

const channelJoinSchema = z.object({
  channelId: z.string().uuid()
}).strict();

// Simple Memory-based Rate Limiter for Sockets
const rateLimitMap = new Map();
function isRateLimited(socketId, eventName, limit, windowMs) {
  const now = Date.now();
  const key = `${socketId}:${eventName}`;
  const record = rateLimitMap.get(key) || { count: 0, startTime: now };
  
  if (now - record.startTime > windowMs) {
    record.count = 1;
    record.startTime = now;
  } else {
    record.count++;
  }
  
  rateLimitMap.set(key, record);
  return record.count > limit;
}

// Cleanup rate limit map every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.startTime > 60000) rateLimitMap.delete(key);
  }
}, 60000).unref();

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*', credentials: true },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Missing token'));
      const payload = verify(token);
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error('User not found'));
      if (payload.token_version !== user.token_version) return next(new Error('Session expired'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { user } = socket;
    console.log(`[socket] ${user.name} connected (${socket.id})`);

    // Join user to all their channel rooms
    const channels = await Channel.listForUser(user.id);
    for (const ch of channels) socket.join(`channel:${ch.id}`);
    socket.join(`user:${user.id}`);

    // Broadcast presence
    await User.updatePresence(user.id, 'online');
    io.emit('presence:update', { userId: user.id, presence: 'online' });

    // Typing indicator
    socket.on('typing:start', async (payload) => {
      if (isRateLimited(socket.id, 'typing', 10, 5000)) return; // Max 10 per 5 seconds
      try {
        const { channelId, parentId } = typingSchema.parse(payload);
        const channel = await Channel.findByIdWithArchived(channelId);
        const membership = await Channel.getMembership(channelId, user.id);
        if (canViewChannel(user, channel, membership)) {
          socket.to(`channel:${channelId}`).emit('typing:start', { userId: user.id, channelId, parentId, name: user.name });
        }
      } catch (e) {}
    });
    
    socket.on('typing:stop', async (payload) => {
      if (isRateLimited(socket.id, 'typing', 10, 5000)) return;
      try {
        const { channelId, parentId } = typingSchema.parse(payload);
        const channel = await Channel.findByIdWithArchived(channelId);
        const membership = await Channel.getMembership(channelId, user.id);
        if (canViewChannel(user, channel, membership)) {
          socket.to(`channel:${channelId}`).emit('typing:stop', { userId: user.id, channelId, parentId });
        }
      } catch (e) {}
    });

    // Presence change from client
    socket.on('presence:set', async (payload) => {
      if (isRateLimited(socket.id, 'presence', 5, 10000)) return; // Max 5 per 10 seconds
      try {
        const { presence, statusText } = presenceSchema.parse(payload);
        await User.updatePresence(user.id, presence, statusText || null);
        io.emit('presence:update', { userId: user.id, presence });
      } catch (e) {
        // Invalid payload, just ignore
      }
    });

    // Join a channel dynamically (after creation, invitation, or public preview)
    socket.on('channel:join', async (payload) => {
      if (isRateLimited(socket.id, 'channel:join', 20, 60000)) return; // Max 20 joins per minute
      try {
        const { channelId } = channelJoinSchema.parse(payload);
        
        // Authorization Check using centralized permissions
        const channel = await Channel.findByIdWithArchived(channelId);
        if (!channel) return;
        
        const membership = await Channel.getMembership(channelId, user.id);
        
        if (canViewChannel(user, channel, membership)) {
          socket.join(`channel:${channelId}`);
        }
      } catch (e) {}
    });

    socket.on('disconnect', async (reason) => {
      // Cleanup rate limits
      for (const key of rateLimitMap.keys()) {
        if (key.startsWith(`${socket.id}:`)) rateLimitMap.delete(key);
      }
      
      await User.updatePresence(user.id, 'offline');
      io.emit('presence:update', { userId: user.id, presence: 'offline' });
      console.log(`[socket] ${user.name} disconnected (Reason: ${reason})`);
    });
  });

  console.log('✓ Socket.io initialized');
}

function emitToChannel(channelId, event, payload) {
  if (io) io.to(`channel:${channelId}`).emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { initSocket, emitToChannel, emitToUser, getIo: () => io };
