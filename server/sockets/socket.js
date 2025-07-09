// server/sockets/socket.js
const jwt = require('jsonwebtoken');
const { saveMessage, getRoomMessages } = require('../controllers/messageController');
const { saveRoom, getRoom } = require('../controllers/roomController');
const Room = require('../models/Room');

// Export function that takes io and shared rooms object
module.exports = (io, socketRooms = {}) => {
  // Use the passed in rooms object or create a new one if not provided
  const rooms = socketRooms; // { roomName: { users: [{ id, name }], timer: {...}, cycles: 0, interval: null } }
  // JWT auth middleware with fallback for development
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      // For development: allow connections without token with a default user
      console.log('Warning: No auth token provided, using default user');
      socket.user = { name: 'Anonymous User', id: socket.id, isAuthenticated: false };
      return next();
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-for-development');
      // Store the user data in the socket.user object, ensuring we have proper user data
      socket.user = {
        id: decoded.user?.id || socket.id,
        name: decoded.user?.name || 'Anonymous User',
        email: decoded.user?.email,
        isAuthenticated: true,
        _decoded: decoded // Keep the full decoded data for debugging
      };
      console.log('Authenticated user:', socket.user.name, socket.user.id);
      return next();
    } catch (err) {
      console.error('Token verification error:', err.message);
      // For development: allow connections with invalid token
      socket.user = { name: 'Anonymous User', id: socket.id, isAuthenticated: false };
      return next();
    }
  });

  // Utility function to log room status
  const logRoomStatus = () => {
    console.log("\n===== ROOM STATUS =====");
    Object.keys(rooms).forEach(roomName => {
      const room = rooms[roomName];
      console.log(`Room: ${roomName}`);
      console.log(`  Users: ${room.users.length}`);
      console.log(`  Users list: ${room.users.map(u => `${u.name} (${u.id})`).join(', ')}`);
      console.log(`  Host: ${room.host || 'None'}`);
    });
    console.log("=======================\n");
  };
  
  // Utility function to broadcast room changes
  const broadcastRoomChange = (roomName) => {
    // Broadcast to all connected clients that rooms have changed
    // Clients should refresh their room lists
    io.emit('roomChanged', { room: roomName });
    console.log(`Broadcasting room change for ${roomName}`);
  };

  // Log room status every 30 seconds
  const statusInterval = setInterval(logRoomStatus, 30000);

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id, 'User:', socket.user?.name);

    // Join room
    socket.on('joinRoom', async ({ room, userName, asHost }) => {
      // Fetch room from DB to check if it exists
      let dbRoom = null;
      try {
        dbRoom = await getRoom(room);
        // If room doesn't exist, deny joining
        if (!dbRoom) {
          socket.emit('joinDenied', { reason: `Room "${room}" does not exist!` });
          return;
        }
        
        // If room exists and is private, check allowedUsers
        if (dbRoom.isPublic === false) {
          // allowedUsers is array of user IDs or emails; check socket.user.id or .email
          const userId = socket.user.id || socket.user._id || socket.user.email;
          const allowed = dbRoom.allowedUsers.includes(userId);
          if (!allowed) {
            socket.emit('joinDenied', { reason: 'You are not allowed to join this private room.' });
            return;
          }
        }
      } catch (err) {
        console.error('Error checking room:', err);
        socket.emit('joinDenied', { reason: 'Room not found or error occurred!' });
        return;
      }
      // Join the socket.io room
      socket.join(room);
      
      // Initialize room if it doesn't exist
      if (!rooms[room]) {
        rooms[room] = { 
          users: [], 
          timer: null, 
          cycles: 0
        };
      }
      
      // Remove any previous entries for this socket or user (prevents duplicates)
      const userId = socket.user.id || socket.id;
      
      // Check if the user was already in the room
      const existingUserIndex = rooms[room].users.findIndex(u => 
        u.socketId === socket.id || 
        (socket.user.isAuthenticated && u.userId === userId)
      );
      
      if (existingUserIndex !== -1) {
        console.log(`User ${socket.user.name} (${userId}) is rejoining room ${room}. Updating entry.`);
      }
      
      // Filter out any previous entries for this user
      rooms[room].users = rooms[room].users.filter(u => 
        u.socketId !== socket.id && 
        (socket.user.isAuthenticated ? u.userId !== userId : true)
      );
      
      // Prepare user data with correct naming
      let displayName;
      
      if (socket.user.isAuthenticated) {
        displayName = socket.user.name;
      } else {
        // Only use provided userName if not authenticated
        displayName = userName || socket.user.name;
      }
      
      // Add user to room with complete information
      const userInfo = { 
        id: socket.id,                            // socket ID (changes on reconnect)
        socketId: socket.id,                      // duplicate for clarity
        userId: userId,                           // persistent user ID (from auth) 
        name: displayName,                        // display name
        isAuthenticated: socket.user.isAuthenticated,
        joinedAt: new Date()
      };
      
      rooms[room].users.push(userInfo);
      
      // Store room name in socket for disconnect handling
      socket.data.currentRoom = room;
      // Save/update room in DB (preserve privacy fields if room exists)
      try {
        // Set host based on: explicit asHost flag, existing host, or first user
        let hostId;
        
        if (asHost) {
          // If user explicitly requested to join as host
          hostId = userId;
          console.log(`User ${displayName} (${userId}) joining as explicit host of room ${room}`);
          // Store host in the room's memory state too
          rooms[room].host = userId;
        } else if (dbRoom?.host) {
          // Keep existing host if available
          hostId = dbRoom.host;
          rooms[room].host = dbRoom.host;
        } else if (rooms[room].users.length === 1) {
          // First user becomes host by default
          hostId = userId;
          rooms[room].host = userId;
          console.log(`User ${displayName} (${userId}) is first user, becoming host of room ${room}`);
        } else {
          // Fall back to first user in the room
          hostId = rooms[room].users[0]?.userId || rooms[room].users[0]?.id;
          rooms[room].host = hostId;
        }
        
        await saveRoom({
          name: room,
          host: hostId,
          users: rooms[room].users,
          isPublic: dbRoom ? dbRoom.isPublic : true,
          allowedUsers: dbRoom ? dbRoom.allowedUsers : []
        });
      } catch (err) {
        console.error('Error saving room:', err);
      }
      // Debug: log the user list
      console.log(`Room '${room}' users:`, rooms[room].users);
      
      // Update the room list for this room
      if (rooms[room] && rooms[room].users) {
        // Get the room host information from the database
        const dbRoomUpdated = await getRoom(room);
        if (dbRoomUpdated) {
          // Check if the current user should be host
          const currentUserIsHost = dbRoomUpdated.host === userId;
          if (currentUserIsHost) {
            console.log(`User ${displayName} (${userId}) confirmed as host for room ${room}`);
          }
          
          // Emit host status to the joining user
          socket.emit('hostStatus', { isHost: currentUserIsHost });
        }
      }
      
      // Broadcast updated user list to all clients in the room
      io.to(room).emit('roomUsers', rooms[room].users);
      // Also send the user list directly to the joining socket
      socket.emit('roomUsers', rooms[room].users);
      
      // Broadcast room change to all clients so they can refresh room lists
      broadcastRoomChange(room);
      
      // Log room status after join
      logRoomStatus();
      // Fetch and send message history
      try {
        const messages = await getRoomMessages(room);
        console.log(`Sending ${messages.length} chat messages to user ${socket.user.name} in room ${room}`);
        socket.emit('chat:history', messages);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    });

    // Leave room
    socket.on('leaveRoom', async ({ room }) => {
      console.log(`User ${socket.user?.name} (${socket.id}) leaving room ${room}`);
      
      // Leave the socket.io room
      socket.leave(room);
      
      // Get the user's ID for authenticated users
      const userId = socket.user?.id || socket.id;
      const userName = socket.user?.name || 'Anonymous';
      
      console.log(`Removing user ${userName} (${userId}) from room ${room}`);
      
      // Clean up user data from the room
      if (rooms[room]) {
        // Remove the user from the room's user list (check all possible identifiers)
        const beforeCount = rooms[room].users.length;
        rooms[room].users = rooms[room].users.filter(u => 
          u.id !== socket.id && 
          u.socketId !== socket.id && 
          (socket.user?.isAuthenticated ? u.userId !== userId : true)
        );
        const afterCount = rooms[room].users.length;
        
        console.log(`Room ${room}: User count changed from ${beforeCount} to ${afterCount}`);
        
        // Get remaining sockets in the room to verify if anyone is still connected
        const socketsInRoom = io.sockets.adapter.rooms.get(room);
        const activeSocketCount = socketsInRoom ? socketsInRoom.size : 0;
        
        console.log(`Room ${room}: Socket.IO shows ${activeSocketCount} connected sockets`);
        
        // Double-check if the room is actually empty (users array vs actual sockets)
        if (activeSocketCount === 0 || rooms[room].users.length === 0) {
          console.log(`Room ${room} is empty (users: ${rooms[room].users.length}, sockets: ${activeSocketCount}), cleaning up in-memory state`);
          
          // Clean up any timers
          if (rooms[room].interval) {
            clearInterval(rooms[room].interval);
          }
          
          // Set users array to empty to be sure
          if (rooms[room]) {
            rooms[room].users = [];
          }
          
          // Remove the in-memory room data
          delete rooms[room];
          
          // Log the current rooms state after deletion
          console.log("Rooms after cleanup:", Object.keys(rooms));
        } else {
          // Room still has users, update the list for remaining users
          io.to(room).emit('roomUsers', rooms[room].users);
          
          // Broadcast room change to all clients so they can refresh room lists
          broadcastRoomChange(room);
        }
        
        // Update the database to reflect the current user list
        try {
          const dbRoom = await getRoom(room);
          if (dbRoom) {
            // Get the actual sockets currently in the room
            const socketsInRoom = io.sockets.adapter.rooms.get(room);
            const actualSocketIds = socketsInRoom ? Array.from(socketsInRoom) : [];
            
            // If we have in-memory user data, update it based on actually connected sockets
            if (rooms[room] && rooms[room].users) {
              // Filter users to only those whose sockets are still in the room
              const beforeFilter = rooms[room].users.length;
              rooms[room].users = rooms[room].users.filter(user => 
                actualSocketIds.includes(user.socketId)
              );
              const afterFilter = rooms[room].users.length;
              
              if (beforeFilter !== afterFilter) {
                console.log(`Room ${room}: Filtered out ${beforeFilter - afterFilter} users who are not actually connected`);
              }
            }
            
            // Whether room exists in memory or not, update the database with latest user list
            // If room was deleted from memory, set users to empty array
            const updatedUsers = (rooms[room] && rooms[room].users) ? rooms[room].users : [];
            
            // Always update lastActive timestamp
            await saveRoom({
              ...dbRoom,
              users: updatedUsers,
              lastActive: new Date()
            });
            
            console.log(`Updated room ${room} in database. Active users: ${updatedUsers.length}`);
          }
        } catch (err) {
          console.error(`Error updating room ${room} after user left:`, err);
        }
      }
      
      // Clear the current room from socket data
      if (socket.data.currentRoom === room) {
        socket.data.currentRoom = null;
      }
      
      // Always broadcast room change to update room list everywhere
      broadcastRoomChange(room);
      
      // Log room status after leave
      logRoomStatus();
    });

    // Handle setting a user as host
    socket.on('setRoomHost', async ({ room, userId }) => {
      if (!room || !userId) return;
      
      try {
        const dbRoom = await getRoom(room);
        if (dbRoom) {
          await saveRoom({
            ...dbRoom,
            host: userId
          });
          console.log(`Set user ${userId} as host of room ${room}`);
        }
      } catch (err) {
        console.error('Error setting room host:', err);
      }
    });
    
    // Handle request for chat history
    socket.on('requestChatHistory', async ({ room }) => {
      if (!room) return;
      
      try {
        console.log(`[Server] Chat history requested by ${socket.user.name} for room ${room}`);
        const messages = await getRoomMessages(room);
        console.log(`[Server] Sending ${messages.length} messages of chat history to ${socket.user.name}`);
        socket.emit('chat:history', messages);
      } catch (err) {
        console.error(`Error fetching chat history for room ${room}:`, err);
        socket.emit('chat:history', []);
      }
    });

    // Handle room deletion notification
    socket.on('roomDeleted', async ({ room }) => {
      if (!room) return;
      
      // Get host name for better notification
      const hostName = socket.user?.name || "The host";
      
      // Notify all users in the room that it has been deleted
      io.to(room).emit('roomClosed', { 
        reason: `Room has been deleted by ${hostName}`,
        hostId: socket.user?.id || socket.id
      });
      
      console.log(`Room ${room} deleted by ${hostName} (${socket.user?.id || socket.id})`);
      
      // Clean up the room data
      if (rooms[room]) {
        delete rooms[room];
      }
      
      try {
        // Make sure the messages for this room are deleted as well
        // This ensures all clients trigger message deletion
        const Message = require('../models/Message');
        await Message.deleteMany({ room: room });
        console.log(`Messages for room ${room} have been deleted`);
      } catch (err) {
        console.error(`Error deleting messages for room ${room}:`, err);
      }
    });
    
    // Handle request for current user list
    socket.on('requestUserList', ({ room }) => {
      if (!room) return;
      
      if (rooms[room] && rooms[room].users) {
        console.log(`User ${socket.user.name} requested user list for room ${room}`);
        socket.emit('roomUsers', rooms[room].users);
      } else {
        socket.emit('roomUsers', []);
      }
    });
    
    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.id} (${socket.user?.name})`);
      
      // Get the user's ID for authenticated users (to properly remove them)
      const userId = socket.user?.id || socket.id;
      const userName = socket.user?.name || 'Unknown User';
      
      // Get all socket rooms the user was in
      const userRooms = [...socket.rooms].filter(r => r !== socket.id);
      const currentRoom = socket.data.currentRoom;
      
      console.log(`User ${userName} (${userId}) was in room: ${currentRoom || 'none'}`);
      
      // Update user lists in all rooms
      for (const roomName in rooms) {
        // Check if user was in this room (check by socket ID and user ID if authenticated)
        const userInRoom = rooms[roomName]?.users?.some(u => 
          u.id === socket.id || 
          u.socketId === socket.id || 
          (socket.user?.isAuthenticated && u.userId === userId)
        );
        
        if (userInRoom) {
          console.log(`Removing user ${userName} (${userId}) from room: ${roomName}`);
          
          // Remove user from the room's user list (check all identifiers)
          rooms[roomName].users = rooms[roomName].users.filter(u => 
            u.id !== socket.id && 
            u.socketId !== socket.id &&
            (socket.user?.isAuthenticated ? u.userId !== userId : true)
          );
          
          // Check if there are any actual sockets still in the room
          const socketsInRoom = io.sockets.adapter.rooms.get(roomName);
          const actualSocketCount = socketsInRoom ? socketsInRoom.size : 0;
          
          // If room is empty after user leaves, clean it up completely
          if (rooms[roomName].users.length === 0 || actualSocketCount === 0) {
            console.log(`Room ${roomName} is empty (users: ${rooms[roomName].users.length}, sockets: ${actualSocketCount}) after disconnect, cleaning up in-memory state`);
            
            // Clean up any timers
            if (rooms[roomName].interval) {
              clearInterval(rooms[roomName].interval);
            }
            
            // Clear users array for database update
            rooms[roomName].users = [];
            
            // Remove the in-memory room data
            delete rooms[roomName]; 
            
            // Update database to show room has no active users
            try {
              const dbRoom = await getRoom(roomName);
              if (dbRoom) {
                await saveRoom({
                  ...dbRoom,
                  users: [],
                  lastActive: new Date()
                });
              }
            } catch (err) {
              console.error(`Error updating empty room ${roomName} after disconnect:`, err);
            }
          } else {
            // Emit updated user list to remaining users
            io.to(roomName).emit('roomUsers', rooms[roomName].users);
            
            // Update the database to reflect the current user list
            try {
              const dbRoom = await getRoom(roomName);
              if (dbRoom) {
                // Get the actual sockets currently in the room
                const socketsInRoom = io.sockets.adapter.rooms.get(roomName);
                const actualSocketIds = socketsInRoom ? Array.from(socketsInRoom) : [];
                
                // Filter out users whose sockets are no longer connected
                if (rooms[roomName] && rooms[roomName].users) {
                  const beforeFilter = rooms[roomName].users.length;
                  rooms[roomName].users = rooms[roomName].users.filter(user => 
                    actualSocketIds.includes(user.socketId)
                  );
                  const afterFilter = rooms[roomName].users.length;
                  
                  if (beforeFilter !== afterFilter) {
                    console.log(`Room ${roomName}: Filtered out ${beforeFilter - afterFilter} users who are not actually connected`);
                  }
                }
                
                await saveRoom({
                  ...dbRoom, 
                  users: rooms[roomName].users,
                  lastActive: new Date()
                });
              }
            } catch (err) {
              console.error(`Error updating room ${roomName} after disconnect:`, err);
            }
          }
          
          // Always broadcast room change after a disconnect
          broadcastRoomChange(roomName);
        }
      }
      
      // Leave all socket.io rooms
      userRooms.forEach(room => socket.leave(room));
      
      // Log room status after disconnect
      logRoomStatus();
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
      // Priority: Use authenticated user name first, fallback to provided name
      let userName;
      let userId;
      let isAuthenticated = socket.user.isAuthenticated;
      
      // If user is authenticated via JWT, always use their JWT name
      if (socket.user.isAuthenticated) {
        userName = socket.user.name;
        userId = socket.user.id;
      } 
      // If client sent authentication info in the message
      else if (message.isAuthenticated && message.userId) {
        userName = message.user;
        userId = message.userId;
        isAuthenticated = true;
      }
      // If not authenticated, use the provided name from the client
      else if (message.user && message.user !== 'Anonymous User') {
        userName = message.user;
        userId = socket.id;
      } 
      // Last resort fallback
      else {
        userName = message.user || socket.user.name;
        userId = socket.id;
      }
      
      const msgObj = { 
        ...message, 
        user: userName,
        userId: userId,
        isAuthenticated: isAuthenticated
      };
      
      console.log(`[Server] Message from ${userName} (${userId}) in room ${room}:`, message.text.substring(0, 20));
      
      // Send to all clients in the room except sender (to avoid duplicate messages)
      socket.to(room).emit("chat:message", msgObj);
      
      // Save to DB
      try {
        await saveMessage({ 
          room, 
          user: userName, 
          userId: userId,
          text: message.text,
          isAuthenticated: isAuthenticated
        });
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });
    
    // Handle "End Session" event from host
    socket.on('endSession', async ({ room }) => {
      console.log(`[Server] endSession received for room ${room}`);
      
      if (!room) return;
      
      try {
        // Check if user is the host of the room (from DB)
        const dbRoom = await getRoom(room);
        const userId = socket.user.id || socket.user._id || socket.user.email;
        
        // Make sure this request is coming from the room host
        const isHost = dbRoom && (dbRoom.host === userId);
        console.log(`User ${userId} requesting to end session for room ${room}. Is host: ${isHost}`);
        
        if (dbRoom && isHost) {
          // Get host name for better notification
          const hostName = socket.user?.name || "The host";
          
          // Notify all users in the room that the session has ended with host information
          io.to(room).emit('roomClosed', { 
            reason: `${hostName} has ended this study session`,
            hostId: userId
          });
          
          console.log(`Room ${room} closed by host ${hostName} (${userId})`);
          
          // Clean up the in-memory room data
          if (rooms[room]) {
            // Clear any running timers
            if (rooms[room].interval) {
              clearInterval(rooms[room].interval);
            }
            // Clear user list
            rooms[room].users = [];
            // Remove from memory
            delete rooms[room];
          }
          
          // Remove the room from the database (using deleteOne for complete removal)
          await Room.deleteOne({ name: room });
          
          // Also delete all messages associated with this room
          const Message = require('../models/Message');
          const deleteResult = await Message.deleteMany({ room: room });
          console.log(`Deleted ${deleteResult.deletedCount} messages for room ${room}`);
          
          console.log(`Room ${room} and its messages successfully ended and deleted`);
          
          // Give clients a moment to receive the notification before disconnecting
          setTimeout(() => {
            // Force disconnect all sockets in the room
            const socketsInRoom = io.sockets.adapter.rooms.get(room);
            if (socketsInRoom) {
              console.log(`Disconnecting ${socketsInRoom.size} sockets from room ${room}`);
              for (const socketId of socketsInRoom) {
                const socketToDisconnect = io.sockets.sockets.get(socketId);
                if (socketToDisconnect) {
                  socketToDisconnect.leave(room);
                }
              }
            }
            
            // Broadcast room change to all clients after cleanup
            broadcastRoomChange(room);
          }, 1000); // 1 second delay to ensure notifications are received
        } else {
          console.log(`User ${userId} attempted to end session for room ${room} but is not the host`);
        }
      } catch (err) {
        console.error(`Error ending session for room ${room}:`, err);
      }
    });
  });
};
