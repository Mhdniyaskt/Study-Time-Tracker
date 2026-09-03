# Error Handling Quick Reference

## 🎯 What Was Added

### Files Created
- `views/error.ejs` - Custom error page template

### Files Modified
- `server.js` - Comprehensive error handling throughout

---

## 🔍 Error Scenarios & Responses

| Scenario | HTTP Code | User Sees | Developer Logs |
|----------|-----------|-----------|----------------|
| Unknown route | 404 | "Page Not Found" error page | `404 - Route not found: GET /path` |
| Invalid ObjectId | 404 | "Session Not Found" error page | `Edit GET rejected — invalid ID: xyz` |
| Non-existent session | 404 | "Session Not Found" error page | `Edit GET failed — session not found: id` |
| Database error | 500 | "Something Went Wrong" error page | Full error + stack trace (dev only) |
| Form validation fail | 200 | Form with validation errors | N/A (expected behavior) |
| MongoDB connection fail | N/A | Server won't start | Connection error + troubleshooting tips |

---

## 🛠️ Helper Functions

### `isValidObjectId(id)`
Validates MongoDB ObjectId format.
```javascript
if (!isValidObjectId(req.params.id)) {
  return renderError(res, 404, "Session Not Found", "...");
}
```

### `renderError(res, statusCode, title, message, devError)`
Renders the custom error page.
```javascript
renderError(res, 500, "Error", "Something went wrong", err.stack);
```

### `validateSession(subject, hours, minutes)`
Validates study session input (existing function - unchanged).

---

## 🔒 Security Checklist

✅ MongoDB credentials never logged  
✅ Connection strings sanitized: `mongodb://<credentials>@host`  
✅ Stack traces hidden in production  
✅ Generic error messages in production  
✅ Detailed errors only in development  

---

## 🌍 Environment Modes

### Development (`NODE_ENV` not set or not "production")
- ✅ Full error messages
- ✅ Stack traces
- ✅ Developer details in error page
- ✅ Verbose logging

### Production (`NODE_ENV=production`)
- ✅ Generic error messages
- ✅ No stack traces
- ✅ No developer details
- ✅ Minimal logging

**Set in .env:**
```
NODE_ENV=production
```

---

## 📝 Route Error Handling Pattern

All async routes follow this pattern:

```javascript
app.METHOD("/route", async (req, res, next) => {
  try {
    // 1. Validate input (ObjectId, etc.)
    if (!isValidObjectId(req.params.id)) {
      return renderError(res, 404, "Not Found", "...");
    }

    // 2. Database operation
    const result = await Model.findById(id);
    
    // 3. Check result exists
    if (!result) {
      return renderError(res, 404, "Not Found", "...");
    }

    // 4. Success response
    res.render("view", { result });
    
  } catch (err) {
    // 5. Log and delegate to global handler
    console.error("Operation failed:", err.message);
    if (isDevelopment) console.error(err.stack);
    next(err);
  }
});
```

---

## 🚨 Error Handler Order (Important!)

```javascript
// 1. All routes first
app.get("/", ...);
app.post("/study", ...);
// ... all other routes

// 2. 404 handler (catches unmatched routes)
app.use((req, res, next) => {
  renderError(res, 404, "Page Not Found", "...");
});

// 3. Global error handler (catches all errors)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  renderError(res, 500, "Error", "...");
});
```

**⚠️ Order matters!** The 404 and error handlers must be last.

---

## 🧪 Testing Commands

### Test the application
```bash
npm start
```

### Test with invalid route (should show 404)
Visit: `http://localhost:3000/nonexistent`

### Test with invalid ObjectId (should show 404)
Visit: `http://localhost:3000/study/invalid-id/edit`

### Test with non-existent session (should show 404)
Visit: `http://localhost:3000/study/507f1f77bcf86cd799439011/edit`

### Test MongoDB connection error
1. Stop MongoDB service
2. Run `npm start`
3. Should see detailed connection error and exit

---

## 📊 Process Handlers

### Graceful Shutdown
```bash
# Press Ctrl+C in terminal
SIGINT received. Closing server gracefully...
# MongoDB connection closes cleanly
```

### Unhandled Rejection
```javascript
// Logged and handled (doesn't crash in production)
Unhandled Promise Rejection: reason
```

