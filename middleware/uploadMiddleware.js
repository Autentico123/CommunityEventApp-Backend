const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create separate directories for different types of uploads
const eventImagesDir = path.join(uploadsDir, "events");
const avatarsDir = path.join(uploadsDir, "avatars");

if (!fs.existsSync(eventImagesDir)) {
  fs.mkdirSync(eventImagesDir, { recursive: true });
}

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configure storage for event images
const eventStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, eventImagesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "event-" + uniqueSuffix + path.extname(file.originalname).toLowerCase()
    );
  },
});

// Configure storage for avatars
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "avatar-" + uniqueSuffix + path.extname(file.originalname).toLowerCase()
    );
  },
});

// File filter to accept only images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Only image files are allowed (jpeg, jpg, png, gif, webp)"
      )
    );
  }
};

// Multer upload middlewares
const uploadEventImage = multer({
  storage: eventStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: imageFilter,
}).single("image");

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
  },
  fileFilter: imageFilter,
}).single("avatar");

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large. Maximum size is 5MB for event images and 2MB for avatars",
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
  next();
};

module.exports = {
  uploadEventImage,
  uploadAvatar,
  handleUploadError,
};
