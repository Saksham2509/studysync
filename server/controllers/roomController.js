const Room = require('../models/Room');
const bcrypt = require('bcrypt');

// Save or update a room
async function saveRoom({ name, host, users, isPublic = true, password, allowedUsers = [] }) {
  let room = await Room.findOne({ name });
  if (!room) {
    // Hash password if provided for new room
    let hashedPassword = null;
    if (!isPublic && password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    room = new Room({ 
      name, 
      host, 
      users, 
      isPublic, 
      password: hashedPassword,
      allowedUsers,
      lastActive: new Date()
    });
  } else {
    room.host = host;
    room.users = users; // Update the full user list
    room.lastActive = new Date(); // Update the last active timestamp
    
    if (typeof isPublic === 'boolean') room.isPublic = isPublic;
    if (Array.isArray(allowedUsers)) room.allowedUsers = allowedUsers;
    
    // Update password if provided (only for existing rooms when host changes it)
    if (!isPublic && password && password !== room.password) {
      room.password = await bcrypt.hash(password, 10);
    }
  }
  await room.save();
  return room;
}

// Verify room password
async function verifyRoomPassword(roomName, password) {
  const room = await Room.findOne({ name: roomName });
  if (!room) {
    return { success: false, error: 'Room not found' };
  }
  
  // If room is public, no password needed
  if (room.isPublic) {
    return { success: true };
  }
  
  // Private room - password is required
  if (!password) {
    return { success: false, error: 'Password required for private room' };
  }
  
  // All private rooms should have passwords now, but check for backward compatibility
  if (!room.password) {
    return { success: false, error: 'This private room has no password set' };
  }
  
  // Check password
  const isValid = await bcrypt.compare(password, room.password);
  return { 
    success: isValid, 
    error: isValid ? null : 'Incorrect password' 
  };
}

// Get room info
async function getRoom(name) {
  return Room.findOne({ name }).lean();
}

module.exports = { saveRoom, getRoom, verifyRoomPassword };