### Uncaught Exception
```javascript
// Logged and server exits gracefully
Uncaught Exception: message
Server will shut down...
```

---

## 🎨 Error Page Structure

```
┌─────────────────────────────────┐
│         [Icon]                  │
│                                 │
│         404                     │  ← Status Code
│                                 │
│    Page Not Found               │  ← Title
│                                 │
│  The page you're looking for... │  ← Message
│                                 │
│  [Go Back]  [Return Home]       │  ← Actions
│                                 │
│  🔧 Developer Details (dev only)│  ← Collapsible
└─────────────────────────────────┘
```

---

## 💡 Key Takeaways

1. **No Crashes**: Server never crashes from unhandled errors
2. **User-Friendly**: Users see helpful error pages, not stack traces
3. **Developer-Friendly**: Developers get detailed logs and stack traces
4. **Secure**: No credentials or sensitive data exposed
5. **Consistent**: All routes follow same error handling pattern
6. **Maintainable**: Centralized error handling functions
7. **Production-Ready**: Different behavior for dev vs production

---

## 📞 When to Use What

### Use `next(err)` when:
- In an async route handler
- You want the global error handler to take over
- You want consistent error logging and rendering

### Use `renderError()` when:
- You want to show a specific error page immediately
- For validation errors (404, invalid input, etc.)
- For expected error conditions

### Use `console.error()` when:
- Before calling `next(err)` for context
- For logging validation failures
- For debugging information

---

## 🔄 Migration from Old Code

### Before (old code):
```javascript
app.get("/study/:id/edit", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.redirect("/");  // ❌ Silent failure
  }
  try {
    const session = await StudySession.findById(req.params.id);
    if (!session) return res.redirect("/");  // ❌ Silent failure
    res.render("edit", { session });
  } catch (err) {
    console.error("Failed:", err.message);
    res.redirect("/");  // ❌ Silent failure
  }
});
```

### After (new code):
```javascript
app.get("/study/:id/edit", async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return renderError(res, 404, "Session Not Found", "...");  // ✅ Clear error
    }
    const session = await StudySession.findById(req.params.id);
    if (!session) {
      return renderError(res, 404, "Session Not Found", "...");  // ✅ Clear error
    }
    res.render("edit", { session });
  } catch (err) {
    console.error("Failed to load edit page:", err.message);
    if (isDevelopment) console.error(err.stack);
    next(err);  // ✅ Handled globally
  }
});
```

**Benefits:**
- ✅ Users see what went wrong
- ✅ Developers get detailed logs
- ✅ Errors are tracked and handled
- ✅ No silent failures

---

## ✅ Checklist for Adding New Routes

When adding a new route, remember to:

1. ☑ Wrap in `try-catch` block
2. ☑ Validate ObjectIds with `isValidObjectId()`
3. ☑ Check if database results exist
4. ☑ Use `renderError()` for expected errors
5. ☑ Use `next(err)` for unexpected errors
6. ☑ Log errors with context
7. ☑ Add stack trace in development mode
8. ☑ Test error scenarios

---

## 🎓 Learning Resources

### Express Error Handling
- [Express Error Handling Guide](https://expressjs.com/en/guide/error-handling.html)

### MongoDB Connection
- [Mongoose Connection Handling](https://mongoosejs.com/docs/connections.html)

### Node.js Process Events
- [Process Events Documentation](https://nodejs.org/api/process.html#process_events)

---

## 📈 Monitoring in Production

Watch for these log patterns:

```bash
# Good - Normal operation
MongoDB connected successfully
Server running at http://localhost:3000

# Warning - User error (expected)
404 - Route not found: GET /old-page
Edit GET rejected — invalid ID: abc123

# Error - System issue (investigate)
Unhandled error: Cannot read property 'x' of undefined
MongoDB connection error: connect ETIMEDOUT

# Critical - Shutdown
Uncaught Exception: ...
Server will shut down...
```

Set up log monitoring to alert on:
- ⚠️ Multiple 404s (broken links)
- 🚨 500 errors (bugs)
- 🔴 Connection errors (infrastructure)
- ⛔ Uncaught exceptions (critical bugs)

---

**End of Quick Reference** 🎉
