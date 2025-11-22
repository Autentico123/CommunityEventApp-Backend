const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Event = require("../models/Event");
const Group = require("../models/Group");
const { protect: auth } = require("../middleware/auth");
const {
  uploadAvatar,
  handleUploadError,
} = require("../middleware/uploadMiddleware");

// POST upload avatar
router.post("/upload-avatar", auth, async (req, res) => {
  uploadAvatar(req, res, async (err) => {
    if (err) {
      return handleUploadError(err, req, res, () => {});
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No avatar file provided",
      });
    }

    try {
      // Cloudinary returns the full URL in req.file.path
      const avatarUrl = req.file.path;

      // Update user's avatar in database
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { avatar: avatarUrl },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      console.log(`✅ Avatar updated for user ${user.name}: ${avatarUrl}`);

      res.status(200).json({
        success: true,
        message: "Avatar uploaded successfully",
        avatarUrl: avatarUrl,
        user: user,
      });
    } catch (error) {
      console.error("Error updating user avatar:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update avatar in database",
      });
    }
  });
});

// Get recommended users based on shared interests, events, and groups
router.get("/recommendations", auth, async (req, res) => {
  try {
    console.log("📋 Recommendations request from user:", req.user.id);

    const currentUser = await User.findById(req.user.id);

    if (!currentUser) {
      console.error("❌ Current user not found");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Current user found:", currentUser.name);
    console.log("📊 User has:", {
      savedEvents: currentUser.savedEvents?.length || 0,
      eventsAttending: currentUser.eventsAttending?.length || 0,
    });

    // Get user's interests from saved and attending events
    const savedEventIds = Array.isArray(currentUser.savedEvents)
      ? currentUser.savedEvents.map((e) =>
          e._id ? e._id.toString() : e.toString()
        )
      : [];
    const attendingEventIds = Array.isArray(currentUser.eventsAttending)
      ? currentUser.eventsAttending.map((e) =>
          e._id ? e._id.toString() : e.toString()
        )
      : [];
    const userEventIds = [...savedEventIds, ...attendingEventIds];

    console.log("🎫 User event IDs:", userEventIds.length);

    // Get user's groups
    const userGroups = await Group.find({ members: req.user.id }).select("_id");
    const userGroupIds = userGroups.map((g) => g._id.toString());

    console.log("👥 User group IDs:", userGroupIds.length);

    // Find users with similar interests (only if user has events)
    let recommendedUsers = [];
    if (userEventIds.length > 0) {
      recommendedUsers = await User.find({
        _id: { $ne: req.user.id }, // Exclude current user
        $or: [
          { savedEvents: { $in: userEventIds } },
          { eventsAttending: { $in: userEventIds } },
        ],
      })
        .select("name email avatar bio")
        .limit(20);
      console.log(
        "🔍 Found",
        recommendedUsers.length,
        "users with shared events"
      );
    }

    // Find users in same groups (only if user is in groups)
    let groupUsers = [];
    if (userGroupIds.length > 0) {
      groupUsers = await Group.find({ _id: { $in: userGroupIds } })
        .populate({
          path: "members",
          select: "name email avatar bio",
          match: { _id: { $ne: req.user.id } },
        })
        .select("members");
      console.log("🔍 Found", groupUsers.length, "groups with members");
    }

    // If no recommendations yet, get some random active users
    if (recommendedUsers.length === 0 && groupUsers.length === 0) {
      console.log("🎲 No matches, getting random users...");
      recommendedUsers = await User.find({
        _id: { $ne: req.user.id },
        isActive: true,
      })
        .select("name email avatar bio")
        .limit(10);
      console.log("🔍 Found", recommendedUsers.length, "random users");
    }

    // Combine and score users
    const userScores = new Map();

    // Score by shared events
    for (const user of recommendedUsers) {
      const userId = user._id.toString();
      if (!userScores.has(userId)) {
        userScores.set(userId, { user, score: 0 });
      }
      userScores.get(userId).score += 1;
    }

    // Score by shared groups (higher weight)
    for (const group of groupUsers) {
      if (Array.isArray(group.members)) {
        for (const member of group.members) {
          if (member && member._id) {
            const userId = member._id.toString();
            if (!userScores.has(userId)) {
              userScores.set(userId, { user: member, score: 0 });
            }
            userScores.get(userId).score += 2;
          }
        }
      }
    }

    // Convert to array and sort by score
    const sortedUsers = Array.from(userScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => item.user);

    console.log("✅ Returning", sortedUsers.length, "recommended users");

    res.json(sortedUsers);
  } catch (error) {
    console.error("❌ Error getting recommendations:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Search users by name or email
router.get("/search", auth, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
      .select("name email avatar bio")
      .limit(10);

    res.json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user profile by ID
router.get("/:userId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("name email avatar bio createdAt")
      .populate("savedEvents", "title date location category")
      .populate("eventsAttending", "title date location category");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's groups
    const groups = await Group.find({ members: req.params.userId })
      .select("name description category memberCount")
      .limit(5);

    res.json({
      ...user.toObject(),
      groups,
    });
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
