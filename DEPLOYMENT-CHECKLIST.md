# Study Time Tracker - Deployment Checklist

## Pre-Packaging Verification

Use this checklist before packaging the application as a Windows .exe.

### ✅ Code Review
- [ ] All features tested and working
- [ ] No development-only code in production paths
- [ ] No console.log statements in critical paths (optional cleanup)
- [ ] Error handling implemented for all routes
- [ ] Input validation on all forms

### ✅ Configuration Check
- [ ] `package.json` has correct version number
- [ ] `package.json` has pkg configuration with correct assets
- [ ] `server.js` uses `process.env.PORT || 3000`
- [ ] `server.js` uses `process.env.MONGODB_URI` (no hardcoded URI)
- [ ] `.env.example` is up to date with all required variables
- [ ] `.gitignore` excludes `.env` and sensitive files

### ✅ Dependencies
- [ ] All production dependencies in `package.json` dependencies section
- [ ] No missing imports or modules
- [ ] No development dependencies required at runtime
- [ ] `node_modules` folder is up to date (`npm install`)

### ✅ Assets and Templates
- [ ] All EJS templates in `views/` folder
- [ ] All models in `models/` folder
- [ ] No broken links to external resources (CDN links verified)
- [ ] No missing images or static files

### ✅ Database
- [ ] MongoDB schema is stable (no migrations needed)
- [ ] Connection handling is robust
- [ ] Graceful shutdown implemented
- [ ] Connection errors handled properly

### ✅ Documentation
- [ ] README.md is complete and accurate
- [ ] PACKAGING-GUIDE.md exists with full instructions
- [ ] .env.example has clear comments
- [ ] In-code comments explain MongoDB requirements

### ✅ Testing
- [ ] Application starts successfully: `npm start`
- [ ] All routes work correctly
- [ ] CRUD operations function properly
- [ ] Charts and calendar display correctly
- [ ] Form validation works on client and server
- [ ] Error pages display correctly
- [ ] Settings persist correctly

## Packaging Process

### Step 1: Install pkg
```bash
npm install -g pkg
```

### Step 2: Clean Build
```bash
# Remove old builds
rmdir /s /q dist

# Verify application works
npm start
```

### Step 3: Build Executable
```bash
pkg . --targets node18-win-x64 --output dist/study-time-tracker.exe
```

**Expected output:**
- Single file: `dist/study-time-tracker.exe`
- Size: ~100-150 MB
- No errors during compilation

### Step 4: Prepare Distribution
```bash
# Create distribution package
mkdir dist\docs
copy .env.example dist\.env.example
copy README.md dist\README.md
copy PACKAGING-GUIDE.md dist\docs\PACKAGING-GUIDE.md
copy start.bat dist\start.bat
```

### Step 5: Test Executable

**Test Environment:**
- [ ] Fresh Windows installation (or VM)
- [ ] No Node.js installed (test standalone)
- [ ] MongoDB installed and running

**Test Steps:**
1. [ ] Copy `dist` folder to test machine
2. [ ] Create `.env` file from `.env.example`
3. [ ] Set correct `MONGODB_URI` in `.env`
4. [ ] Run `study-time-tracker.exe`
5. [ ] Verify server starts without errors
6. [ ] Open browser to `http://localhost:3000`
7. [ ] Test all features:
   - [ ] Add session
   - [ ] Edit session
   - [ ] Delete session
   - [ ] View statistics
   - [ ] View history
   - [ ] Change settings
   - [ ] Test all chart types
   - [ ] Test calendar
   - [ ] Test all filters

## Post-Packaging Verification

### ✅ Executable Tests
- [ ] File size is reasonable (~100-150 MB)
- [ ] Double-clicking .exe starts application
- [ ] Command line execution works
- [ ] Error messages are clear and helpful
- [ ] Application exits gracefully (Ctrl+C)

### ✅ Environment Configuration
- [ ] Missing .env file shows clear error
- [ ] Invalid MONGODB_URI shows clear error
- [ ] Application uses PORT from .env
- [ ] NODE_ENV setting works (development/production)

### ✅ MongoDB Connection
- [ ] Connects to local MongoDB successfully
- [ ] MongoDB Atlas connection works
- [ ] Connection errors are handled gracefully
- [ ] Reconnection attempts work
- [ ] Database operations persist correctly

### ✅ User Experience
- [ ] Startup time is reasonable
- [ ] UI loads correctly
- [ ] No missing styles or assets
- [ ] Charts render properly
- [ ] Forms submit correctly
- [ ] Validation messages display
- [ ] Error pages work

