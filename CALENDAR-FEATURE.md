# Calendar View Feature

## Overview
The Statistics page now includes an interactive calendar view that displays study sessions in a monthly format using FullCalendar.

## Features

### 1. **Monthly Calendar Display**
- Shows the current month by default
- Clean, responsive design matching Tailwind CSS styling
- Easy navigation between months using Previous/Next buttons
- "Today" button to quickly return to current month

### 2. **Study Session Visualization**
- Days with study sessions are marked with colored event badges
- Event badges show the total study time for that day
- Days with study sessions have bold, colored date numbers
- Multiple sessions on the same day are grouped together

### 3. **Interactive Day Details**
- Click on any day with study sessions to see detailed information
- Modal popup displays:
  - Full date (e.g., "Monday, December 15, 2025")
  - Total study time for that day
  - List of all study sessions with subject and duration
  - Number of sessions
- Click on empty days to see "No study sessions" message
- Close modal by clicking outside, pressing Escape, or clicking X button

### 4. **Navigation**
- Navigate between months using arrow buttons
- Jump to current month with "Today" button
- All historical study data is accessible
- Can browse future months as well

### 5. **Visual Features**
- Study days are marked with indigo event badges
- Hover effects on events and calendar cells
- Smooth animations for modal open/close
- Today's date is highlighted with a light background
- Responsive design works on mobile and desktop

### 6. **Data Integration**
- Pulls data from existing MongoDB StudySession records
- No changes to database schema
- Automatically aggregates sessions by day
- Shows accurate study time calculations

## Technical Details

### Libraries Used
- **FullCalendar 6.1.10** - Calendar component
- **Chart.js 4.4.0** - Charts (already present)
- **Tailwind CSS** - Styling

### Data Flow
1. Server fetches all study sessions from MongoDB
2. Groups sessions by date
3. Calculates total duration per day
4. Passes calendar events data to EJS template
5. JavaScript transforms data for FullCalendar format
6. Calendar renders with interactive features

### Custom Styling
- Custom CSS overrides FullCalendar defaults
- Matches existing Tailwind design system
- Indigo color scheme (#6366f1) for consistency
- Responsive breakpoints for mobile devices

## Usage

### Accessing the Calendar
1. Navigate to the Statistics page: http://localhost:3000/statistics
2. Scroll down to the "Study Calendar" section
3. The current month is displayed by default

### Viewing Study Details
1. Click on any day with a colored event badge
2. A modal will open showing all study sessions for that day
3. Review the total study time and individual sessions
4. Close the modal by:
   - Clicking the X button
   - Clicking outside the modal
   - Pressing the Escape key

### Navigating Months
1. Use the "prev" button to go to previous month
2. Use the "next" button to go to next month
3. Click "today" to return to the current month

## Benefits

1. **Visual Overview**: Quickly see which days had study sessions
2. **Pattern Recognition**: Identify study habits and gaps
3. **Historical Access**: Review past months' study history
4. **Detailed Insights**: See exactly what was studied each day
5. **Motivation**: Track consistency and celebrate progress

## Future Enhancements

Potential improvements for future versions:
- Weekly view option
- Color-code by subject
- Study streak visualization
- Goal indicators on calendar
- Export calendar to iCal format
- Add/edit sessions directly from calendar
- Drag-and-drop to reschedule sessions
