import { Schema, model } from "mongoose";
import { genSalt, hash as _hash, compare } from "bcrypt";
import Profile from "./Profile.js";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    isAdmin: { type: Boolean, required: true, default: false },
    dateCreated: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    profileImageUrl: { type: String }, // The S3 URL
    s3Key: { type: String }, // The file path in the bucket (useful for deleting later)
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  const user = this;

  if (user.isNew) {
    // Create a blank profile
    const newProfile = await Profile.create({
      user: user.username,
      bio: "No bio provided.",
    });
    this.profileId = newProfile._id;
  }
});

// CASCADE DELETE HOOK
// Runs after a user is successfully deleted via findOneAndDelete
userSchema.post("findOneAndDelete", async function (doc) {
  // Check if a document was actually deleted
  if (doc) {
    // Delete the associated Profile
    await model("Profile").deleteOne({ _id: doc.profileId });

    console.log(`Associated profile ${doc.profileId} was deleted.`);
  }
});

// Helper method to compare passwords later (for login)
userSchema.methods.comparePassword = async function (candidatePassword) {
  return compare(candidatePassword, this.password);
};

const User = model("User", userSchema);

export default User;
