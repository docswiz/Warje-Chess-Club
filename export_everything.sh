#!/bin/bash
# Complete Chess Club App Export Script
# Run this to export everything needed for independent hosting

echo "🚀 Starting Complete Export..."
echo ""

# Create export directory
EXPORT_DIR="/tmp/warje_chess_club_complete_export"
mkdir -p $EXPORT_DIR
cd $EXPORT_DIR

echo "📦 Step 1: Exporting Database..."
# Export database
mongodump --uri="mongodb://localhost:27017" --db=test_database --out=$EXPORT_DIR/database_backup
echo "✅ Database exported to: database_backup/"

echo ""
echo "📄 Step 2: Exporting as JSON (easy to read)..."
# Export as JSON too
mongosh test_database --quiet --eval "db.users.find().forEach(printjson)" > users.json
mongosh test_database --quiet --eval "db.posts.find().forEach(printjson)" > posts.json
mongosh test_database --quiet --eval "db.puzzle_attempts.find().forEach(printjson)" > puzzle_attempts.json
mongosh test_database --quiet --eval "db.user_sessions.find().forEach(printjson)" > sessions.json
echo "✅ JSON exports created"

echo ""
echo "⚙️ Step 3: Creating environment template..."
cat > env_template.txt << 'EOF'
# ================================
# BACKEND ENVIRONMENT VARIABLES
# ================================
# Save this as /app/backend/.env

# MongoDB Atlas (Sign up at https://www.mongodb.com/cloud/atlas/register)
MONGO_URL=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/chess_club?retryWrites=true&w=majority
DB_NAME=chess_club

# ================================
# FRONTEND ENVIRONMENT VARIABLES  
# ================================
# Save this as /app/frontend/.env

# Your backend URL (after deployment)
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com

# ================================
# DEPLOYMENT CHECKLIST
# ================================

1. [ ] Sign up for MongoDB Atlas (free tier)
2. [ ] Create cluster and database
3. [ ] Import data using: mongorestore --uri="YOUR_MONGO_URL" database_backup/test_database
4. [ ] Deploy backend to Vercel/Render/Railway
5. [ ] Update EXPO_PUBLIC_BACKEND_URL in frontend/.env
6. [ ] Build new APK with updated backend URL
7. [ ] Test everything!

EOF
echo "✅ Environment template created"

echo ""
echo "📋 Step 4: Creating migration guide..."
cat > MIGRATION_GUIDE.md << 'EOF'
# 🚀 Warje Chess Club - Independent Hosting Guide

## What You Have in This Export:

