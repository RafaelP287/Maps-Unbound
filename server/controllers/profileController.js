const Profile = require("../models/Profile");

// Edit a user's bio via username
async function updateBio(username, bio) {
  const filter = { user: username };
  const update = { bio: bio };

  return await Profile.findOneAndUpdate(filter, update, {new: true});
}

module.exports = { updateBio };
