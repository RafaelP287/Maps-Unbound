// models/Profile.js
const mongoose = require("mongoose");
const profileSchema = new mongoose.Schema({
  user: { type: String, required: true, unique: true },
  bio: { type: String, default: "" },
});
module.exports = mongoose.model("Profile", profileSchema);
