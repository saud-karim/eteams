const { Server } = require('socket.io');
const { verify } = require('../utils/token');
const User = require('../models/User');
const Channel = require('../models/Channel');

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
    socket.on('typing:start', ({ channelId, parentId }) => {
      socket.to(`channel:${channelId}`).emit('typing:start', { userId: user.id, channelId, parentId, name: user.name });
    });
    socket.on('typing:stop', ({ channelId, parentId }) => {
      socket.to(`channel:${channelId}`).emit('typing:stop', { userId: user.id, channelId, parentId });
    });

    // Presence change from client
    socket.on('presence:set', async ({ presence, statusText }) => {
      await User.updatePresence(user.id, presence, statusText || null);
      io.emit('presence:update', { userId: user.id, presence });
    });

    // Join a channel dynamically (after creation, invitation)
    socket.on('channel:join', async ({ channelId }) => {
      // Authorization Check: Only join if they are a superadmin or an actual member
      if (user.role === 'superadmin' || await Channel.isMember(channelId, user.id)) {
        socket.join(`channel:${channelId}`);
      }
    });

    socket.on('disconnect', async () => {
      await User.updatePresence(user.id, 'offline');
      io.emit('presence:update', { userId: user.id, presence: 'offline' });
      console.log(`[socket] ${user.name} disconnected`);
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
