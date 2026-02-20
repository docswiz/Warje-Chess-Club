# 🚀 Warje Chess Club - Deployment & Maintenance Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Making Yourself a Club Owner](#making-yourself-a-club-owner)
3. [Deployment Options](#deployment-options)
4. [Maintenance Tasks](#maintenance-tasks)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Testing the App Locally
Your app is currently running at:
- **Web**: https://club-chess-connect.preview.emergentagent.com
- **Mobile**: Scan the QR code in Expo Go app

### First Time Setup
1. Open the app URL
2. Click "Continue with Google"
3. Sign in with your Google account
4. You'll be logged in as a member

---

## Making Yourself a Club Owner

To create posts and puzzles, you need owner access:

### Method 1: Using MongoDB Command (Recommended)
```bash
# SSH into your server or use MongoDB shell
mongosh

# Switch to your database
use test_database

# Make yourself owner (replace with your email)
db.users.updateOne(
  { email: "your-email@gmail.com" },
  { $set: { role: "owner" } }
)
```

### Method 2: Using the API
```bash
# Replace YOUR_EMAIL with your actual email
curl -X POST "https://club-chess-connect.preview.emergentagent.com/api/admin/make-owner/YOUR_EMAIL@gmail.com"
```

After this, logout and login again to see the "Create Post" button!

---

## Deployment Options

### Option 1: Expo Application Services (EAS) - RECOMMENDED

#### Benefits:
- ✅ Easy deployment to App Store & Play Store
- ✅ Automatic updates
- ✅ Professional app distribution
- ✅ Free tier available

#### Steps:

**1. Install EAS CLI**
```bash
npm install -g eas-cli
```

**2. Login to Expo**
```bash
cd /app/frontend
eas login
```

**3. Configure Your App**
```bash
# Initialize EAS
eas build:configure
```

**4. Build for Android**
```bash
# For testing (APK)
eas build --platform android --profile preview

# For Play Store (AAB)
eas build --platform android --profile production
```

**5. Build for iOS** (Requires Apple Developer Account - $99/year)
```bash
# For TestFlight
eas build --platform ios --profile preview

# For App Store
eas build --platform ios --profile production
```

**6. Submit to Stores**
```bash
# Android
eas submit --platform android

# iOS
eas submit --platform ios
```

---

### Option 2: Standalone APK for Android (Quick & Free)

#### Steps:

**1. Build APK**
```bash
cd /app/frontend
expo build:android -t apk
```

**2. Download the APK**
After build completes, you'll get a URL to download the APK

**3. Distribute**
- Share the APK file directly with members
- Or host it on your website for download
- Members need to enable "Install from Unknown Sources"

---

### Option 3: Web Deployment (PWA)

#### Deploy to Vercel (Free):

**1. Install Vercel CLI**
```bash
npm install -g vercel
```

**2. Deploy Frontend**
```bash
cd /app/frontend
vercel --prod
```

**3. Deploy Backend**
```bash
cd /app/backend

# Create vercel.json
cat > vercel.json << 'EOF'
{
  "builds": [{ "src": "server.py", "use": "@vercel/python" }],
  "routes": [{ "src": "/(.*)", "dest": "server.py" }]
}
EOF

vercel --prod
```

**4. Update Environment Variables**
Update `/app/frontend/.env` with your new Vercel URLs

---

### Option 4: Deploy to DigitalOcean/AWS/Azure

#### Using Docker:

**1. Create Dockerfile for Backend**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

**2. Create Dockerfile for Frontend**
```dockerfile
FROM node:18
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install
COPY frontend/ .
EXPOSE 3000
CMD ["yarn", "start"]
```

**3. Deploy**
- Push to Docker Hub
- Deploy on your cloud provider
- Set up MongoDB Atlas (free tier available)

---

## Maintenance Tasks

### Daily/Weekly Tasks

#### 1. **Create Daily Puzzle**
- Login as owner
- Tap "Create Post"
- Enable "This is a chess puzzle"
- Upload chess position image
- Enter correct answer (e.g., "Nf3", "Qxh7+")
- Set success/failure messages
- Post!

#### 2. **Post News/Updates**
- Login as owner
- Tap "Create Post"
- Add title and content
- Optionally add image
- Post!

#### 3. **Monitor Member Activity**
```bash
# Check how many members
mongosh --eval "use test_database; db.users.countDocuments()"

# Check puzzle solve rates
mongosh --eval "use test_database; db.puzzle_attempts.find().pretty()"
```

---

### Monthly Tasks

#### 1. **Update Club Timings**
Edit `/app/backend/server.py` - find the `get_club_info` function:
```python
@api_router.get("/club-info")
async def get_club_info():
    return {
        "name": "Warje Chess Club",
        "is_open": True,  # Change to False if closed
        "timings": "Mon-Sat: 6:00 PM - 9:00 PM, Sun: 10:00 AM - 1:00 PM"
    }
```

Then restart backend:
```bash
sudo supervisorctl restart backend
```

#### 2. **Manage Member Subscriptions**
```bash
# Deactivate expired members
mongosh --eval "
use test_database;
db.users.updateMany(
  { subscription_expires_at: { \$lt: new Date() } },
  { \$set: { subscription_status: 'inactive' } }
)"

# Extend member subscription
mongosh --eval "
use test_database;
db.users.updateOne(
  { email: 'member@example.com' },
  { \$set: { 
    subscription_status: 'active',
    subscription_expires_at: new Date(Date.now() + 365*24*60*60*1000)
  }}
)"
```

#### 3. **Backup Database**
```bash
# Export all data
mongodump --uri="mongodb://localhost:27017" --db=test_database --out=/backup/$(date +%Y%m%d)

# Restore if needed
mongorestore --uri="mongodb://localhost:27017" --db=test_database /backup/20250220/test_database
```

---

### Cleaning Old Data

#### Remove Old Posts (keep last 30 days)
```bash
mongosh --eval "
use test_database;
var thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
db.posts.deleteMany({ 
  created_at: { \$lt: thirtyDaysAgo },
  is_puzzle: false 
})"
```

#### Clean Old Puzzle Attempts
```bash
mongosh --eval "
use test_database;
var sixtyDaysAgo = new Date(Date.now() - 60*24*60*60*1000);
db.puzzle_attempts.deleteMany({ 
  created_at: { \$lt: sixtyDaysAgo }
})"
```

---

## Troubleshooting

### Members Can't Login
**Check:**
1. Is Google OAuth working? Test at auth.emergentagent.com
2. Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
3. Verify MongoDB is running: `sudo supervisorctl status`

**Fix:**
```bash
# Restart all services
sudo supervisorctl restart backend
sudo supervisorctl restart expo
```

---

### Puzzle Not Showing
**Check:**
1. Is there a puzzle post in database?
```bash
mongosh --eval "use test_database; db.posts.find({ is_puzzle: true }).pretty()"
```

2. Create a test puzzle if none exist

---

### Images Not Loading
**Issue:** Images must be base64 encoded

**Fix:**
- When creating posts, the image picker automatically converts to base64
- If images still don't load, check the console logs in browser dev tools

---

### App Not Updating
**Fix:**
```bash
# Clear Expo cache
cd /app/frontend
rm -rf .expo
rm -rf node_modules/.cache

# Restart
sudo supervisorctl restart expo
```

---

## Performance Tips

### 1. **Image Optimization**
- Keep images under 500KB
- Use JPEG for photos (better compression)
- Compress images before uploading

### 2. **Database Indexing**
```bash
mongosh --eval "
use test_database;
db.posts.createIndex({ created_at: -1 });
db.users.createIndex({ email: 1 }, { unique: true });
db.puzzle_attempts.createIndex({ user_id: 1, post_id: 1 });
"
```

### 3. **Monitor Performance**
```bash
# Check backend response times
tail -f /var/log/supervisor/backend.out.log | grep "HTTP"

# Check MongoDB performance
mongosh --eval "use test_database; db.stats()"
```

---

## Updating the App

### Code Changes
```bash
# Pull latest changes
git pull

# Update backend dependencies
cd /app/backend
pip install -r requirements.txt

# Update frontend dependencies
cd /app/frontend
yarn install

# Restart services
sudo supervisorctl restart backend
sudo supervisorctl restart expo
```

### Database Migrations
If you need to add new fields to users:
```bash
mongosh --eval "
use test_database;
db.users.updateMany(
  {},
  { \$set: { new_field: 'default_value' } }
)"
```

---

## Support & Resources

- **Expo Documentation**: https://docs.expo.dev
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **MongoDB Manual**: https://docs.mongodb.com
- **React Native**: https://reactnative.dev

---

## Cost Breakdown

### Free Options:
- ✅ MongoDB Atlas Free Tier (512MB)
- ✅ Vercel/Netlify Free Hosting
- ✅ Expo Development
- ✅ GitHub for code hosting

### Paid (If Going Professional):
- 💰 Google Play Console: $25 one-time
- 💰 Apple Developer: $99/year
- 💰 MongoDB Atlas Paid: $9/month (if outgrow free tier)
- 💰 Vercel Pro: $20/month (if need more)
- 💰 Custom domain: $10-15/year

---

## Security Checklist

- [ ] Change default MongoDB credentials
- [ ] Enable HTTPS only
- [ ] Set up rate limiting
- [ ] Regular backups automated
- [ ] Monitor for suspicious activity
- [ ] Keep dependencies updated
- [ ] Use environment variables (never hardcode secrets)

---

**Need Help?** Feel free to ask for assistance with any deployment step!
