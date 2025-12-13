const User = require("../models/User");

async function login(username, password) {
  // Validate Input
  if (!username || !password) {
    const error = new Error("Username and password are required");
    error.status = 422; 
    throw error; 
  }

  // Find User
  const user = await User.findOne({ username: username });

  // Validate User and Password
  if (!user || !(await user.comparePassword(password))) {
    const error = new Error("Invalid login credentials");
    error.status = 403
    throw error;
  }

  // Success: Return the user
  return user;
}

module.exports = { login };
