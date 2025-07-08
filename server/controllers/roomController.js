const Room = require('../models/Room');

// Save or update a room
async function saveRoom({ name, host, users }) {
  let room = await Room.findOne({ name });
  if (!room) {
    room = new Room({ name, host, users });
  } else {
    room.host = host;
    room.users = users;
  }
  await room.save();
  return room;
}

// Get room info
async function getRoom(name) {
  return Room.findOne({ name }).lean();
}

module.exports = { saveRoom, getRoom };
