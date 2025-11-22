const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Post content is required"],
      trim: true,
      maxlength: [2000, "Post cannot exceed 2000 characters"],
    },
    image: {
      type: String,
      default: "",
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
postSchema.index({ group: 1, createdAt: -1 });
postSchema.index({ author: 1 });

// Update like count before saving
postSchema.pre("save", function (next) {
  this.likeCount = this.likes.length;
  next();
});

module.exports = mongoose.model("Post", postSchema);
