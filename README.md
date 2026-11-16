# Focus Farm — Local Edition

A backend-free, installable Progressive Web App (PWA). Tasks, notes, completed sessions, tags and timer preferences are stored in the browser's `localStorage` on this device. There is no account, server, database or cloud sync.

## Features
- Pomodoro focus, short break and long break timer
- Timer duration settings
- Session intention, issue/notes, task association and comma-separated tags
- Tasks with due date, tag, priority and completion state
- Notes with create, edit and delete
- Analytics: last-seven-day focus time, sessions, completed tasks, focus by tag and recent sessions
- Local JSON export/import backup
- Offline app shell through a service worker
- Responsive desktop and mobile layout

## Run locally
PWA installation and offline caching require `localhost` or HTTPS (opening `index.html` directly with `file://` will run the app but browser install/offline features will not be available).

### Easiest option
With Python 3 installed, open a terminal in this folder and run:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080` in Chrome or Edge.

### Install on your device
- **Android Chrome:** open the local or HTTPS URL, open the browser menu and choose **Install app** or **Add to Home screen**.
- **Desktop Chrome/Edge:** use the install icon in the address bar or browser menu → **Install Focus Farm**.
- For installation on a phone over your Wi-Fi, serve the folder from your computer and use its LAN IP. For PWA installation, browsers generally require HTTPS for non-localhost origins. You can deploy this static folder to any HTTPS static host (GitHub Pages, Netlify, Vercel static hosting, etc.); no backend is required.

## Data and privacy
- Data stays in this browser profile on this device.
- Clearing browser site data can erase your Focus Farm data.
- Private/incognito browsing may not preserve data.
- Use **Export my data** regularly to save a JSON backup.
- Importing a backup replaces the current local data.
- There is no cross-device sync.

## Project structure
- `index.html` — app layout
- `styles.css` — monochrome responsive design
- `app.js` — application logic and local storage
- `manifest.webmanifest` — PWA install metadata
- `sw.js` — offline app shell cache
- `icons/icon.svg` — app icon

No npm install, backend, database or build step is required.


## Install button on your Vercel website
The header includes an **INSTALL APP** button:
- On Android/Chrome and other supported Chromium browsers, it opens the native install prompt.
- On iPhone/iPad, it shows the Safari → Share → Add to Home Screen instructions (iOS does not expose the same automatic install prompt).
- If already installed, the button shows **APP INSTALLED**.

### Deploy to Vercel
1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Set **Framework Preset: Other**; leave Build Command and Output Directory empty/default (static site).
4. Deploy. No environment variables, build command, database or backend are needed.
5. Open the HTTPS Vercel URL on your phone. Use **INSTALL APP** in the website header.

The install prompt is browser-controlled. If it does not appear immediately, reload the deployed HTTPS site and use the browser's own menu → Install app / Add to Home Screen.

## Habit tracker
Create habits, select a month, tap any date to toggle completion, and attach a private journal note to that habit/day. Habit check-ins and daily notes are stored locally and included in JSON backups.


## Goals and weight tracker
- Create goals with a target, current progress, unit and optional due date.
- Update goal progress at any time.
- Attach multiple photos and videos to each goal.
- Media files are stored as blobs in the browser's IndexedDB (not uploaded to a server).
- Weight journal records dated weigh-ins, optional notes, a target weight and a local trend chart.
- JSON backups include goals, weight entries, and attached media. Large videos can create large backup files.

## Local media storage notes
Photos and videos stay inside this browser profile on this device. They are not synced between devices and can be removed if browser site data is cleared. Browser storage limits vary by device and available space; keep backups for important media. On iOS, use the installed web app or Safari and allow browser storage. The app does not upload any media to Vercel or a server.
