// server/sockets/socket.js
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinRoom', ({ room, user }) => {
      socket.join(room);
      io.to(room).emit('userJoined', { user, id: socket.id });
      // Optionally: send updated user list
    });

    socket.on('leaveRoom', ({ room, user }) => {
      socket.leave(room);
      io.to(room).emit('userLeft', { user, id: socket.id });
      // Optionally: send updated user list
    });

    socket.on('timerUpdate', ({ room, timer }) => {
      io.to(room).emit('timerUpdate', timer);
    });

    socket.on('chatMessage', ({ room, message }) => {
      io.to(room).emit('chatMessage', message);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      // Optionally: handle user presence
    });
  });
};
