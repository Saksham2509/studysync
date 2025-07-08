// server/sockets/socket.js
const rooms = {}; // { roomName: { users: [{ id, name }], timer: {...}, cycles: 0 } }

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join room
    socket.on('joinRoom', ({ room, user }) => {
      socket.join(room);
      if (!rooms[room]) rooms[room] = { users: [], timer: null, cycles: 0 };
      rooms[room].users.push({ id: socket.id, name: user.name });
      io.to(room).emit('userList', rooms[room].users);
    });

    // Leave room
    socket.on('leaveRoom', ({ room }) => {
      socket.leave(room);
      if (rooms[room]) {
        rooms[room].users = rooms[room].users.filter(u => u.id !== socket.id);
        io.to(room).emit('userList', rooms[room].users);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      for (const room in rooms) {
        rooms[room].users = rooms[room].users.filter(u => u.id !== socket.id);
        io.to(room).emit('userList', rooms[room].users);
      }
    });

    // Chat message
    socket.on('chatMessage', ({ room, message, user }) => {
      io.to(room).emit('chatMessage', {
        user,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    // Timer control (host only)
    socket.on('timerControl', ({ room, action, timerState }) => {
      // action: 'start' | 'pause' | 'reset' | 'next'
      // timerState: { type, timeLeft, cycles }
      if (rooms[room]) {
        rooms[room].timer = timerState;
        io.to(room).emit('timerUpdate', { action, timerState });
      }
    });
  });
};
