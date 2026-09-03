# Study Time Tracker - Windows .exe Packaging Guide

## Overview

This guide explains how to package the Study Time Tracker Node.js application as a standalone Windows executable (.exe) file.

## Prerequisites

### Required Software
1. **Node.js** - Version 18.x or higher (for development and packaging)
2. **MongoDB** - Required at runtime (cannot be packaged with the application)
   - Option A: [MongoDB Community Server](https://www.mongodb.com/try/download/community) (Local)
   - Option B: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) (Cloud)

### Required npm Packages
- All production dependencies are already in `package.json`
- For packaging, you'll need `pkg` (installed globally)

## Important Notes

### What Gets Packaged
✅ Node.js runtime
✅ Application code (server.js)
✅ Dependencies (Express, Mongoose, EJS, etc.)
✅ EJS templates (views folder)
✅ Data models (models folder)

### What Does NOT Get Packaged
❌ MongoDB database server
❌ `.env` file (must be provided by user)
❌ `node_modules` folder (compiled into executable)
❌ Development dependencies (nodemon)

### Runtime Requirements
The packaged .exe still requires:
1. **MongoDB** must be installed and running
2. **`.env` file** must be in the same directory as the .exe
3. **PORT configuration** via `.env` or system environment variable

## Packaging Instructions

### Step 1: Install pkg (One-time setup)

```bash
npm install -g pkg
```

### Step 2: Verify Application Configuration

The application is already configured for packaging. Key configuration in `package.json`:

```json
{
  "type": "module",
  "main": "server.js",
  "pkg": {
    "assets": [
      "views/**/*",
      "models/**/*",
      "node_modules/ejs/lib/**/*"
    ],
    "targets": [
      "node18-win-x64"
    ],
    "outputPath": "dist"
  }
}
```

### Step 3: Build the Executable

Run from the project root directory:

```bash
pkg . --targets node18-win-x64 --output dist/study-time-tracker.exe
```

This will:
- Create a `dist` folder
- Compile the application into `study-time-tracker.exe`
- Include all necessary assets and dependencies

### Step 4: Prepare Distribution Package

Create a distribution folder with:

```bash
# Create distribution directory structure
mkdir dist\config

# Copy example environment file
copy .env.example dist\.env.example

# Copy documentation
copy README.md dist\README.md
copy PACKAGING-GUIDE.md dist\PACKAGING-GUIDE.md
```

### Step 5: Test the Executable

1. Navigate to the `dist` folder
2. Create a `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017/study_tracker
   PORT=3000
   NODE_ENV=production
   ```
3. Ensure MongoDB is running
4. Run the executable:
   ```bash
   study-time-tracker.exe
   ```
5. Open browser to `http://localhost:3000`

## Distribution Package Contents

Your final distribution should include:

```
study-time-tracker/
├── study-time-tracker.exe    # Main executable
├── .env.example               # Environment template
├── README.md                  # User documentation
└── PACKAGING-GUIDE.md         # This guide
```

## User Setup Instructions

### For End Users (What to include in documentation)

**Requirements:**
1. Windows 10/11 (64-bit)
2. MongoDB installed and running

**Setup Steps:**

1. **Install MongoDB** (if not already installed)
   - Download from https://www.mongodb.com/try/download/community
   - Run the installer with default settings
   - MongoDB service starts automatically

2. **Configure the Application**
   - Rename `.env.example` to `.env`
   - Edit `.env` file:
     ```
     MONGODB_URI=mongodb://localhost:27017/study_tracker
     PORT=3000
     NODE_ENV=production
     ```
   - For MongoDB Atlas (cloud), use connection string from Atlas dashboard

3. **Run the Application**
   - Double-click `study-time-tracker.exe`
   - Or from Command Prompt: `study-time-tracker.exe`
   - Wait for message: "Server running at http://localhost:3000"

4. **Access the Application**
   - Open web browser
   - Navigate to `http://localhost:3000`

5. **Stopping the Application**
   - Close the command window
   - Or press `Ctrl+C` in the terminal

## Configuration

### Environment Variables

The application uses the following environment variables from `.env`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | ✅ Yes | None | MongoDB connection string |
| `PORT` | ❌ No | 3000 | Server port number |
| `NODE_ENV` | ❌ No | development | Environment mode (development/production) |

### MongoDB Connection Strings

**Local MongoDB:**
```
MONGODB_URI=mongodb://localhost:27017/study_tracker
```

