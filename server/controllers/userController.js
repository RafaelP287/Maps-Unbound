const User = require('../models/User');

async function createUser(username, email, password) {
  // Creates a new user
  const newUser = new User({ username, email, password });
  return await newUser.save();
}

async function deleteUser(username) {
  // Delete from database and save to MongoDB
  const query = { username: username }; 
  const deletedDocument = await User.findOneAndDelete(query);

  if (deletedDocument) {
    console.log("Document found and deleted:", deletedDocument);
  } else {
    console.log("No document found matching the criteria.");
  }
}

module.exports = { createUser };
