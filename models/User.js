const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: [2, "Name must be at least 2 characters"],
    maxlength: [50, "Name cannot exceed 50 characters"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email",
    ],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false, // Don't return password by default in queries
  },
  avatar: {
    type: String,
    default: "https://via.placeholder.com/150",
  },
  bio: {
    type: String,
    maxlength: [200, "Bio cannot exceed 200 characters"],
    default: "",
  },
  eventsCreated: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
  ],
  eventsAttending: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
  ],
  savedEvents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
  ],
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash password if it's modified
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update the updatedAt field before saving
userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to compare password for login
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to get public profile (without sensitive data)
userSchema.methods.toPublicProfile = function () {
  // Helper function to extract IDs from populated fields
  const extractIds = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
      // If it's null or undefined
      if (!item) return null;
      // If it's already a string
      if (typeof item === 'string') return item;
      // If it's a populated object with _id
      if (item._id) {
        // Handle nested ObjectId
        return typeof item._id === 'string' ? item._id : item._id.toString();
      }
      // If it's a plain ObjectId
      if (item.toString) {
        return item.toString();
      }
      return String(item);
    }).filter(id => id !== null); // Remove null values
  };

  return {
    _id: this._id,
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    bio: this.bio,
    eventsCreated: extractIds(this.eventsCreated),
    eventsAttending: extractIds(this.eventsAttending),
    savedEvents: extractIds(this.savedEvents),
    followers: extractIds(this.followers),
    following: extractIds(this.following),
    createdAt: this.createdAt,
  };
};

// Create indexes
userSchema.index({ email: 1 });
userSchema.index({ name: "text" });

module.exports = mongoose.model("User", userSchema);