1. **database_backup/** - Complete MongoDB backup
2. **users.json** - All members and subscriptions (readable)
3. **posts.json** - All posts and puzzles (readable)
4. **puzzle_attempts.json** - Member puzzle history
5. **sessions.json** - Active sessions
6. **env_template.txt** - Environment variable template
7. **MIGRATION_GUIDE.md** - This file

---

## 🎯 Quick Start (15 minutes)

### Step 1: Set Up MongoDB Atlas (Free Database)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up (free tier: 512MB storage - enough for 1000+ members)
3. Create Cluster:
   - Choose FREE tier (M0)
   - Select region closest to you
   - Click "Create Cluster" (takes 3-5 minutes)

4. Create Database User:
   - Security → Database Access
   - Add New User
   - Username: `chessclub`
   - Password: (generate strong password - save it!)
   - Built-in Role: "Read and write to any database"
   - Add User

5. Allow Network Access:
   - Security → Network Access  
   - Add IP Address
   - Select "Allow Access from Anywhere" (0.0.0.0/0)
   - Confirm

6. Get Connection String:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string:
   ```
   mongodb+srv://chessclub:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - Replace `<password>` with your actual password
   - Add database name: `chess_club` before the `?`
   ```
   mongodb+srv://chessclub:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/chess_club?retryWrites=true&w=majority
   ```

### Step 2: Import Your Data

```bash
# Install mongosh on your computer (if not installed)
# Download from: https://www.mongodb.com/try/download/shell

# Import data to Atlas
mongorestore --uri="mongodb+srv://chessclub:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/chess_club" database_backup/test_database

# Verify import
mongosh "mongodb+srv://chessclub:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/chess_club" --eval "db.users.countDocuments()"
```

You should see your member count!

---

### Step 3: Deploy Backend (Choose One)

#### Option A: Vercel (Easiest - FREE)

1. Go to https://vercel.com
2. Sign in with GitHub
3. Import your chess club repository
4. Configure:
   - Framework: Other
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Output Directory: `.`
5. Add Environment Variables:
   ```
   MONGO_URL=mongodb+srv://chessclub:PASSWORD@cluster0...
   DB_NAME=chess_club
   ```
6. Deploy!
7. You'll get URL like: `https://warje-chess-club.vercel.app`

#### Option B: Railway (Also Easy - FREE tier)

1. Go to https://railway.app
2. Sign in with GitHub
3. New Project → Deploy from GitHub repo
4. Select your chess club repo
5. Add variables:
   ```
   MONGO_URL=...
   DB_NAME=chess_club
   ```
6. Deploy automatically!

#### Option C: Render (FREE)

1. Go to https://render.com
2. Sign up
3. New → Web Service
4. Connect your GitHub repo
5. Configure:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Add environment variables
7. Create Web Service

---

### Step 4: Update Frontend & Build APK

1. **Update frontend/.env:**
   ```
   EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.vercel.app
   ```

2. **Build new APK:**
   ```bash
   cd frontend
   eas build --platform android --profile preview
   ```

3. **Or use Expo build:**
   ```bash
   expo build:android -t apk
   ```

4. **Download APK and share with members!**

---

### Step 5: Test Everything

1. Install APK on your phone
2. Login with Google
3. Verify:
   - ✅ Can see members in admin panel
   - ✅ Can create posts
   - ✅ Can create puzzles
   - ✅ Notifications work
   - ✅ Subscriptions show correctly

---

## 💰 Cost Breakdown (Running Independently)

| Service | Cost | Notes |
|---------|------|-------|
| MongoDB Atlas | FREE | 512MB (enough for 1000+ members) |
| Vercel/Render | FREE | Generous free tier |
| Expo Notifications | FREE | 1000/day free |
| **Total** | **₹0/month** | Can upgrade later if needed |

---

## 🔄 Monthly Maintenance

**As Club Owner:**
1. Manage subscriptions via Members tab
2. Post daily puzzles
3. Monitor member activity

**Technical (Optional):**
1. Backup database monthly:
   ```bash
   mongodump --uri="YOUR_ATLAS_URL" --out=backup_$(date +%Y%m%d)
   ```

---

## 🆘 Troubleshooting

**Members can't login:**
- Check backend URL in frontend/.env
- Verify backend is running (visit URL in browser)
- Check MongoDB Atlas IP whitelist

**Database import failed:**
- Check connection string format
- Verify password has no special characters (or encode them)
- Try importing one collection at a time

**Backend won't deploy:**
- Check all environment variables are set
- Verify requirements.txt is present
- Check logs on hosting platform

---

## 📊 Database Statistics

After import, check your data:

```bash
# Connect to your Atlas database
mongosh "YOUR_ATLAS_URL"

# Check collections
show collections

# Count members
db.users.countDocuments()

# Count posts
db.posts.countDocuments()

# See active subscriptions
db.users.countDocuments({subscription_status: "active"})
```

---

## ✅ Migration Checklist

- [ ] MongoDB Atlas account created
- [ ] Cluster created and configured  
- [ ] Database user added
- [ ] Network access allowed
- [ ] Data imported successfully
- [ ] Backend deployed
- [ ] Backend URL working
- [ ] Frontend .env updated
- [ ] New APK built
- [ ] APK tested on phone
- [ ] Members can access
- [ ] Notifications working
- [ ] Old Emergent subscription can be cancelled! 🎉

---

## 🎉 You're Independent!

Your chess club app now runs completely independently:
- ✅ No Emergent subscription needed
- ✅ Data is yours on MongoDB Atlas
- ✅ Can modify code anytime
- ✅ Deploy anywhere
- ✅ Full control

**Cost: ₹0/month (on free tiers)**

---

## 🔗 Helpful Links

- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Vercel: https://vercel.com
- Render: https://render.com
- Railway: https://railway.app
- Expo EAS Build: https://docs.expo.dev/build/introduction/

---

**Questions? Check logs on your hosting platform or MongoDB Atlas dashboard.**

EOF
echo "✅ Migration guide created"

echo ""
echo "📊 Step 5: Collecting statistics..."
cat > export_summary.txt << EOF
# Export Summary
# Generated: $(date)

Total Members: $(mongosh test_database --quiet --eval "db.users.countDocuments()")
Active Members: $(mongosh test_database --quiet --eval "db.users.countDocuments({subscription_status: 'active'})")
Total Posts: $(mongosh test_database --quiet --eval "db.posts.countDocuments()")
Total Puzzles: $(mongosh test_database --quiet --eval "db.posts.countDocuments({is_puzzle: true})")
Puzzle Attempts: $(mongosh test_database --quiet --eval "db.puzzle_attempts.countDocuments()")

Files Exported:
- database_backup/         (MongoDB dump - for import)
- users.json              ($(wc -l < users.json) lines)
- posts.json              ($(wc -l < posts.json) lines)
- puzzle_attempts.json    ($(wc -l < puzzle_attempts.json) lines)
- sessions.json           ($(wc -l < sessions.json) lines)
- env_template.txt        (Environment setup)
- MIGRATION_GUIDE.md      (Complete hosting guide)
- export_summary.txt      (This file)
EOF
echo "✅ Statistics collected"

echo ""
echo "🗜️ Step 6: Creating final archive..."
cd /tmp
tar -czf warje_chess_club_complete_export.tar.gz warje_chess_club_complete_export/
echo "✅ Archive created: /tmp/warje_chess_club_complete_export.tar.gz"

echo ""
echo "======================================"
echo "✅ EXPORT COMPLETE!"
echo "======================================"
echo ""
echo "📦 Download this file:"
echo "   /tmp/warje_chess_club_complete_export.tar.gz"
echo ""
echo "📄 Contains:"
echo "   - Complete database backup"
echo "   - All data in JSON format"
echo "   - Environment template"
echo "   - Migration guide (step-by-step)"
echo "   - Export summary"
echo ""
echo "📚 Next Steps:"
echo "   1. Download the .tar.gz file"
echo "   2. Extract it on your computer"
echo "   3. Read MIGRATION_GUIDE.md"
echo "   4. Follow the 15-minute setup!"
echo ""
echo "🎉 You'll be independent in no time!"
echo "======================================"
