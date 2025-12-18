const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Profile = require('./Profile'); // Import Profile

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true},
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  is_admin: { type: Boolean, required: true, default: false },
  dateCreated: { type: Date, default: Date.now },
  profileId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Profile' 
  }
});

// Mongoose "Pre-Save" Hook
// This function runs before saving a document to the database
userSchema.pre("save", async function () {
  const user = this;

  if (user.isNew) {
    // Create a blank profile
    const newProfile = await Profile.create({ bio: "No bio provided." });
    this.profileId = newProfile._id;
  }

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) return;
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);

    // Hash the password along with the new salt
    const hash = await bcrypt.hash(user.password, salt);

    // Override the cleartext password with the hashed one
    user.password = hash;
  } catch (error) {
    return next(error);
  }
});

// Helper method to compare passwords later (for login)
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
