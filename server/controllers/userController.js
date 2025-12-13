const User = require("../models/User");

// Creates a new user
async function createUser(username, email, password) {
  const newUser = new User({ username, email, password });
  return await newUser.save();
}

// Find and delete by username
async function deleteUser(username) {
  return await User.findOneAndDelete({
    username: username,
  });
}

module.exports = { createUser, deleteUser };
