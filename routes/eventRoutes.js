const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const User = require("../models/User");
const { protect, optionalAuth } = require("../middleware/auth");
const {
  uploadEventImage,
  handleUploadError,
} = require("../middleware/uploadMiddleware");

// Helper function to get category emoji
const getCategoryEmoji = (category) => {
  const emojiMap = {
    Community: "👥",
    Music: "🎵",
    Sports: "⚽",
    Education: "📚",
    Social: "🎉",
    Food: "🍽️",
    Other: "📌",
  };
  return emojiMap[category] || "📌";
};

// POST upload event image
router.post("/upload-image", protect, (req, res) => {
  uploadEventImage(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, () => {});
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    // Return the URL path to the uploaded image
    const imageUrl = `/uploads/events/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: imageUrl,
      filename: req.file.filename,
    });
  });
});

// GET all events
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      category,
      search,
      status,
      sortBy = "dateTime",
      order = "asc",
    } = req.query;

    let query = {};

    // Filter by category
    if (category && category !== "All") {
      query.category = category;
    }

    // Filter by status (default to showing only published events for public view)
    if (status) {
      query.status = status;
    } else {
      // By default, only show published events unless user specifies otherwise
      query.status = "published";
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    const sortOrder = order === "desc" ? -1 : 1;

    const events = await Event.find(query)
      .populate("creator", "name avatar")
      .populate("attendeesList", "name avatar")
      .sort({ [sortBy]: sortOrder })
      .lean();

    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch events",
      message: error.message,
    });
  }
});

// GET single event by ID
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("creator", "name avatar email")
      .populate("attendeesList", "name avatar");

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch event",
      message: error.message,
    });
  }
});

// POST create new event
router.post("/", protect, async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      category,
      date,
      time,
      dateTime,
      imageUrl,
      capacity,
      coordinates,
      status,
    } = req.body;

    // Validation
    if (!title || !location || !date || !time) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: title, location, date, and time are required",
      });
    }

    const newEvent = new Event({
      title,
      description,
      location,
      coordinates: coordinates || { latitude: null, longitude: null },
      category: category || "Community",
      date,
      time,
      dateTime: dateTime || new Date(),
      image: getCategoryEmoji(category || "Community"),
      imageUrl: imageUrl || null,
      capacity: capacity || null,
      status: status || "published",
      isUserCreated: true,
      attendees: 0,
      creator: req.user._id, // Add creator from authenticated user
    });

    const savedEvent = await newEvent.save();

    // Add event to user's createdEvents
    await User.findByIdAndUpdate(req.user._id, {
      $push: { eventsCreated: savedEvent._id },
    });

    // Populate creator info before sending response
    await savedEvent.populate("creator", "name avatar");

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: savedEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create event",
      message: error.message,
    });
  }
});

// PUT update event
router.put("/:id", protect, async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      category,
      date,
      time,
      dateTime,
      attendees,
      imageUrl,
      capacity,
      coordinates,
      status,
    } = req.body;

    // Check if user is the creator
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    if (event.creator && event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this event",
      });
    }

    const updateData = {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(location && { location }),
      ...(category && { category, image: getCategoryEmoji(category) }),
      ...(date && { date }),
      ...(time && { time }),
      ...(dateTime && { dateTime }),
      ...(attendees !== undefined && { attendees }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(capacity !== undefined && { capacity }),
      ...(coordinates && { coordinates }),
      ...(status && { status }),
      updatedAt: Date.now(),
    };

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("creator", "name avatar");

    res.json({
      success: true,
      message: "Event updated successfully",
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update event",
      message: error.message,
    });
  }
});

// DELETE event
router.delete("/:id", protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    // Check if user is the creator
    if (event.creator && event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this event",
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    // Remove event from user's createdEvents
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { eventsCreated: req.params.id },
    });

    // Remove event from all users' attending and saved lists
    await User.updateMany(
      {},
      {
        $pull: {
          eventsAttending: req.params.id,
          savedEvents: req.params.id,
        },
      }
    );

    res.json({
      success: true,
      message: "Event deleted successfully",
      event,
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete event",
      message: error.message,
    });
  }
});

// PATCH increment attendees (toggle attend/unattend)
router.patch("/:id/attend", protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    const userId = req.user._id;
    const isAttending = event.attendeesList.some(
      (id) => id.toString() === userId.toString()
    );

    console.log(`User ${userId} attendance status BEFORE: ${isAttending}`);

    if (isAttending) {
      // Remove user from attendees
      event.attendeesList = event.attendeesList.filter(
        (id) => id.toString() !== userId.toString()
      );
      event.attendees = Math.max(0, event.attendees - 1);

      // Remove event from user's attending list
      await User.findByIdAndUpdate(userId, {
        $pull: { eventsAttending: event._id },
      });
    } else {
      // Check if event is at capacity
      if (event.capacity && event.attendeesList.length >= event.capacity) {
        return res.status(400).json({
          success: false,
          error: "Event is at full capacity",
          message: `This event has reached its maximum capacity of ${event.capacity} attendees`,
          isFull: true,
        });
      }

      // Add user to attendees
      event.attendeesList.push(userId);
      event.attendees += 1;

      // Add event to user's attending list
      await User.findByIdAndUpdate(userId, {
        $addToSet: { eventsAttending: event._id },
      });
    }

    await event.save();
    await event.populate("creator", "name avatar");
    await event.populate("attendeesList", "name avatar");

    const newAttendingState = !isAttending;
    console.log(`User ${userId} attendance status AFTER: ${newAttendingState}`);

    res.json({
      success: true,
      message: isAttending
        ? "Removed from event attendees"
        : "Added to event attendees",
      event,
      attending: newAttendingState,
      spotsRemaining: event.capacity
        ? event.capacity - event.attendeesList.length
        : null,
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update attendance",
      message: error.message,
    });
  }
});

// POST save/unsave event
router.post("/:id/save", protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    const user = await User.findById(req.user._id);
    const isSaved = user.savedEvents.some(
      (savedId) => savedId.toString() === event._id.toString()
    );

    console.log("💾 Save event request:", {
      userId: req.user._id,
      eventId: event._id,
      isSaved,
      action: isSaved ? "unsave" : "save",
    });

    if (isSaved) {
      // Remove from saved events
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { savedEvents: event._id },
      });
    } else {
      // Add to saved events
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { savedEvents: event._id },
      });
    }

    const saved = !isSaved;
    console.log("✅ Save event result:", saved ? "saved" : "unsaved");

    res.json({
      success: true,
      message: isSaved ? "Event removed from saved" : "Event saved",
      saved: saved,
      isSaved: saved,
    });
  } catch (error) {
    console.error("❌ Error saving event:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save event",
      message: error.message,
    });
  }
});

// PATCH update event status
router.patch("/:id/status", protect, async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status value
    const validStatuses = ["draft", "published", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid status value. Must be 'draft', 'published', or 'cancelled'",
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    // Check if user is the creator
    if (event.creator && event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Only the event creator can change its status",
      });
    }

    event.status = status;
    await event.save();

    res.json({
      success: true,
      message: `Event status updated to ${status}`,
      event,
    });
  } catch (error) {
    console.error("Error updating event status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update event status",
      message: error.message,
    });
  }
});

module.exports = router;
