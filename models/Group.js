const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      minlength: [3, "Group name must be at least 3 characters"],
      maxlength: [100, "Group name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Group description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Sports",
        "Technology",
        "Arts & Culture",
        "Education",
        "Business",
        "Health & Wellness",
        "Community Service",
        "Entertainment",
        "Food & Dining",
        "Travel",
        "Other",
      ],
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    avatar: {
      type: String,
      default: "",
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    memberCount: {
      type: Number,
      default: 0,
    },
    postCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
groupSchema.index({ name: "text", description: "text" });
groupSchema.index({ category: 1 });
groupSchema.index({ creator: 1 });

// Update member count before saving
groupSchema.pre("save", function (next) {
  this.memberCount = this.members.length;
  next();
});

module.exports = mongoose.model("Group", groupSchema);
