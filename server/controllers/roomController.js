const Room = require('../models/Room');

// Save or update a room
async function saveRoom({ name, host, users }) {
  let room = await Room.findOne({ name });
  if (!room) {
    room = new Room({ 
      name, 
      host, 
      users, 
      isPublic: true, // All rooms are now public
      lastActive: new Date()
    });
  } else {
    room.host = host;
    room.users = users; // Update the full user list
    room.lastActive = new Date(); // Update the last active timestamp
    room.isPublic = true; // Ensure all rooms are public
  }
  await room.save();
  return room;
}

// Get room info
async function getRoom(name) {
  return Room.findOne({ name }).lean();
}

module.exports = { saveRoom, getRoom };
