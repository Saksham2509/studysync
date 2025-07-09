const jwt = require('jsonwebtoken');

module.exports = (io, next) => {
  const token = io.handshake.auth && io.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token required'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    io.user = decoded;
    return next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
};
