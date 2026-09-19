<div align="center">

<img src="logo.png" alt="Dog Pic & Poop Tracker" width="160" />

# 🐶 កំណត់ត្រារូបភាព និងលាមកឆ្កែ

**Dog Pic & Poop Tracker** — a zero-backend photo journal that groups your dog's
daily pics by **Khmer lunar date**. Just drop photos in a folder and push. 🐾

<br />

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![Service Worker](https://img.shields.io/badge/Service%20Worker-FF6C37?style=for-the-badge&logo=serviceworker&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white)
![Google Fonts](https://img.shields.io/badge/Battambang-4285F4?style=for-the-badge&logo=googlefonts&logoColor=white)
![momentkh](https://img.shields.io/badge/momentkh-Khmer%20Calendar-FF9F43?style=for-the-badge)

**[🔗 Live demo](https://jkae-nhom.github.io/jkae-nhom/)**

</div>

---

## ✨ Features

- 📅 **Grouped by day**, newest first, headed with the **Khmer lunar (Chhankitek)** date
  and the Khmer solar date beneath.
- 🖼️ **Zero data entry** — the page discovers photos by probing `assets/<ddmmyyyy>/`.
- 🔍 **Photo viewer** — swipe / arrow keys to navigate, double-tap or pinch to zoom,
  drag or scroll down to close.
- 📱 **Fully responsive** — 3-up grid on phones, auto-fill on larger screens, notch-safe.
- 🌗 **Automatic light / dark mode**, Apple-style UI.
- ⚡ **Fast & offline** — days are cached in `localStorage` and images by a service worker.
- 🚫 **No API, no rate limits, no manifest** — everything is a plain static request.

## 🚀 Daily workflow

1. 📁 Make a folder named by date in **`ddmmyyyy`** format (e.g. 31 Dec 2027 → `31122027`).
2. 🖼️ Add photos named **`1.png … 10.png`** (up to 10 per day, contiguous):
   ```
   assets/31122027/1.png
   assets/31122027/2.png
   ```
3. ⬆️ Commit and push. Done — the page finds them automatically.

> 💡 Photos are `.png`, named sequentially from `1`. A missing `1.png` marks the day empty.

## ⚙️ One-time config

Open `index.html` and set your earliest photo day (edit once):

```js
const CONFIG = {
  startDate: "19092026",   // 📆 your first photo day, ddmmyyyy
  maxImagesPerDay: 10,     // 🔢 photos named 1..N per day
  futureBufferDays: 7,     // 🔮 also checks a few days ahead of today
  extensions: ["png"],     // 🖼️ image types to look for
};
```

## 🧠 How it works

There's no directory listing on GitHub Pages, so the page **enumerates calendar days**
from `startDate` to today and tries to load `assets/<ddmmyyyy>/1.png … 10.png` directly,
stopping at the first gap. Hits are shown, empty days are skipped — all static requests,
so there's **no API rate limit** and nothing to maintain. Results are cached in
`localStorage`, and image files are cached by a service worker (`sw.js`) for instant,
offline-friendly revisits.

> 🔄 Backfilled photos into an *old* day? Open the console and run `hardRefresh()` to
> clear caches and re-scan.

## 🧩 Built with

| 🛠️ Tech | Purpose |
| --- | --- |
| **Vanilla HTML / CSS / JS** | No framework, single `index.html` |
| **[momentkh](https://github.com/ThyrithSor/momentkh)** | Khmer lunar (Chhankitek) date conversion |
| **[Battambang](https://fonts.google.com/specimen/Battambang)** | Khmer web font (Google Fonts) |
| **Service Worker + Cache API** | Offline image caching (PWA) |
| **GitHub Pages** | Free static hosting |

## 🌐 Deploy on GitHub Pages

1. Push this repo to GitHub (**public**).
2. **Settings → Pages → Source → Deploy from a branch** → `main` / `/ (root)` → Save.
3. 🎉 Live at `https://<username>.github.io/<repo>/`.

<div align="center">
<br />
Made with 🧡 for a very good dog.
</div>
