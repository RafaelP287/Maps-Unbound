const User = require("../models/User");

// Returns a query of all users
async function getUsers() {
  return User.find({})
}

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

module.exports = { getUsers, createUser, deleteUser };
