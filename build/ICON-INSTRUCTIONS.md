# Application Icon Instructions

## Required File
You need to create an icon file: `build/icon.ico`

## Icon Requirements for electron-builder

### Windows (.ico)
- **File name**: `icon.ico`
- **Location**: `build/icon.ico`
- **Size**: 256x256 pixels (recommended)
- **Format**: .ico format
- **Recommended sizes in .ico**: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256

## How to Create an Icon

### Option 1: Online Converter
1. Create or find a PNG image (256x256px or larger)
2. Use an online converter:
   - https://convertio.co/png-ico/
   - https://www.icoconverter.com/
   - https://favicon.io/
3. Download the .ico file
4. Place it in the `build` folder

### Option 2: Using GIMP (Free)
1. Download GIMP: https://www.gimp.org/
2. Create/open your image
3. Resize to 256x256 (Image → Scale Image)
4. Export as .ico (File → Export As → icon.ico)
5. Select multiple sizes when exporting

### Option 3: Using Icon Generator Tools
- **IcoFX**: Professional icon editor (paid)
- **Greenfish Icon Editor Pro**: Free icon editor
- **Icon Composer** (Mac only)

## Temporary Solution

For now, the application will work without a custom icon - it will use the default Electron icon. To add your custom icon later:

1. Create `build/icon.ico`
2. Rebuild the application: `npm run dist`

## What the Icon is Used For

- Application window icon (top-left corner)
- Taskbar icon
- Desktop shortcut icon
- Start menu shortcut icon
- Installer icon
- Uninstaller icon
- Windows file association icon

## Icon Design Tips

- Keep it simple and recognizable at small sizes
- Use bold colors that stand out
- Avoid too much detail (won't show at 16x16)
- Consider using a symbol related to studying/time (clock, book, etc.)
- Test at different sizes to ensure clarity
