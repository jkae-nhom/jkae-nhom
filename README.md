# 🐶 Dog Pic & Poop Tracker

A static, single-page photo journal. Drop photos into dated folders, push, and the
page shows them **grouped by Khmer lunar date** — no data entry, no manifest, no API.

## Daily workflow
1. Create a folder named by date in **`ddmmyyyy`** format, e.g. for 31 Dec 2027:
   ```
   assets/31122027/
   ```
2. Add photos named **`1`, `2`, `3`, …** (up to 10 per day):
   ```
   assets/31122027/1.jpg
   assets/31122027/2.png
   ```
3. Commit and push. Done — the page finds them automatically.

Supported image types: `.jpg .jpeg .png .webp .gif .avif .bmp`.

## How it works
There's no directory listing on GitHub Pages, so the page **enumerates calendar days**
from a start date up to today, and for each day it just tries to load
`assets/<ddmmyyyy>/1.ext … 10.ext` directly. Images that load are shown; days with no
`1.*` are skipped. These are plain static file requests served by GitHub Pages, so
there is **no API rate limit** and **nothing to maintain** — you only ever add photos.

### One-time config
Open `index.html` and set the earliest date you have photos for (edit once):

```js
const CONFIG = {
  startDate: "19092026",   // your first photo day, ddmmyyyy
  maxImagesPerDay: 10,     // photos are named 1..N per day
  futureBufferDays: 7,     // also checks a few days ahead of today
  extensions: ["jpg", "jpeg", "png", "webp", "gif", "avif", "bmp"],
};
```

Notes:
- Name photos sequentially starting at `1` (a missing `1.*` marks the day empty).
- Keep `maxImagesPerDay` at whatever your real max is; higher means a few more probe
  requests per day.

## Viewing
Photos are grouped by day, newest first, headed with the Khmer lunar (Chhankitek) date
and the Khmer solar date beneath. Tap a photo to open the viewer: swipe / arrow keys to
navigate, double-tap or pinch to zoom, and drag or scroll down to close.

## Host on GitHub Pages
1. Push this repo to GitHub (public).
2. **Settings → Pages → Source → Deploy from a branch** → `main` / `/ (root)` → Save.
3. Live at `https://<username>.github.io/<repo>/`.

## Folder example
```
assets/
├── 19092026/
│   ├── 1.png
│   └── 2.png
└── 23092026/
    ├── 1.png
    ├── 2.png
    └── 3.png
```