**MongoDB Atlas:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/study_tracker
```

Replace `username`, `password`, and `cluster` with your Atlas credentials.

## Troubleshooting

### Common Issues

**Issue: "MONGODB_URI is not set in environment variables"**
- **Solution:** Create a `.env` file in the same directory as the .exe file
- Ensure the `.env` file contains `MONGODB_URI=...`

**Issue: "MongoDB connection failed"**
- **Solution:** Verify MongoDB is running
- Check MongoDB service status (Windows Services)
- Verify connection string in `.env` is correct
- For Atlas, ensure network access is configured (IP whitelist)

**Issue: "Port 3000 is already in use"**
- **Solution:** Change PORT in `.env` to another number (e.g., 3001)
- Or stop the application using port 3000

**Issue: Application window closes immediately**
- **Solution:** Run from Command Prompt to see error messages
- Check that `.env` file exists and is properly formatted

**Issue: "Cannot find module 'ejs'"**
- **Solution:** This shouldn't happen with proper packaging
- Verify pkg configuration includes EJS assets
- Rebuild the executable

### Logs and Debugging

**Development Mode:**
```
NODE_ENV=development
```
Shows detailed error messages and stack traces.

**Production Mode:**
```
NODE_ENV=production
```
Hides sensitive error details from users.

## Advanced Configuration

### Custom Port

To run on a different port:

1. Edit `.env`:
   ```
   PORT=8080
   ```

2. Access at `http://localhost:8080`

### Multiple Instances

To run multiple instances:

1. Create separate folders for each instance
2. Copy the .exe to each folder
3. Create separate `.env` files with different ports:
   - Instance 1: `PORT=3000`
   - Instance 2: `PORT=3001`
   - Instance 3: `PORT=3002`

4. Each instance can use the same or different MongoDB databases:
   ```
   MONGODB_URI=mongodb://localhost:27017/study_tracker_1
   MONGODB_URI=mongodb://localhost:27017/study_tracker_2
   ```

## Security Considerations

### Do NOT Package
❌ Never include `.env` file in distribution
❌ Never hardcode database credentials
❌ Never commit `.env` to version control

### User Responsibilities
Users must:
✅ Create their own `.env` file
✅ Protect their MongoDB credentials
✅ Use strong passwords for MongoDB Atlas
✅ Keep MongoDB updated with security patches

## Updates and Maintenance

### Updating the Application

To release a new version:

1. Update version in `package.json`
2. Rebuild the executable: `pkg . --targets node18-win-x64 --output dist/study-time-tracker.exe`
3. Test thoroughly
4. Distribute new .exe with changelog

### Database Migration

The application does not require database migrations for version updates. MongoDB schema is flexible and backwards compatible.

## Technical Details

### Packaging Process

The `pkg` tool:
1. Bundles Node.js runtime
2. Compiles JavaScript code
3. Packages dependencies
4. Embeds assets (templates, models)
5. Creates single executable

### File Structure Inside .exe

```
study-time-tracker.exe
├── [Node.js Runtime]
├── server.js (compiled)
├── models/
│   ├── StudySession.js (compiled)
│   └── Settings.js (compiled)
├── views/ (embedded)
│   ├── index.ejs
│   ├── edit.ejs
│   ├── error.ejs
│   ├── history.ejs
│   └── statistics.ejs
└── node_modules/ (compiled)
    ├── express
    ├── mongoose
    ├── ejs
    └── ...
```

### Runtime Behavior

When executed:
1. Extracts embedded assets to temporary directory
2. Loads environment variables from `.env`
3. Validates MongoDB connection
4. Starts Express server
5. Listens on configured PORT

## Package Size

Expected executable size: **100-150 MB**

This includes:
- Node.js runtime (~50 MB)
- All dependencies (~50 MB)
- Application code and assets (~1 MB)

## Limitations

1. **MongoDB Dependency:** MongoDB cannot be packaged; must be installed separately
2. **Environment Variables:** `.env` file must be provided by user
3. **Platform-Specific:** Windows-only (create separate builds for macOS/Linux)
4. **No Auto-Update:** Users must manually download new versions
5. **File Access:** .exe must have write permissions for logs (if implemented)

## Development vs. Production

### Development Mode
- Uses `nodemon` for auto-reload
- Shows detailed errors
- Verbose logging
- Hot-reloading of templates

### Production Mode (.exe)
- Compiled, optimized code
- Minimal error exposure
- Production-ready performance
- No hot-reloading

## Support and Resources

### Official Documentation
- [pkg Documentation](https://github.com/vercel/pkg)
- [MongoDB Installation](https://docs.mongodb.com/manual/installation/)
- [MongoDB Atlas Setup](https://docs.atlas.mongodb.com/getting-started/)

### Useful Commands

```bash
# Verify Node.js version
node --version

# Check MongoDB status (Windows)
sc query MongoDB

# Start MongoDB service (Windows)
net start MongoDB

# Stop MongoDB service (Windows)
net stop MongoDB

# Test MongoDB connection
mongosh "mongodb://localhost:27017"
```

## License and Distribution

This application is open source. You may:
- ✅ Package and distribute the .exe
- ✅ Modify the source code
- ✅ Use for personal or commercial projects
- ✅ Share with others

You must:
- ❌ Not remove copyright notices
- ❌ Not claim as your own work
- ❌ Provide attribution if redistributing

---

**Last Updated:** September 3, 2026  
**Version:** 1.0.0  
**Status:** Ready for Packaging ✅
