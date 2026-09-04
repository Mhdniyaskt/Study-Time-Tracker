# Floating Timer Widget - Design Specification

## Visual Design

The floating timer widget follows a compact, dark, modern design:

```
┌────────────────────────────────────┐
│ 📚 Physics                      × │  ← Header (draggable)
│                                    │
│           00:03:15                 │  ← Large timer display
│           hr  min  sec             │  ← Time labels
│                                    │
│           Running ●                │  ← Status indicator
│                                    │
│          ⏸        ■                │  ← Control buttons
│                                    │
└────────────────────────────────────┘
```

## Dimensions
- **Width**: 280px (fixed)
- **Height**: 220px (fixed)
- **Window**: Frameless, not resizable
- **Always on top**: Yes

## Color Scheme

### Background
- Main: `#1a1a1a` (dark charcoal)
- Gradient: `linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)`
- Shadow: `0 8px 32px rgba(0, 0, 0, 0.5)`

### Text
- Timer: `#ffffff` (white), 42px, weight 300
- Subject: `#a0a0a0` (light gray), 13px
- Labels: `#666666` (medium gray), 9px uppercase

### Status Colors
- Ready: `#888888` (gray)
- Running: `#4ade80` (green)
- Paused: `#fbbf24` (yellow/amber)
- Stopped: `#f87171` (red)

### Button Colors
- **Pause**: `#fbbf24` background, `#1a1a1a` text
- **Resume**: `#4ade80` background, `#1a1a1a` text
- **Stop**: `#ef4444` background, `#ffffff` text
- **Close**: Transparent, `#888888` text → `#ffffff` on hover

## Layout Structure

### Header Bar (48px height)
```
┌────────────────────────────────────┐
│ [icon] Subject Text            [×] │
└────────────────────────────────────┘
```
- Left: Book icon + subject (truncated if too long)
- Right: Close button (×)
- Background: Draggable area (-webkit-app-region: drag)

### Timer Display (centered, 80px height)
```
┌────────────────────────────────────┐
│            00:03:15                │ ← 42px, tabular numbers
│            hr  min  sec            │ ← 9px labels
└────────────────────────────────────┘
```
- Large monospace digits with letter-spacing
- Small labels with extra letter-spacing for alignment

### Status Text (centered, 30px height)
```
┌────────────────────────────────────┐
│           Running ●                │
└────────────────────────────────────┘
```
- Small text (11px)
- Color changes based on state
- Live indicator (●) when running

### Control Buttons (centered, 64px height)
```
┌────────────────────────────────────┐
│         [⏸]     [■]                │
│       48x48    48x48               │
└────────────────────────────────────┘
```
- Circular buttons (border-radius: 50%)
- 48x48px size
- 16px gap between buttons
- Hover: scale(1.05)
- Active: scale(0.95)
- Not draggable (-webkit-app-region: no-drag)

## Button States

### Ready State
```
No buttons visible (all disabled/hidden)
Status: "Ready" (gray)
```

### Running State
```
[⏸ Pause]  [■ Stop]
Status: "Running ●" (green)
```

### Paused State
```
[▶ Resume]  [■ Stop]
Status: "Paused" (yellow)
```

### Stopped State
```
No buttons visible (all disabled/hidden)
Status: "Stopped" (red)
```

## Typography

### Font Family
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
```

### Font Sizes
- Timer: 42px
- Subject: 13px
- Status: 11px
- Labels: 9px
- Close button: 18px
- Button icons: 20px

### Font Weights
- Timer: 300 (light)
- Subject: normal
- Status: normal

## Interactions

### Hover States
- **Close button**: Background → `#333`, color → `#fff`
- **Control buttons**: Scale → 1.05, brightness increase
- **Disabled buttons**: Opacity 0.3, no hover effect

### Active States
- **Control buttons**: Scale → 0.95

### Drag Behavior
- **Entire window**: Draggable
- **Buttons/controls**: Not draggable (excluded from drag region)

### Confirmations
- **Stop & Save**: Shows confirm dialog before saving
- **Close (×)**: No confirmation, just hides widget

## Window Behavior

### Initial Position
- Top-right area of screen
- Positioned automatically by OS

### Z-Order
- Always on top of all other windows
- Stays visible when switching applications

### Taskbar
- Does not appear in taskbar (skipTaskbar: true)
- Only main window appears in taskbar

### Transparency
- Window is not transparent (transparent: false)
- Solid dark background for better readability

## Animations

### Transitions
```css
transition: all 0.2s;
```

### Hover Effects
- Scale up: `transform: scale(1.05)`
- Scale down: `transform: scale(0.95)`
- Opacity fade: `opacity: 0 → 1`

### Status Changes
- No animation, instant updates
- Color changes smoothly via transition

## Accessibility

### Visual
- High contrast text on dark background
- Large, clear typography for timer
- Color + text status indicators (not color alone)

### Interaction
- Clear button states (enabled/disabled)
- Hover feedback on interactive elements
- Confirmation dialogs for destructive actions

### User Control
- Close button always visible
- Easy to hide/show via menu
- Does not block main application

## Responsive Design

### Fixed Size
- Widget does not resize
- All measurements in pixels
- No breakpoints needed

### Text Overflow
- Subject text truncates with ellipsis (...)
- Timer uses tabular numbers (no layout shift)

## Technical Notes

### Update Frequency
- Visual display updates every 250ms
- Actual time calculated from timestamps (no drift)

### Performance
- Minimal DOM updates
- CSS transitions for smooth effects
- No unnecessary repaints

### Cross-Window Sync
- All state managed in main process
- IPC ensures consistent display
- No polling, event-driven updates

---

## Comparison with Reference Image

The implementation matches the reference image in these ways:

✅ **Compact size**: Small, minimal footprint
✅ **Dark theme**: Charcoal/black background
✅ **Large timer**: Prominent, centered time display
✅ **Rounded corners**: Smooth, modern appearance
✅ **Circular buttons**: Clean control buttons
✅ **Minimal UI**: No unnecessary elements
✅ **Subject display**: Small text at top
✅ **Close button**: Top-right corner
✅ **Always on top**: Stays visible over other apps

Differences (intentional for better functionality):

🔧 **Status indicator**: Added "Running/Paused/Stopped" text
🔧 **Time labels**: Added "hr min sec" for clarity
🔧 **Button states**: Dynamic show/hide based on timer state
🔧 **Confirmation**: Stop & Save asks for confirmation
🔧 **Color coding**: Status colors for quick visual feedback
