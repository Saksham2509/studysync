const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  host: { type: String }, // host's user ID or email
  users: [{
    id: String,        // socket ID
    socketId: String,  // duplicate of id for clarity
    userId: String,    // persistent user ID (from auth)
    name: String,      // display name
    isAuthenticated: Boolean,
    joinedAt: Date
  }],
  isPublic: { type: Boolean, default: true }, // Always true now, kept for backward compatibility
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);
