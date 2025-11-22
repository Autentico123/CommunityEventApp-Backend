# Community Event App - MongoDB Backend

This is the backend API for the Community Event App, built with Node.js, Express, and MongoDB.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Installation

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Update the `.env` file with your MongoDB connection string:

```
MONGODB_URI=mongodb://localhost:27017/communityevents
PORT=5000
```

For MongoDB Atlas:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/communityevents?retryWrites=true&w=majority
```

## Running the Server

### Development Mode (with auto-restart)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:5000`

## Seeding the Database

To populate the database with sample events:

```bash
npm run seed
```

## API Endpoints

### Events

#### Get All Events

```
GET /api/events
Query Parameters:
  - category: Filter by category (optional)
  - search: Search in title, description, location (optional)
  - sortBy: Sort field (default: dateTime)
  - order: asc or desc (default: asc)
```

#### Get Single Event

```
GET /api/events/:id
```

#### Create Event

```
POST /api/events
Body: {
  title: string (required),
  description: string,
  location: string (required),
  category: string,
  date: string (required),
  time: string (required),
  dateTime: Date
}
```

#### Update Event

```
PUT /api/events/:id
Body: {
  title: string,
  description: string,
  location: string,
  category: string,
  date: string,
  time: string,
  dateTime: Date,
  attendees: number
}
```

#### Delete Event

```
DELETE /api/events/:id
```

#### Attend Event (Increment Attendees)

```
PATCH /api/events/:id/attend
```

### Health Check

```
GET /api/health
```

## Database Schema

### Event Model

```javascript
{
  title: String (required, max 200 chars),
  description: String (max 2000 chars),
  location: String (required),
  category: String (enum: Community, Music, Sports, Education, Social, Food, Other),
  date: String (required),
  time: String (required),
  dateTime: Date (required),
  attendees: Number (default: 0),
  image: String (emoji),
  isUserCreated: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

## MongoDB Setup Options

### Option 1: Local MongoDB

1. Install MongoDB Community Server
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/communityevents`

### Option 2: MongoDB Atlas (Cloud)

1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get your connection string
4. Update `.env` with your connection string

## Troubleshooting

### Connection Issues

- Ensure MongoDB is running (local) or connection string is correct (Atlas)
- Check firewall settings
- Verify network access in MongoDB Atlas

### Port Already in Use

- Change the PORT in `.env` file
- Or kill the process using port 5000

## Technologies Used

- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **CORS** - Cross-Origin Resource Sharing
- **dotenv** - Environment variables

## License

ISC
