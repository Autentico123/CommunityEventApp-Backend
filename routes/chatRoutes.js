const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// Get all conversations for a user
router.get("/conversations", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all messages where user is sender or receiver
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender", "name avatar")
      .populate("receiver", "name avatar")
      .sort({ createdAt: -1 });

    // Group by conversation partner
    const conversationsMap = new Map();

    messages.forEach((msg) => {
      const partnerId =
        msg.sender._id.toString() === userId.toString()
          ? msg.receiver._id.toString()
          : msg.sender._id.toString();

      if (!conversationsMap.has(partnerId)) {
        const partner =
          msg.sender._id.toString() === userId.toString()
            ? msg.receiver
            : msg.sender;

        conversationsMap.set(partnerId, {
          partner,
          lastMessage: msg,
          unreadCount: 0,
        });
      }

      // Count unread messages
      if (msg.receiver._id.toString() === userId.toString() && !msg.read) {
        conversationsMap.get(partnerId).unreadCount++;
      }
    });

    const conversations = Array.from(conversationsMap.values());

    res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching conversations",
      error: error.message,
    });
  }
});

// Get chat history with a specific user
router.get("/messages/:userId", protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId },
      ],
    })
      .populate("sender", "name avatar")
      .populate("receiver", "name avatar")
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { sender: otherUserId, receiver: currentUserId, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching messages",
      error: error.message,
    });
  }
});

// Send a message (REST fallback, mainly use Socket.io)
router.post("/send", protect, async (req, res) => {
  try {
    const { receiver, message } = req.body;
    const sender = req.user._id;

    if (!receiver || !message) {
      return res.status(400).json({
        success: false,
        message: "Receiver and message are required",
      });
    }

    const newMessage = await Message.create({
      sender,
      receiver,
      message,
    });

    await newMessage.populate("sender", "name avatar");
    await newMessage.populate("receiver", "name avatar");

    res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Error sending message",
      error: error.message,
    });
  }
});

// Delete a message
router.delete("/messages/:messageId", protect, async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Only sender can delete their message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this message",
      });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting message",
      error: error.message,
    });
  }
});

// Get unread message count
router.get("/unread-count", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Message.countDocuments({
      receiver: userId,
      read: false,
    });

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching unread count",
      error: error.message,
    });
  }
});

// Search users to chat with
router.get("/search-users", protect, async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user._id;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const users = await User.find({
      _id: { $ne: currentUserId }, // Exclude current user
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
      .select("name email avatar bio")
      .limit(20);

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({
      success: false,
      message: "Error searching users",
      error: error.message,
    });
  }
});

module.exports = router;
