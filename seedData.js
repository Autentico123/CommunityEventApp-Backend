const mongoose = require("mongoose");
require("dotenv").config();
const Event = require("./models/Event");
const User = require("./models/User");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/communityevents";

const sampleUsers = [
  {
    name: "John Doe",
    email: "john@example.com",
    password: "password123",
    bio: "Event organizer and community enthusiast. Love bringing people together!",
    avatar: "https://i.pravatar.cc/150?img=12",
  },
  {
    name: "Maria Santos",
    email: "maria@example.com",
    password: "password123",
    bio: "Music lover and food festival goer. Always looking for the next great event!",
    avatar: "https://i.pravatar.cc/150?img=47",
  },
  {
    name: "Alex Rodriguez",
    email: "alex@example.com",
    password: "password123",
    bio: "Sports enthusiast and tech geek. Organizing community events since 2020.",
    avatar: "https://i.pravatar.cc/150?img=33",
  },
];

const sampleEvents = [];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    console.log("🗑️  Cleared existing users");
    await Event.deleteMany({});
    console.log("🗑️  Cleared existing events");

    // Insert sample users (using create to trigger password hashing)
    const users = [];
    for (const userData of sampleUsers) {
      const user = await User.create(userData);
      users.push(user);
    }
    console.log(`✅ Inserted ${users.length} sample users`);

    console.log("\n👥 Sample Users:");
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} - ${user.email}`);
    });

    // Insert sample events
    const result = await Event.insertMany(sampleEvents);
    console.log(`\n✅ Inserted ${result.length} sample events`);

    console.log("\n📋 Sample Events:");
    result.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title} - ${event.category}`);
    });

    mongoose.connection.close();
    console.log("\n✅ Database seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
