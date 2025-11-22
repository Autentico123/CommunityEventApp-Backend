const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Configure appropriately for production
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/communityevents";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
const eventRoutes = require("./routes/eventRoutes");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const groupRoutes = require("./routes/groupRoutes");
const userRoutes = require("./routes/userRoutes");

app.use("/api/events", eventRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/users", userRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Community Event API is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: err.message,
  });
});

// Socket.io connection handling
const connectedUsers = new Map(); // userId -> socketId

io.on("connection", (socket) => {
  console.log("👤 User connected:", socket.id);

  // User authentication and registration
  socket.on("register", (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // Send message
  socket.on("sendMessage", async (data) => {
    try {
      console.log("📥 Received message data:", JSON.stringify(data, null, 2));

      const { sender, receiver, message } = data;

      console.log("📤 Extracted fields:", {
        sender,
        receiver,
        message: message ? message.substring(0, 50) : "undefined",
        hasSender: !!sender,
        hasReceiver: !!receiver,
        hasMessage: !!message,
      });

      // Validate required fields
      if (!sender || !receiver || !message) {
        const error = `Missing fields - sender: ${!!sender}, receiver: ${!!receiver}, message: ${!!message}`;
        console.error("❌ Validation failed:", error);
        throw new Error("Sender, receiver, and message are required");
      }

      // Save message to database
      const Message = require("./models/Message");
      const newMessage = await Message.create({
        sender,
        receiver,
        message,
      });

      console.log("✅ Message saved to database:", newMessage._id);

      // Populate sender and receiver info
      await newMessage.populate("sender", "name avatar");
      await newMessage.populate("receiver", "name avatar");

      // Send to receiver if online
      const receiverSocketId = connectedUsers.get(receiver);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
        console.log("📨 Message sent to receiver:", receiver);
      } else {
        console.log("⚠️ Receiver not online:", receiver);
      }

      // Send confirmation to sender
      socket.emit("messageSent", newMessage);
      console.log("✅ Message confirmation sent to sender");
    } catch (error) {
      console.error("❌ Error sending message:", error.message);
      socket.emit("messageError", { error: error.message });
    }
  });

  // Mark messages as read
  socket.on("markAsRead", async (data) => {
    try {
      const { messageIds, userId } = data;
      const Message = require("./models/Message");

      await Message.updateMany(
        { _id: { $in: messageIds }, receiver: userId },
        { read: true, readAt: new Date() }
      );

      socket.emit("messagesMarkedRead", { messageIds });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  // Typing indicator
  socket.on("typing", (data) => {
    const { receiver, sender } = data;
    const receiverSocketId = connectedUsers.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { userId: sender });
    }
  });

  socket.on("stopTyping", (data) => {
    const { receiver, sender } = data;
    const receiverSocketId = connectedUsers.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStoppedTyping", { userId: sender });
    }
  });

  // Disconnection
  socket.on("disconnect", () => {
    // Remove user from connected users
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
    console.log("👋 User disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`💬 Socket.io is ready for real-time chat`);
});
