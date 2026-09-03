# Study Time Tracker - Deployment Instructions

## 📦 Package Contents

After building with `npm run build`, you'll find in the `dist/` folder:
- `StudyTracker.exe` - The packaged application
- `.env.example` - Example environment configuration

## 🚀 How to Run the Packaged Application

### Step 1: Set Up Environment Configuration

1. Navigate to the `dist/` folder where `StudyTracker.exe` is located
2. Copy `.env.example` to `.env`:
   ```
   copy .env.example .env
   ```
3. Edit `.env` with your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/study_tracker
   PORT=3000
   ```

### Step 2: Ensure MongoDB is Running

The application requires MongoDB to be running. You have two options:

**Option A: Local MongoDB**
- Make sure MongoDB is installed and running on your computer
- Default connection: `mongodb://localhost:27017/study_tracker`

**Option B: MongoDB Atlas (Cloud)**
- Get your connection string from MongoDB Atlas
- Update the `MONGODB_URI` in `.env` with your Atlas connection string
- Example: `mongodb+srv://username:password@cluster.mongodb.net/study_tracker`

### Step 3: Launch the Application

Simply double-click `StudyTracker.exe`

The application will:
1. ✅ Connect to MongoDB
2. ✅ Start the Express server on port 3000
3. ✅ Automatically open your default browser to http://localhost:3000

## 📁 File Structure

When deploying, keep these files together:

```
YourFolder/
├── StudyTracker.exe    (the application)
└── .env                (your configuration - DO NOT share this file!)
```

## ⚠️ Important Notes

1. **The `.env` file MUST be in the same directory as `StudyTracker.exe`**
2. **Do not share your `.env` file** - it may contain sensitive connection strings
3. **MongoDB must be accessible** - either running locally or via MongoDB Atlas
4. **Port 3000 must be available** - or change the PORT in `.env`

## 🐛 Troubleshooting

### "MONGODB_URI is not set"
- Check that `.env` file exists in the same folder as `StudyTracker.exe`
- Verify the `.env` file contains: `MONGODB_URI=mongodb://...`

### "MongoDB connection failed"
- Verify MongoDB is running (local) or accessible (Atlas)
- Check your MongoDB connection string is correct
- Ensure network/firewall allows MongoDB connections

### Browser doesn't open automatically
- The console will show: "Browser not auto-opened. Please visit: http://localhost:3000"
- Manually open your browser and go to http://localhost:3000

### Port already in use
- Change the PORT in `.env` to a different port (e.g., 3001)
- Or close the application using port 3000

## 📞 Support

If you encounter issues:
1. Check the console output when running `StudyTracker.exe`
2. Verify all requirements are met (MongoDB running, .env configured)
3. Check the error messages for specific guidance
