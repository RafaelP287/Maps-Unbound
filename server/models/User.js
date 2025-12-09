const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  is_admin: { type: Boolean, required: true, default: false },
});

// Mongoose "Pre-Save" Hook
// This function runs before saving a document to the database
userSchema.pre('save', async function () {
  const user = this;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) return;

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

// Optional: Helper method to compare passwords later (for login)
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
