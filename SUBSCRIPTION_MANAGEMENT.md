# 📊 Subscription Management Guide

## Overview
Your chess club now operates on a **monthly subscription model**. New members get a 1-month free trial, then you manage renewals.

---

## 🎯 Quick Access

### Via App (Easiest):
1. Login as owner
2. Go to **"Members"** tab
3. View all members and manage subscriptions with one tap!

### Via Command Line:
Use MongoDB commands for bulk operations

---

## 📱 Managing Subscriptions in the App

### View All Members:
1. Open app → **Members** tab
2. See all members with:
   - Status (ACTIVE/INACTIVE)
   - Days remaining
   - Expiry date

### Activate/Extend Subscription:
1. Find the member
2. Tap **"Extend"** or **"Activate"**
3. Choose duration:
   - 1 Month
   - 3 Months (Quarterly)
   - 6 Months (Half-yearly)
   - 12 Months (Annual)

### Deactivate Subscription:
1. Find the member
2. Tap **"Deactivate"**
3. Confirm

---

## 💻 Command Line Management

### 1. View All Members
```bash
mongosh test_database --quiet --eval "
db.users.find(
  {},
  {name: 1, email: 1, subscription_status: 1, subscription_expires_at: 1, _id: 0}
).forEach(printjson)
"
```

### 2. Activate Member (1 month)
```bash
mongosh test_database --quiet --eval "
db.users.updateOne(
  { email: 'member@example.com' },
  { \$set: {
    subscription_status: 'active',
    subscription_expires_at: new Date(Date.now() + 30*24*60*60*1000)
  }}
)"
```

### 3. Extend Subscription (Add months to existing)
```bash
# Extend by 3 months
mongosh test_database --quiet --eval "
var member = db.users.findOne({ email: 'member@example.com' });
var currentExpiry = new Date(member.subscription_expires_at);
var newExpiry = new Date(currentExpiry.getTime() + 90*24*60*60*1000);
db.users.updateOne(
  { email: 'member@example.com' },
  { \$set: {
    subscription_status: 'active',
    subscription_expires_at: newExpiry
  }}
)"
```

### 4. Deactivate Member
```bash
mongosh test_database --quiet --eval "
db.users.updateOne(
  { email: 'member@example.com' },
  { \$set: { subscription_status: 'inactive' }}
)"
```

### 5. Find Expired Subscriptions
```bash
mongosh test_database --quiet --eval "
db.users.find({
  subscription_expires_at: { \$lt: new Date() },
  subscription_status: 'active'
}, {
  name: 1,
  email: 1,
  subscription_expires_at: 1,
  _id: 0
}).forEach(printjson)
"
```

### 6. Auto-Deactivate Expired Members
```bash
mongosh test_database --quiet --eval "
db.users.updateMany(
  {
    subscription_expires_at: { \$lt: new Date() },
    subscription_status: 'active'
  },
  { \$set: { subscription_status: 'inactive' }}
)"
```

---

## 📅 Monthly Routine

### At Month Start:
1. **Check Expired Members**:
   ```bash
   mongosh test_database --quiet --eval "
   db.users.find({
     subscription_expires_at: { \$lt: new Date() },
     subscription_status: 'active'
   }, {name: 1, email: 1, _id: 0})
   "
   ```

2. **Send Renewal Reminders** (manually via WhatsApp/Email)

3. **Collect Payments** (outside the app - cash/UPI)

4. **Renew in App**:
   - Go to Members tab
   - Find member who paid
   - Tap "Extend" → Choose duration

---

## 💰 Payment Collection (Outside App)

Since there's no payment gateway, collect manually:

### Option 1: UPI
1. Member sends payment via UPI
2. You receive confirmation
3. Extend their subscription in app

### Option 2: Cash
1. Member pays cash at club
2. You record payment
3. Extend their subscription in app

### Payment Record (Maintain Separately):
```
Date | Member Name | Amount | Duration | UPI Ref/Receipt
----------------------------------------------------------
Jan 15 | Raj Kumar | ₹500 | 1 Month | UPI-12345
Jan 20 | Priya S | ₹1400 | 3 Months | Cash Receipt #001
```

---

## 🔔 Notification Strategy

### Weekly:
- Check members expiring in next 7 days
- Send WhatsApp reminder

### Day Before Expiry:
- Send final reminder
- Share UPI details

### After Expiry:
- Auto-deactivate (or keep 3-day grace period)

---

## 📊 Pricing Suggestions

### Monthly Plans:
- **1 Month**: ₹500
- **3 Months**: ₹1,400 (₹467/month - 7% discount)
- **6 Months**: ₹2,700 (₹450/month - 10% discount)
- **12 Months**: ₹5,000 (₹417/month - 17% discount)

---

## 🤖 Automation Scripts