### ✅ Documentation
- [ ] README explains .exe setup clearly
- [ ] MongoDB installation instructions are clear
- [ ] .env.example has helpful comments
- [ ] Troubleshooting section is comprehensive

## Distribution Package Checklist

Your final distribution should contain:

### Required Files
- [ ] `study-time-tracker.exe` - Main application
- [ ] `.env.example` - Configuration template
- [ ] `README.md` - User documentation
- [ ] `start.bat` - Startup helper script (optional)

### Optional Files
- [ ] `PACKAGING-GUIDE.md` - Detailed packaging documentation
- [ ] `LICENSE.txt` - License information
- [ ] `CHANGELOG.md` - Version history

### Folder Structure
```
study-time-tracker-v1.0.0/
├── study-time-tracker.exe
├── .env.example
├── README.md
├── start.bat
└── docs/
    ├── PACKAGING-GUIDE.md
    └── LICENSE.txt
```

## Known Issues and Limitations

Document any known issues:

### Current Limitations
- [ ] MongoDB must be installed separately (cannot be packaged)
- [ ] .env file must be manually created by user
- [ ] Windows-only (separate builds needed for other platforms)
- [ ] No auto-update mechanism
- [ ] Requires administrator rights for installation (if applicable)

### MongoDB Requirements
- [ ] MongoDB 4.0 or higher required
- [ ] MongoDB service must be running before starting app
- [ ] Connection string must be valid
- [ ] Network access configured for Atlas (if used)

## Security Checklist

### ✅ Before Distribution
- [ ] No hardcoded passwords or secrets
- [ ] No .env file included in package
- [ ] No development credentials in code
- [ ] No sensitive data in error messages (production mode)
- [ ] Input sanitization implemented
- [ ] ObjectId validation implemented

### ✅ User Instructions
- [ ] Instructions to create secure MongoDB passwords
- [ ] Warning not to share .env files
- [ ] Recommendation to use strong passwords
- [ ] Instructions for securing MongoDB instance

## Version Control

### Before Tagging Release
- [ ] All changes committed
- [ ] Version number updated in package.json
- [ ] CHANGELOG.md updated
- [ ] Git tag created: `git tag v1.0.0`
- [ ] Tag pushed: `git push --tags`

### Version Numbering
Format: `MAJOR.MINOR.PATCH`
- MAJOR: Breaking changes
- MINOR: New features, backwards compatible
- PATCH: Bug fixes

Current version: `1.0.0`

## Final Checklist

### Before Release
- [ ] All tests passed
- [ ] Documentation reviewed
- [ ] Package tested on clean Windows system
- [ ] MongoDB connection verified (local and Atlas)
- [ ] All features working
- [ ] Error handling verified
- [ ] User instructions are clear

### Release Package
- [ ] Zip file created: `study-time-tracker-v1.0.0-windows.zip`
- [ ] Archive tested (extract and run)
- [ ] File size documented
- [ ] SHA256 hash generated for verification (optional)
- [ ] Release notes prepared

### Post-Release
- [ ] Release uploaded to distribution platform
- [ ] Version tag created in repository
- [ ] Users notified of new version
- [ ] Support channels prepared

## Troubleshooting During Packaging

### Common pkg Errors

**Error: "Cannot find module 'X'"**
- Solution: Add to pkg.assets in package.json
- Example: `"node_modules/X/**/*"`

**Error: "Warning: Cannot resolve 'X'"**
- Solution: May be optional dependency, verify if needed
- Check if application works despite warning

**Error: "Asset 'X' not found"**
- Solution: Verify file exists in project
- Check path in pkg.assets configuration

### Build Issues

**Issue: Executable size too large (>200 MB)**
- Check for unnecessary node_modules
- Verify pkg targets (only one platform)
- Remove development dependencies

**Issue: Application doesn't start**
- Test with `NODE_ENV=production npm start` first
- Check for console errors
- Verify .env file exists and is correct

**Issue: MongoDB connection fails**
- Verify MongoDB is running
- Test connection string with mongosh
- Check firewall settings

## Support Information

### User Support Channels
- Email: (add your support email)
- GitHub Issues: (add repository URL)
- Documentation: See README.md and PACKAGING-GUIDE.md

### Development Support
- Node.js version: 18.x
- pkg documentation: https://github.com/vercel/pkg
- MongoDB documentation: https://docs.mongodb.com

---

**Last Updated:** September 3, 2026  
**Version:** 1.0.0  
**Status:** Ready for Packaging ✅

## Sign-off

Prepared by: _____________  
Date: _____________  
Tested by: _____________  
Date: _____________  
Approved for release: _____________  
Date: _____________  
