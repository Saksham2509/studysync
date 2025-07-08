// server/sockets/socket.js
const rooms = {}; // { roomName: { users: [{ id, name }], timer: {...}, cycles: 0, interval: null } }
const { saveMessage, getRoomMessages } = require('../controllers/messageController');
const { saveRoom, getRoom } = require('../controllers/roomController');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join room
    socket.on('joinRoom', async ({ room, userName }) => {
      socket.join(room);
      if (!rooms[room]) rooms[room] = { users: [], timer: null, cycles: 0 };
      // Remove any previous entry for this socket (prevents duplicates)
      rooms[room].users = rooms[room].users.filter(u => u.id !== socket.id);
      rooms[room].users.push({ id: socket.id, name: userName });
      // Save/update room in DB
      try {
        await saveRoom({ name: room, host: rooms[room].users[0]?.id, users: rooms[room].users });
      } catch (err) {
        console.error('Error saving room:', err);
      }
      // Debug: log the user list
      console.log(`Room '${room}' users:`, rooms[room].users);
      // Broadcast updated user list to all clients in the room
      io.to(room).emit('roomUsers', rooms[room].users);
      // Also send the user list directly to the joining socket
      socket.emit('roomUsers', rooms[room].users);
      // Fetch and send message history
      try {
        const messages = await getRoomMessages(room);
        socket.emit('chat:history', messages);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    });

    // Leave room
    socket.on('leaveRoom', ({ room }) => {
      socket.leave(room);
      if (rooms[room]) {
        rooms[room].users = rooms[room].users.filter(u => u.id !== socket.id);
        io.to(room).emit('roomUsers', rooms[room].users);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      for (const room in rooms) {
        rooms[room].users = rooms[room].users.filter(u => u.id !== socket.id);
        io.to(room).emit('roomUsers', rooms[room].users);
      }
    });

    // Timer events
    socket.on("timer:start", ({ room, timer }) => {
      console.log(`[Server] timer:start received for room ${room}`, timer);
      if (rooms[room]) {
        // Clear any existing interval
        if (rooms[room].interval) {
          clearInterval(rooms[room].interval);
        }
        rooms[room].timer = { ...timer, running: true };
        io.to(room).emit("timer:update", rooms[room].timer);
        // Start interval
        rooms[room].interval = setInterval(() => {
          if (!rooms[room].timer.running) return;
          if (rooms[room].timer.seconds > 0) {
            rooms[room].timer.seconds -= 1;
            io.to(room).emit("timer:update", rooms[room].timer);
          } else {
            // Timer finished
            clearInterval(rooms[room].interval);
            rooms[room].interval = null;
            rooms[room].timer.running = false;
            io.to(room).emit("timer:update", rooms[room].timer);
            // Optionally emit a timer:done event here
          }
        }, 1000);
      }
    });

    socket.on("timer:pause", ({ room }) => {
      console.log(`[Server] timer:pause received for room ${room}`);
      if (rooms[room] && rooms[room].timer) {
        rooms[room].timer.running = false;
        io.to(room).emit("timer:update", rooms[room].timer);
        if (rooms[room].interval) {
          clearInterval(rooms[room].interval);
          rooms[room].interval = null;
        }
      }
    });

    socket.on("timer:reset", ({ room, timer }) => {
      console.log(`[Server] timer:reset received for room ${room}`, timer);
      if (rooms[room]) {
        rooms[room].timer = { ...timer, running: false };
        io.to(room).emit("timer:update", rooms[room].timer);
        if (rooms[room].interval) {
          clearInterval(rooms[room].interval);
          rooms[room].interval = null;
        }
      }
    });

    // Chat message
    socket.on("chat:message", async ({ room, message }) => {
      io.to(room).emit("chat:message", message);
      // Save to DB
      try {
        await saveMessage({ room, user: message.user, text: message.text });
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });
  });
};
