const User = require("../models/User");

// Returns a query of all users
async function getAllUsers() {
  return User.find({})
}

// Returns a query for a single user
async function getUser(username) {
  return User.findOne({username: username})
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

module.exports = { getAllUsers, getUser, createUser, deleteUser };
