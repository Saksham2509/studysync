const Message = require('../models/Message');

// Save a new message
async function saveMessage({ room, user, text }) {
  const msg = new Message({ room, user, text });
  await msg.save();
  return msg;
}

// Get message history for a room
async function getRoomMessages(room) {
  // Limit to last 50 messages, sorted oldest to newest
  return Message.find({ room }).sort({ createdAt: 1 }).limit(50).lean();
}

module.exports = { saveMessage, getRoomMessages };
