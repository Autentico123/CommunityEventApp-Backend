@echo off
echo ================================================
echo  CommunityEventApp Backend Deployment Setup
echo ================================================
echo.

REM Check if in backend directory
if not exist "server.js" (
    echo Error: server.js not found. Please run this from the backend directory.
    exit /b 1
)

echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Checking Node version...
node --version

echo.
echo Step 3: Ready for deployment!
echo.
echo ================================================
echo  Next Steps:
echo ================================================
echo.
echo 1. Set up MongoDB Atlas (Free):
echo    Visit: https://www.mongodb.com/cloud/atlas/register
echo.
echo 2. Create a cluster and get connection string
echo    Format: mongodb+srv://user:pass@cluster.mongodb.net/communityevents
echo.
echo 3. Push code to GitHub:
echo    git init
echo    git add .
echo    git commit -m "Initial backend commit"
echo    git remote add origin YOUR_GITHUB_REPO_URL
echo    git push -u origin main
echo.
echo 4. Deploy to Render:
echo    Visit: https://render.com
echo    - Sign up with GitHub
echo    - Create New Web Service
echo    - Connect your repository
echo    - Root Directory: backend
echo    - Build Command: npm install
echo    - Start Command: npm start
echo    - Add environment variables:
echo      * NODE_ENV=production
echo      * MONGODB_URI=your_connection_string
echo      * JWT_SECRET=random_secret_key
echo      * PORT=10000
echo.
echo 5. Test deployment:
echo    Visit: https://your-app.onrender.com/api/health
echo.
echo 6. Update frontend config/apiConfig.js with production URL
echo.
echo See BACKEND_DEPLOYMENT.md for detailed guide
echo ================================================
pause
