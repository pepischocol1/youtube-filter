# YouTube Filter (Duration & Keywords)

Hide YouTube videos that don't match your duration range or contain blocked keywords in the title.

## Features
- Set minimum and maximum duration in seconds.
- Block by title keywords (case-insensitive, comma-separated).
- Option to hide items with unknown duration (LIVE, Shorts).
- Works across home, search, channel, playlist, and sidebar suggestions.
- Auto-filters as more videos load (infinite scroll).

## Install (Developer Mode)
1. Open `chrome://extensions` (or Edge: `edge://extensions`).
2. Toggle **Developer mode**.
3. Click **Load unpacked** and select the `youtube-filter/` folder.
4. Open YouTube and adjust settings from the toolbar popup.

## Notes
- Unknown durations (LIVE, Shorts, some premieres) can be hidden via the checkbox.
- Filtering checks video titles only; expand keywords for broader coverage as needed.
- This is a client-side UI filter: it hides elements in your view; it doesn't change YouTube recommendations server-side.

## Troubleshooting
- If filtering seems off after navigation, toggle a setting in the popup to trigger a refresh.
- Make sure the extension is enabled and you’re on `youtube.com`.

## Project Structure
youtube-filter/
├─ assets/
│  ├─ icon128.png
│  ├─ icon16.png
│  └─ icon48.png
├─ popup/
│  ├─ popup.css
│  ├─ popup.html
│  └─ popup.js
├─ src/
│  ├─ content.js
├─ manifest.json
└─ README.md