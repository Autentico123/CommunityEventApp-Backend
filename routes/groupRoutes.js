const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const { protect: auth } = require("../middleware/auth");

// @route   GET /api/groups
// @desc    Get all groups with filters
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { category, search, sort = "-createdAt" } = req.query;

    let query = {};

    // Category filter
    if (category && category !== "All") {
      query.category = category;
    }

    // Search filter
    if (search) {
      query.$text = { $search: search };
    }

    const groups = await Group.find(query)
      .populate("creator", "name email avatar")
      .sort(sort)
      .lean();

    res.json({ success: true, count: groups.length, data: groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/groups/:id
// @desc    Get single group by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("creator", "name email avatar")
      .populate("admins", "name email avatar")
      .populate("members", "name email avatar");

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    res.json({ success: true, data: group });
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/groups
// @desc    Create new group
// @access  Protected
router.post("/", auth, async (req, res) => {
  try {
    const { name, description, category, avatar, isPrivate } = req.body;

    // Check if group name already exists
    const existingGroup = await Group.findOne({ name });
    if (existingGroup) {
      return res
        .status(400)
        .json({ success: false, message: "Group name already exists" });
    }

    const group = await Group.create({
      name,
      description,
      category,
      avatar: avatar || "",
      isPrivate: isPrivate || false,
      creator: req.user.id,
      admins: [req.user.id],
      members: [req.user.id],
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("creator", "name email avatar")
      .populate("admins", "name email avatar")
      .populate("members", "name email avatar");

    res.status(201).json({ success: true, data: populatedGroup });
  } catch (error) {
    console.error("Error creating group:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(", ") });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   PUT /api/groups/:id
// @desc    Update group
// @access  Protected (Admin only)
router.put("/:id", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    // Check if user is admin
    const isAdmin = group.admins.some(
      (admin) => admin.toString() === req.user.id
    );
    if (!isAdmin) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to update this group",
        });
    }

    const { name, description, category, avatar, isPrivate } = req.body;

    group.name = name || group.name;
    group.description = description || group.description;
    group.category = category || group.category;
    group.avatar = avatar !== undefined ? avatar : group.avatar;
    group.isPrivate = isPrivate !== undefined ? isPrivate : group.isPrivate;

    await group.save();

    const updatedGroup = await Group.findById(group._id)
      .populate("creator", "name email avatar")
      .populate("admins", "name email avatar")
      .populate("members", "name email avatar");

    res.json({ success: true, data: updatedGroup });
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   DELETE /api/groups/:id
// @desc    Delete group
// @access  Protected (Creator only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    // Only creator can delete group
    if (group.creator.toString() !== req.user.id) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to delete this group",
        });
    }

    // Delete all posts and comments in the group
    const posts = await Post.find({ group: req.params.id });
    const postIds = posts.map((post) => post._id);
    await Comment.deleteMany({ post: { $in: postIds } });
    await Post.deleteMany({ group: req.params.id });

    await group.deleteOne();

    res.json({ success: true, message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/groups/:id/join
// @desc    Join group
// @access  Protected
router.post("/:id/join", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    // Check if already a member
    const isMember = group.members.some(
      (member) => member.toString() === req.user.id
    );

    if (isMember) {
      return res
        .status(400)
        .json({ success: false, message: "Already a member of this group" });
    }

    group.members.push(req.user.id);
    await group.save();

    res.json({
      success: true,
      message: "Joined group successfully",
      joined: true,
    });
  } catch (error) {
    console.error("Error joining group:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/groups/:id/leave
// @desc    Leave group
// @access  Protected
router.post("/:id/leave", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    // Can't leave if you're the creator
    if (group.creator.toString() === req.user.id) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Creator cannot leave the group. Delete it instead.",
        });
    }

    // Remove from members
    group.members = group.members.filter(
      (member) => member.toString() !== req.user.id
    );

    // Remove from admins if admin
    group.admins = group.admins.filter(
      (admin) => admin.toString() !== req.user.id
    );

    await group.save();

    res.json({
      success: true,
      message: "Left group successfully",
      joined: false,
    });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/groups/:id/posts
// @desc    Get all posts in a group
// @access  Public
router.get("/:id/posts", async (req, res) => {
  try {
    const { sort = "-isPinned -createdAt" } = req.query;

    const posts = await Post.find({ group: req.params.id })
      .populate("author", "name email avatar")
      .sort(sort)
      .lean();

    res.json({ success: true, count: posts.length, data: posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/groups/:id/posts
// @desc    Create post in group
// @access  Protected (Members only)
router.post("/:id/posts", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    // Check if user is a member
    const isMember = group.members.some(
      (member) => member.toString() === req.user.id
    );
    if (!isMember) {
      return res
        .status(403)
        .json({ success: false, message: "Must be a member to post" });
    }

    const { content, image } = req.body;

    const post = await Post.create({
      group: req.params.id,
      author: req.user.id,
      content,
      image: image || "",
    });

    // Update group post count
    group.postCount += 1;
    await group.save();

    const populatedPost = await Post.findById(post._id).populate(
      "author",
      "name email avatar"
    );

    res.status(201).json({ success: true, data: populatedPost });
  } catch (error) {
    console.error("Error creating post:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(", ") });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   DELETE /api/groups/posts/:postId
// @desc    Delete post
// @access  Protected (Author or Admin)
router.delete("/posts/:postId", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const group = await Group.findById(post.group);

    // Check if user is author or admin
    const isAuthor = post.author.toString() === req.user.id;
    const isAdmin = group.admins.some(
      (admin) => admin.toString() === req.user.id
    );

    if (!isAuthor && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Delete all comments on this post
    await Comment.deleteMany({ post: req.params.postId });

    await post.deleteOne();

    // Update group post count
    group.postCount = Math.max(0, group.postCount - 1);
    await group.save();

    res.json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/groups/posts/:postId/like
// @desc    Toggle like on post
// @access  Protected
router.post("/posts/:postId/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const likeIndex = post.likes.indexOf(req.user.id);

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
      await post.save();
      res.json({ success: true, liked: false, likeCount: post.likeCount });
    } else {
      // Like
      post.likes.push(req.user.id);
      await post.save();
      res.json({ success: true, liked: true, likeCount: post.likeCount });
    }
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/groups/posts/:postId/comments
// @desc    Get comments for a post
// @access  Public
router.get("/posts/:postId/comments", async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate("author", "name email avatar")
      .sort("-createdAt")
      .lean();

    res.json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/groups/posts/:postId/comments
// @desc    Add comment to post
// @access  Protected
router.post("/posts/:postId/comments", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const { content } = req.body;

    const comment = await Comment.create({
      post: req.params.postId,
      author: req.user.id,
      content,
    });

    // Update post comment count
    post.commentCount += 1;
    await post.save();

    const populatedComment = await Comment.findById(comment._id).populate(
      "author",
      "name email avatar"
    );

    res.status(201).json({ success: true, data: populatedComment });
  } catch (error) {
    console.error("Error creating comment:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(", ") });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   DELETE /api/groups/comments/:commentId
// @desc    Delete comment
// @access  Protected (Author or Admin)
router.delete("/comments/:commentId", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    const post = await Post.findById(comment.post);
    const group = await Group.findById(post.group);

    // Check if user is author or admin
    const isAuthor = comment.author.toString() === req.user.id;
    const isAdmin = group.admins.some(
      (admin) => admin.toString() === req.user.id
    );

    if (!isAuthor && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    await comment.deleteOne();

    // Update post comment count
    post.commentCount = Math.max(0, post.commentCount - 1);
    await post.save();

    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
