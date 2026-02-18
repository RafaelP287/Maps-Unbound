import User from "../models/User.js";

// Returns a query of all users
async function getUsers() {
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

export { getUsers, getUser, createUser, deleteUser };
