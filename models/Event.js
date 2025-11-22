const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  coordinates: {
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
  },
  category: {
    type: String,
    required: true,
    enum: [
      "Community",
      "Music",
      "Sports",
      "Education",
      "Social",
      "Food",
      "Other",
    ],
    default: "Community",
  },
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  dateTime: {
    type: Date,
    required: true,
  },
  attendees: {
    type: Number,
    default: 0,
    min: 0,
  },
  capacity: {
    type: Number,
    default: null, // null means unlimited capacity
    min: 1,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Make optional for backward compatibility with existing events
  },
  attendeesList: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  image: {
    type: String,
    default: "📌",
  },
  imageUrl: {
    type: String,
    default: null, // Actual image URL for uploaded photos
  },
  status: {
    type: String,
    enum: ["draft", "published", "cancelled"],
    default: "published",
  },
  isUserCreated: {
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

// Update the updatedAt field before saving
eventSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for better query performance
eventSchema.index({ title: "text", description: "text", location: "text" });
eventSchema.index({ category: 1 });
eventSchema.index({ dateTime: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ "coordinates.latitude": 1, "coordinates.longitude": 1 });

module.exports = mongoose.model("Event", eventSchema);
