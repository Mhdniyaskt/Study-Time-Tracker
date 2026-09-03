# Study Time Tracker

A comprehensive web application for tracking and analyzing your study sessions.

## 🚀 Features

### Dashboard
- **Real-time Statistics** - Today, this week, this month, overall total, study streak
- **Add Sessions** - Quick form to log study sessions
- **Subject Analysis** - Visual breakdown of time per subject
- **Weekly Chart** - Bar chart showing Mon-Sun study hours
- **Monthly Chart** - Line chart showing daily study hours for current month
- **Study History** - Recent sessions grouped by date
- **Daily Goals** - Set and track daily study goals
- **Progress Bars** - Visual progress toward goals

### History Page ⭐ NEW
- **8 Period Filters:**
  - Today
  - Yesterday
  - This Week
  - Last Week
  - This Month
  - Last Month
  - All Time
  - Custom Date Range
- **Statistics per Period:**
  - Total study time
  - Number of sessions
  - Average per session
  - Study time by subject
  - Daily study totals
- **Session Management:**
  - View all sessions in period
  - Edit sessions
  - Delete sessions
  - Sorted newest first

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (with Mongoose)
- **Frontend:** EJS templates
- **Styling:** Tailwind CSS
- **Charts:** Chart.js
- **Environment:** dotenv

## 📦 Installation

### Option 1: Run from Source (Recommended for Development)

1. **Clone or download this repository**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up MongoDB:**
   - **Option A: Local MongoDB**
     - Download and install [MongoDB Community Server](https://www.mongodb.com/try/download/community)
     - MongoDB service usually starts automatically after installation
     - Verify MongoDB is running (default port: 27017)
   
   - **Option B: MongoDB Atlas (Cloud)**
     - Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
     - Create a cluster and get your connection string
     - Update the connection string in your `.env` file

4. **Configure environment variables:**
   Create a `.env` file in the root directory (copy from `.env.example`):
   ```
   MONGODB_URI=mongodb://localhost:27017/study_tracker
   PORT=3000
   NODE_ENV=development
   ```

5. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Open in browser:**
   ```
   http://localhost:3000
   ```

### Option 2: Windows Executable (Coming Soon)

The application can be packaged as a standalone Windows .exe file. This will allow you to run the application without installing Node.js.

**Requirements for .exe version:**
- MongoDB must still be installed and running (local or Atlas)
- A `.env` file must be in the same directory as the .exe file

**To package as .exe:**
```bash
# Install pkg globally (one-time setup)
npm install -g pkg

# Package the application
pkg . --targets node18-win-x64 --output dist/study-time-tracker.exe

# Copy necessary files to dist folder
copy .env.example dist\.env.example
```

**To run the .exe:**
1. Ensure MongoDB is running
2. Create a `.env` file in the same folder as the .exe
3. Double-click `study-time-tracker.exe` or run from command line
4. Open browser to `http://localhost:3000`

## 📁 Project Structure

```
Study-Time-Tracker/
├── models/
│   ├── StudySession.js    # Study session schema
│   └── Settings.js         # User settings schema
├── views/
│   ├── index.ejs           # Dashboard page
│   ├── edit.ejs            # Edit session page
│   └── history.ejs         # History page with filters
├── .env                    # Environment variables
├── server.js               # Express server & routes
├── package.json            # Dependencies
└── README.md              # This file
```

## 🎯 Usage

### Adding a Study Session
1. Fill in the subject name
2. Enter hours and minutes studied
3. Click "Add Study Session"
4. Session saved with current timestamp

### Viewing History
1. Click "History" button in dashboard header
2. Select a period filter
3. View statistics and sessions
4. Use custom range for specific dates

### Setting Daily Goals
1. Click "Settings" button in dashboard
2. Enter daily goal in hours
3. Click "Save Settings"
4. Dashboard shows progress toward goal

### Editing Sessions
1. Find the session in dashboard or history
2. Click "Edit"
3. Modify subject, hours, or minutes
4. Click "Save Changes"

### Deleting Sessions
1. Find the session
2. Click "Delete"
3. Confirm deletion
4. Session permanently removed

## 📊 Data Models

### StudySession
```javascript
{
  subject: String,      // Subject name (e.g., "Mathematics")
  duration: Number,     // Duration in minutes
  date: Date,          // Session date (default: now)
  createdAt: Date      // Creation timestamp
}
```

### Settings
```javascript
{
  dailyGoal: Number    // Daily goal in minutes (default: 180)
}
```

## 🔧 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Dashboard (main page) |
| GET | `/history` | History page with filters |
| GET | `/study/:id/edit` | Edit session form |
| POST | `/study` | Create new session |
| POST | `/study/:id/edit` | Update session |
| DELETE | `/study/:id` | Delete session |
| POST | `/settings` | Update settings |

## 📈 Charts

### Weekly Chart
- Type: Bar chart
- Shows: Mon-Sun study hours
- Period: Current week
- Color: Indigo

### Monthly Chart
- Type: Line chart with fill
- Shows: Daily study hours
- Period: Current month
- Color: Emerald green

## 🎨 Design

- **Framework:** Tailwind CSS
- **Responsive:** Mobile-first design
- **Colors:** Indigo primary, emerald/violet accents
- **Icons:** Heroicons (via inline SVG)
- **Typography:** System font stack

## 🔒 Data Persistence

- All study sessions stored permanently in MongoDB
- No automatic deletion of historical data
- Edit/delete actions require user confirmation
- Database persists across server restarts

## 📱 Responsive Breakpoints

- **Mobile:** < 640px
- **Tablet:** 640px - 1023px
- **Desktop:** ≥ 1024px

## 🧪 Testing

Run the server and test:
1. Add multiple sessions
2. Check dashboard statistics
3. View weekly/monthly charts
4. Test all history filters
5. Edit and delete sessions
6. Set daily goals
7. Test on mobile device

## 📚 Documentation

- `AUDIT-REPORT.md` - Complete functional audit results
- `CHARTS-IMPLEMENTATION.md` - Charts feature technical details
- `CHARTS-SUMMARY.md` - Charts feature user guide
- `HISTORY-FEATURE.md` - History feature technical details
- `USER-GUIDE-HISTORY.md` - History feature user guide

## 🚀 Future Enhancements

Possible features to add:
- Export data (CSV, PDF)
- Import data
- Study goals with notifications
- Pomodoro timer integration
- Categories/tags for subjects
- Notes per session
- Dark mode
- Multi-user support
- Mobile app

## 🐛 Known Issues

None currently. All features tested and working.

## 📄 License

This project is open source and available for educational purposes.

## 👤 Author

Created as a study tracking tool.

## 🙏 Acknowledgments

- Chart.js for beautiful charts
- Tailwind CSS for styling
- MongoDB for data persistence
- Express.js for web framework

## 📞 Support

For issues or questions, refer to the documentation files or review the code comments.

---

**Version:** 1.0.0  
**Last Updated:** September 3, 2026  
**Status:** Production Ready ✅

---

## Quick Start Commands

```bash
# Install
npm install

# Run
npm start

# Run with auto-reload
npm run dev

# Test (placeholder)
npm test
```

---

**Happy Studying! 📚🎓**
