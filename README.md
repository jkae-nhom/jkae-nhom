# 🐶 Dog Pic & Poop Tracker

A static, single-page photo journal. Drop photos into dated folders, push, and the
page shows them **grouped by date** — no data entry in the UI.

## Daily workflow
1. Create a folder named by date in **`ddmmyyyy`** format, e.g. for 31 Dec 2027:
   ```
   assets/31122027/
   ```
2. Add photos named however you like (numeric names sort naturally):
   ```
   assets/31122027/1.jpg
   assets/31122027/2.png
   assets/31122027/3.jpg
   ```
3. Commit and push. The page auto-updates.

Supported image types: `.jpg .jpeg .png .gif .webp .avif .bmp`.

## How it works
The page reads your repo's `assets/<ddmmyyyy>/` folders through the public
**GitHub Contents API** (no login needed for public repos) and lays the photos out
newest-day-first. Click any photo to view it full size.

> The repo must be **public** for the API to read it anonymously.
> Anonymous GitHub API access is limited to ~60 requests/hour per IP — plenty for
> personal browsing.

## Host on GitHub Pages
1. Push this repo to GitHub (public).
2. **Settings → Pages → Source → Deploy from a branch** → `main` / `/ (root)` → Save.
3. Live at `https://<username>.github.io/<repo>/`.

The `owner`/`repo` are detected automatically from the `github.io` URL. If you use a
**custom domain** and detection fails, open `index.html` and set `CONFIG.owner` /
`CONFIG.repo` near the top of the `<script>`.

## Folder example
```
assets/
├── 19092026/
│   ├── 1.jpg
│   └── 2.jpg
└── 31122027/
    ├── 1.jpg
    ├── 2.png
    └── 3.jpg
```
