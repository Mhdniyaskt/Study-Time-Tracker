# Error Handling Test Guide

This document outlines the error handling improvements and how to test them.

## Improvements Made

### 1. **404 Handler for Unknown Routes**
- **Location**: After all routes in `server.js`
- **Behavior**: Shows friendly "Page Not Found" error page
- **Test**: Visit `http://localhost:3000/nonexistent-page`

### 2. **Global Express Error Handler**
- **Location**: Last middleware in `server.js`
- **Behavior**: Catches all unhandled errors and shows friendly error page
- **Features**:
  - Logs errors to console
  - Shows developer details in development mode
  - Hides sensitive details in production
  - Returns appropriate HTTP status codes

### 3. **MongoDB Connection Error Handling**
- **Features**:
  - Graceful connection error messages
  - Does not expose credentials in logs
  - Provides helpful troubleshooting tips
  - Monitors connection state (disconnect/reconnect)
  - Clean shutdown on SIGTERM/SIGINT

### 4. **Invalid ObjectId Handling**
- **Routes**: `/study/:id/edit` (GET & POST), `/study/:id` (DELETE)
- **Behavior**: Shows 404 error page for invalid IDs
- **Test**: Visit `http://localhost:3000/study/invalid-id/edit`

### 5. **Session Not Found Handling**
- **Routes**: All routes that fetch sessions by ID
- **Behavior**: Shows 404 error page when session doesn't exist
- **Test**: Visit `http://localhost:3000/study/507f1f77bcf86cd799439011/edit` (valid ID format but non-existent)

### 6. **Database Operation Failures**
- **Behavior**: All database errors are caught and passed to global error handler
- **Features**:
  - Logs full error details in development
  - Shows generic message in production
  - Server continues running after error

### 7. **Process-Level Error Handling**
- **Unhandled Promise Rejections**: Logged and handled gracefully
- **Uncaught Exceptions**: Logged and server exits cleanly
- **Graceful Shutdown**: Closes MongoDB connection before exit

## Test Scenarios

### Test 1: 404 Page
1. Visit: `http://localhost:3000/does-not-exist`
2. Expected: "Page Not Found" error page with home button

### Test 2: Invalid ObjectId
1. Visit: `http://localhost:3000/study/abc123/edit`
2. Expected: "Session Not Found" error page

### Test 3: Non-Existent Session
1. Visit: `http://localhost:3000/study/507f1f77bcf86cd799439011/edit`
2. Expected: "Session Not Found" error page

### Test 4: Form Validation Errors
1. Go to homepage
2. Submit empty form
3. Expected: Client-side validation prevents submission
4. Fill invalid data (e.g., minutes = 75)
5. Expected: Client-side validation shows error

### Test 5: MongoDB Connection Error
1. Stop MongoDB service
2. Restart application
3. Expected: Detailed error message with troubleshooting tips
4. Server exits with error code 1

### Test 6: Database Operation Error (Simulated)
- This would require intentionally corrupting data or network issues
- Error handler will catch and display friendly error page

## Security Features

✅ **No credential exposure**: MongoDB connection string is sanitized in logs
✅ **Production safety**: Detailed errors only shown in development
✅ **No stack traces**: Stack traces hidden from users in production
✅ **Generic messages**: Production errors show friendly generic messages

## Developer Features

✅ **Detailed logging**: Full error messages and stack traces in development
✅ **Request logging**: 404s log the attempted URL
✅ **Operation logging**: Warns about invalid IDs and missing sessions
✅ **Connection monitoring**: Logs MongoDB connection state changes

## Error Page Features

The custom error page (`views/error.ejs`) includes:
- ✅ Appropriate icon (different for 404 vs other errors)
- ✅ Status code display
- ✅ Clear error title
- ✅ Friendly error message
- ✅ Action buttons (Go Back / Return Home)
- ✅ Developer details (collapsible, development only)
- ✅ Consistent Tailwind styling

## Code Quality

✅ **Consistent error handling**: All routes use try-catch with next(err)
✅ **Centralized error rendering**: Single `renderError()` function
✅ **ObjectId validation**: Dedicated `isValidObjectId()` helper
✅ **No crashes**: All errors are caught and handled gracefully
✅ **Existing functionality preserved**: All features work as before

## Environment Variables

The application respects `NODE_ENV`:
- `development` (default): Shows detailed errors, stack traces, and logs
- `production`: Shows generic messages, hides sensitive details

Set in `.env`:
```
NODE_ENV=production
```

Or run with:
```
NODE_ENV=production npm start
```

## Logging Output Examples

### Development Mode:
```
❌ MongoDB connection failed: connect ECONNREFUSED 127.0.0.1:27017
Connection string pattern: mongodb://<credentials>@localhost:27017/studytracker
Error: connect ECONNREFUSED 127.0.0.1:27017
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1144:16)
Please check:
  1. MongoDB is running
  2. MONGODB_URI is set correctly in .env file
  3. Network connection is available
```

### Production Mode:
```
❌ MongoDB connection failed: connect ECONNREFUSED 127.0.0.1:27017
Please check:
  1. MongoDB is running
  2. MONGODB_URI is set correctly in .env file
  3. Network connection is available
```

## Summary

All error scenarios are now handled gracefully:
- ✅ Users see friendly error pages, never raw errors
- ✅ Developers get detailed logs for debugging
- ✅ Server never crashes from unhandled errors
- ✅ No sensitive information is exposed
- ✅ All existing functionality continues to work
