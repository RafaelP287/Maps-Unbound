// models/Profile.js
const mongoose = require('mongoose');
const profileSchema = new mongoose.Schema({
  bio: { type: String, default: "" }
});
module.exports = mongoose.model('Profile', profileSchema);