### 1. Daily Expiry Check (Run via Cron)
Create file: `/app/scripts/check_expiry.sh`
```bash
#!/bin/bash
mongosh test_database --quiet --eval "
var expiringSoon = db.users.find({
  subscription_expires_at: {
    \$gt: new Date(),
    \$lt: new Date(Date.now() + 7*24*60*60*1000)
  },
  subscription_status: 'active'
}, {name: 1, email: 1, subscription_expires_at: 1, _id: 0}).toArray();

print('Members expiring in 7 days:');
expiringSoon.forEach(function(member) {
  print(member.name + ' (' + member.email + ') - ' + member.subscription_expires_at);
});
"
```

Make it executable and run daily:
```bash
chmod +x /app/scripts/check_expiry.sh
crontab -e
# Add: 0 9 * * * /app/scripts/check_expiry.sh
```

### 2. Auto-Deactivate Expired (Run Daily)
```bash
#!/bin/bash
mongosh test_database --quiet --eval "
var result = db.users.updateMany(
  {
    subscription_expires_at: { \$lt: new Date() },
    subscription_status: 'active'
  },
  { \$set: { subscription_status: 'inactive' }}
);
print('Deactivated ' + result.modifiedCount + ' expired members');
"
```

---

## 📈 Statistics

### Total Active Members:
```bash
mongosh test_database --quiet --eval "
db.users.countDocuments({ subscription_status: 'active', role: 'member' })
"
```

### Revenue Projection:
```bash
mongosh test_database --quiet --eval "
var active = db.users.countDocuments({ subscription_status: 'active', role: 'member' });
print('Active Members: ' + active);
print('Monthly Revenue (₹500 avg): ₹' + (active * 500));
print('Yearly Projection: ₹' + (active * 500 * 12));
"
```

### Expiring This Month:
```bash
mongosh test_database --quiet --eval "
var endOfMonth = new Date();
endOfMonth.setMonth(endOfMonth.getMonth() + 1);
endOfMonth.setDate(0);

db.users.countDocuments({
  subscription_expires_at: {
    \$gte: new Date(),
    \$lte: endOfMonth
  },
  subscription_status: 'active'
})
"
```

---

## ❓ FAQ

**Q: New member signed up, are they active?**
A: Yes! They get 1 month free trial automatically.

**Q: Member paid but forgot to tell me. Now expired?**
A: No problem! Use "Activate" and set duration. They'll get full time from today.

**Q: Want to give someone extra days?**
A: Use "Extend" and choose duration. It adds to existing expiry.

**Q: Member stopped coming, should I deactivate?**
A: Let it expire naturally, or tap "Deactivate" to immediately stop access.

**Q: Can I see payment history?**
A: Not in app. Maintain separate payment log (Excel/WhatsApp Business).

**Q: Want to offer lifetime membership?**
A: Set expiry very far in future:
```bash
mongosh test_database --eval "
db.users.updateOne(
  { email: 'member@example.com' },
  { \$set: {
    subscription_status: 'active',
    subscription_expires_at: new Date('2050-01-01')
  }}
)"
```

---

## 🎁 Special Features

### Family Plans:
```bash
# Give all family members same expiry
mongosh test_database --eval "
var familyExpiry = new Date('2024-12-31');
db.users.updateMany(
  { email: { \$in: ['dad@example.com', 'son@example.com'] }},
  { \$set: {
    subscription_status: 'active',
    subscription_expires_at: familyExpiry
  }}
)"
```

### Trial Extensions:
```bash
# Give someone extra 15 days trial
mongosh test_database --eval "
var member = db.users.findOne({ email: 'newmember@example.com' });
var newExpiry = new Date(member.subscription_expires_at.getTime() + 15*24*60*60*1000);
db.users.updateOne(
  { email: 'newmember@example.com' },
  { \$set: { subscription_expires_at: newExpiry }}
)"
```

---

## 🚨 Troubleshooting

**Member says they're active but can't access:**
1. Check their status in Members tab
2. Verify expiry date is in future
3. Ask them to logout and login again

**Extended subscription but still shows old date:**
1. Check if you used "Activate" instead of "Extend"
2. Ask member to close and reopen app
3. Or manually set correct date via MongoDB

**Bulk renewal needed:**
```bash
# Extend all active members by 1 month
mongosh test_database --eval "
db.users.updateMany(
  { subscription_status: 'active', role: 'member' },
  { \$set: {
    subscription_expires_at: new Date(Date.now() + 30*24*60*60*1000)
  }}
)"
```

---

## ✅ Best Practices

1. **Check Members tab daily** - Stay on top of renewals
2. **Remind 7 days before expiry** - Good customer service
3. **Keep payment log** - Track revenue
4. **Offer discounts on longer plans** - Improve retention
5. **Be lenient with 1-2 day grace** - Build goodwill

---

**Need help? All member management is in the Members tab! 🎯**
