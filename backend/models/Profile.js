// models/Profile.js
import { Schema, model } from "mongoose";
const profileSchema = new Schema({
  user: { type: String, required: true, unique: true },
  bio: { type: String, default: "" },
});
export default model("Profile", profileSchema);
