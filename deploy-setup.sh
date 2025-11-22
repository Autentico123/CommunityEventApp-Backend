#!/bin/bash

# Backend Deployment Quick Start Script

echo "🚀 CommunityEventApp Backend Deployment Setup"
echo "=============================================="
echo ""

# Check if in backend directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found. Please run this from the backend directory."
    exit 1
fi

echo "Step 1: Installing dependencies..."
npm install

echo ""
echo "Step 2: Checking Node version..."
node --version

echo ""
echo "Step 3: Testing server locally..."
echo "Starting server for 5 seconds..."
timeout 5 npm start || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next Steps:"
echo "=============================================="
echo "1. Set up MongoDB Atlas (Free):"
echo "   → https://www.mongodb.com/cloud/atlas/register"
echo ""
echo "2. Get your MongoDB connection string"
echo "   → Format: mongodb+srv://user:pass@cluster.mongodb.net/communityevents"
echo ""
echo "3. Push code to GitHub:"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit'"
echo "   git remote add origin YOUR_GITHUB_REPO_URL"
echo "   git push -u origin main"
echo ""
echo "4. Deploy to Render:"
echo "   → https://render.com"
echo "   → Connect GitHub repo"
echo "   → Add environment variables"
echo ""
echo "5. Update frontend API URL in:"
echo "   config/apiConfig.js"
echo ""
echo "See BACKEND_DEPLOYMENT.md for detailed instructions"
echo "=============================================="
