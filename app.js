    // ---- Config ----
    const CONFIG = {
      assetsPath: "assets",
      // Earliest photo folder you have, in ddmmyyyy. Edit this ONCE to your first day.
      // The page checks every day from here up to today (+ a small buffer).
      startDate: "19092026",
      maxImagesPerDay: 10,          // photos named 1..N (N max) per day folder
      futureBufferDays: 1,          // also look a day ahead of today (for pre-dated folders)
      // extensions tried per image, in order (first match wins)
      extensions: ["png"],
    };

    const BATCH = 6;                 // day-folders probed per scroll page
    const LOCALE = "km-KH";

    // ---- dates ----
    const pad2 = (n) => String(n).padStart(2, "0");
    const folderName = (d) => `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${d.getFullYear()}`;

    function parseFolderDate(name) {
      const m = /^(\d{2})(\d{2})(\d{4})$/.exec(name);
      if (!m) return null;
      const [, dd, mm, yyyy] = m;
      const d = new Date(+yyyy, +mm - 1, +dd);
      return isNaN(d) ? null : d;
    }
    const KH = momentkh.constants;
    // Latin -> Khmer numerals
    const toKhmer = (s) => String(s).replace(/[0-9]/g, (d) => "០១២៣៤៥៦៧៨៩"[d]);

    // Trimmed Khmer lunar (Chhankitek) date, e.g. "ថ្ងៃពុធ ១២កើត ខែភទ្របទ ឆ្នាំមមី"
    const lunarLabel = (d) => {
      try { return momentkh.format(momentkh.fromDate(d), "[ថ្ងៃ]W dN [ខែ]m [ឆ្នាំ]a"); }
      catch { return d.toLocaleDateString(LOCALE, {weekday: "long", day: "numeric", month: "long", year: "numeric"}); }
    };
    // Relative + Khmer solar (Gregorian) subtitle, e.g. "ថ្ងៃនេះ · ២៣ កញ្ញា ២០២៦"
    const gregLabel = (d) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const that = new Date(d); that.setHours(0, 0, 0, 0);
      const diff = Math.round((today - that) / 86400000);
      const base = `${toKhmer(d.getDate())} ${KH.SolarMonthNames[d.getMonth()]} ${toKhmer(d.getFullYear())}`;
      if (diff === 0) return `ថ្ងៃនេះ · ${base}`;
      if (diff === 1) return `ម្សិលមិញ · ${base}`;
      return base;
    };
    // Short Khmer solar date for the stat, e.g. "២៣ កញ្ញា"
    const shortDate = (d) => `${toKhmer(d.getDate())} ${KH.SolarMonthNames[d.getMonth()]}`;

    // ---- DOM helpers ----
    const $ = (id) => document.getElementById(id);
    const notice = (html) => {$("timeline").innerHTML = `<div class="notice">${html}</div>`; $("more").innerHTML = "";};

    // ---- state ----
    let dirs = [];            // candidate calendar days, newest first
    let cursor = 0;
    let loading = false;
    let loadedPhotos = 0;
    let daysWithPhotos = 0;
    let latestDate = null;
    let anyRendered = false;
    let observer;

    // ---- data cache (remembers each day's photos so we don't re-probe) ----
    const CACHE_KEY = "dogTrackerDays_v2";
    let cache = (() => {
      try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
      catch { return {}; }
    })();
    let cacheDirty = false;
    const saveCache = () => {
      if (!cacheDirty) return;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }
      cacheDirty = false;
    };
    // A past day never changes, so its cache is trusted forever. Only "today" and
    // future-dated folders are (re)probed each visit to pick up newly-added photos.
    const isSettled = (date) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return date < today;
    };

    // Cache-first with minimal network:
    //  • settled past day, cached -> use cache, ZERO requests
    //  • today/future, cached     -> probe only the NEXT index to detect new photos
    //  • uncached                 -> full probe once, then cache
    async function getDayImages(dir) {
      const cached = cache[dir.name];
      if (cached !== undefined && isSettled(dir.date)) return cached;

      if (cached !== undefined) {
        const next = await findImage(dir.name, cached.length + 1);
        if (!next) return cached;                 // no growth -> 1 request, done
        const images = cached.slice();            // grew -> keep probing forward
        images.push(next);
        for (let i = images.length + 1; i <= CONFIG.maxImagesPerDay; i++) {
          const url = await findImage(dir.name, i);
          if (!url) break;
          images.push(url);
        }
        cache[dir.name] = images; cacheDirty = true;
        return images;
      }

      const images = await probeDay(dir);          // first time for this day
      // only cache days that HAVE photos — empty days are always re-checked, so a day
      // that gets photos later (e.g. added while you were away) is never stuck as empty
      if (images.length && JSON.stringify(cached) !== JSON.stringify(images)) {
        cache[dir.name] = images; cacheDirty = true;
      }
      return images;
    }

    // Enumerate every day from CONFIG.startDate up to today (+ buffer), newest first.
    function buildCandidateDirs() {
      const start = parseFolderDate(CONFIG.startDate);
      if (!start) return [];
      const end = new Date(); end.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + CONFIG.futureBufferDays);
      const list = [];
      for (let d = new Date(end); d >= start; d.setDate(d.getDate() - 1)) {
        const dt = new Date(d);
        list.push({ name: folderName(dt), date: dt });
      }
      return list;
    }

    // Probe a single image URL. HEAD + no-store => always a fresh existence check
    // (bypasses the browser cache and the service worker, which only handles GET),
    // so newly-added photos show up on a normal refresh — no hard refresh needed.
    const tryLoad = (url) => fetch(url, { method: "HEAD", cache: "no-store" })
      .then((r) => r.ok)
      .catch(() => false);

    // Find image <i> for a day by trying each extension; first hit wins.
    async function findImage(name, i) {
      for (const ext of CONFIG.extensions) {
        const url = `${CONFIG.assetsPath}/${name}/${i}.${ext}`;
        if (await tryLoad(url)) return url;
      }
      return null;
    }

    // Photos are named contiguously 1..N. Stop at the first gap (e.g. no 5.png => no 6..10).
    async function probeDay(dir) {
      const images = [];
      for (let i = 1; i <= CONFIG.maxImagesPerDay; i++) {
        const url = await findImage(dir.name, i);
        if (!url) break;
        images.push(url);
      }
      return images;
    }

    function init() {
      dirs = buildCandidateDirs();
      if (!dirs.length) {
        notice(`ការកំណត់ <code>startDate</code> ក្នុង <code>index.html</code> មិនត្រឹមត្រូវទេ។ សូមប្រើទម្រង់ ddmmyyyy។`);
        return;
      }
      $("timeline").innerHTML = "";

      // infinite scroll — probe a bit before reaching the bottom
      observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) loadMore();
      }, {rootMargin: "800px 0px"});
      observer.observe($("sentinel"));

      loadMore(); // first page
    }

    function skeletonGroup() {
      const wrap = document.createElement("section");
      wrap.className = "day-group";
      wrap.innerHTML = `
      <div class="day-header"><span class="title skeleton" style="width:60%;height:1em;border-radius:6px;"></span></div>
      <div class="grid">${Array.from({length: 3}).map(() => `<div class="sk-tile skeleton"></div>`).join("")}</div>`;
      return wrap;
    }

    async function loadMore() {
      if (loading || cursor >= dirs.length) return;
      loading = true;

      const slice = dirs.slice(cursor, cursor + BATCH);
      cursor += slice.length;

      // placeholders keep layout stable while each day is probed
      const placeholders = slice.map(() => {
        const sk = skeletonGroup();
        $("timeline").appendChild(sk);
        return sk;
      });
      $("more").innerHTML = `<div class="center"><div class="spinner"></div>កំពុងស្វែងរករូបភាព…</div>`;

      await Promise.all(slice.map(async (dir, i) => {
        const images = await getDayImages(dir);
        renderDay(placeholders[i], dir, images);
      }));
      saveCache();

      // tally results (slice is newest-first, so keep the first day that has photos)
      for (const dir of slice) {
        if (dir._count > 0) {
          anyRendered = true;
          daysWithPhotos++;
          loadedPhotos += dir._count;
          if (!latestDate) latestDate = dir.date;
        }
      }
      $("statDays").textContent = toKhmer(daysWithPhotos);
      $("statPhotos").textContent = toKhmer(loadedPhotos) + (cursor < dirs.length ? "+" : "");
      if (latestDate) $("statLatest").textContent = shortDate(latestDate);

      $("more").innerHTML = "";
      loading = false;

      if (cursor >= dirs.length && !anyRendered) {
        notice(`មិនទាន់មានរូបភាពទេ។ សូមបន្ថែម <code>${CONFIG.assetsPath}/ddmmyyyy/1.jpg</code> រួច push! 🐕`);
        return;
      }
      // keep probing while the sentinel is still on screen (skips empty days quickly)
      if (cursor < dirs.length) {
        const s = $("sentinel").getBoundingClientRect();
        if (s.top < window.innerHeight + 800) loadMore();
      }
    }

    function renderDay(placeholder, dir, images) {
      dir._count = images.length;
      if (!images.length) {placeholder.remove(); return;}

      placeholder.innerHTML = `
      <div class="day-header">
        <span class="dh-text">
          <span class="title">${lunarLabel(dir.date)}</span>
          <span class="sub">${gregLabel(dir.date)}</span>
        </span>
        <span class="count">📸 ${toKhmer(images.length)}</span>
      </div>
      <div class="grid">
        ${images.map((src) => `<div class="tile"><img loading="lazy" src="${src}" alt="រូបភាពឆ្កែ"></div>`).join("")}
      </div>`;

      placeholder.querySelectorAll(".tile").forEach((tile, idx) => {
        const img = tile.querySelector("img");
        if (img.complete) img.classList.add("loaded");
        else img.addEventListener("load", () => img.classList.add("loaded"), {once: true});
        tile.addEventListener("click", () => openLightbox(images, idx));
      });
    }

    // ---- lightbox (swipe navigate · double-tap & pinch zoom · drag/scroll to close) ----
    const lb = $("lightbox");
    const lbImg = lb.querySelector(".lb-img");
    const lbStage = lb.querySelector(".lb-stage");
    const btnPrev = lb.querySelector(".prev");
    const btnNext = lb.querySelector(".next");
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const MAX_SCALE = 5;

    let gallery = [], gIndex = 0;
    let scale = 1, tx = 0, ty = 0;

    function apply(anim) {
      lbImg.style.transition = anim ? "transform .25s ease" : "none";
      lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      lbImg.classList.toggle("grabbable", scale > 1);
    }
    function resetZoom(anim) { scale = 1; tx = 0; ty = 0; apply(anim); }

    function clampPan() {
      const r = lb.getBoundingClientRect();
      const ovX = Math.max(0, (lbImg.offsetWidth * scale - r.width) / 2);
      const ovY = Math.max(0, (lbImg.offsetHeight * scale - r.height) / 2);
      tx = clamp(tx, -ovX, ovX);
      ty = clamp(ty, -ovY, ovY);
    }

    function setIndex(i) {
      gIndex = clamp(i, 0, gallery.length - 1);
      lbImg.src = gallery[gIndex];
      lb.style.background = "";
      resetZoom(false);
      $("lbCounter").textContent = `${toKhmer(gIndex + 1)} / ${toKhmer(gallery.length)}`;
      const multi = gallery.length > 1;
      btnPrev.hidden = !multi || gIndex === 0;
      btnNext.hidden = !multi || gIndex === gallery.length - 1;
      $("lbCounter").style.display = multi ? "" : "none";
    }
    function nav(dir) {
      const ni = gIndex + dir;
      if (ni >= 0 && ni < gallery.length) setIndex(ni);
    }

    function openLightbox(list, i) {
      gallery = list;
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      setIndex(i);
    }
    function closeLightbox() {
      lb.classList.remove("open");
      lb.setAttribute("aria-hidden", "true");
      lb.style.background = "";
      document.body.style.overflow = "";
    }

    // zoom toward a screen point (cx, cy)
    function zoomTo(target, cx, cy) {
      const r = lb.getBoundingClientRect();
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2;
      const prev = scale;
      scale = clamp(target, 1, MAX_SCALE);
      if (scale === 1) { tx = 0; ty = 0; }
      else {
        // keep the point under the cursor fixed
        const k = scale / prev;
        tx = (tx + centerX - cx) * k - (centerX - cx);
        ty = (ty + centerY - cy) * k - (centerY - cy);
        clampPan();
      }
      apply(true);
    }
    function toggleZoom(cx, cy) { zoomTo(scale > 1 ? 1 : 2.5, cx, cy); }

    // buttons + keyboard
    btnPrev.addEventListener("click", (e) => { e.stopPropagation(); nav(-1); });
    btnNext.addEventListener("click", (e) => { e.stopPropagation(); nav(1); });
    lb.querySelector(".close").addEventListener("click", (e) => { e.stopPropagation(); closeLightbox(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") nav(-1);
      else if (e.key === "ArrowRight") nav(1);
    });

    // click on empty backdrop closes; clicks on the image don't
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target === lbStage) closeLightbox(); });
    lbImg.addEventListener("dblclick", (e) => { e.preventDefault(); toggleZoom(e.clientX, e.clientY); });

    // desktop: scroll down to close (when not zoomed)
    lb.addEventListener("wheel", (e) => {
      if (scale > 1) return;
      if (e.deltaY > 24) closeLightbox();
    }, { passive: true });

    // desktop drag to pan when zoomed
    let mDrag = null;
    lbStage.addEventListener("mousedown", (e) => {
      if (scale <= 1) return;
      mDrag = { x: e.clientX, y: e.clientY, tx, ty };
      lbImg.classList.add("grabbing");
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!mDrag) return;
      tx = mDrag.tx + (e.clientX - mDrag.x);
      ty = mDrag.ty + (e.clientY - mDrag.y);
      clampPan(); apply(false);
    });
    window.addEventListener("mouseup", () => { mDrag = null; lbImg.classList.remove("grabbing"); });

    // ---- touch gestures ----
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
    let mode = null, start = null, lastTap = 0;

    lbStage.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        mode = "pinch";
        start = { d: dist(e.touches), scale, tx, ty, mid: mid(e.touches) };
      } else if (e.touches.length === 1) {
        const t = e.touches[0], now = Date.now();
        if (now - lastTap < 300) {           // double-tap
          toggleZoom(t.clientX, t.clientY);
          lastTap = 0; mode = null; e.preventDefault(); return;
        }
        lastTap = now;
        mode = scale > 1 ? "pan" : "swipe";
        start = { x: t.clientX, y: t.clientY, tx, ty };
      }
    }, { passive: false });

    lbStage.addEventListener("touchmove", (e) => {
      if (!mode) return;
      e.preventDefault();
      if (mode === "pinch" && e.touches.length >= 2) {
        const d = dist(e.touches), m = mid(e.touches);
        scale = clamp(start.scale * d / start.d, 1, MAX_SCALE);
        tx = start.tx + (m.x - start.mid.x);
        ty = start.ty + (m.y - start.mid.y);
        clampPan(); apply(false);
      } else if (mode === "pan") {
        const t = e.touches[0];
        tx = start.tx + (t.clientX - start.x);
        ty = start.ty + (t.clientY - start.y);
        clampPan(); apply(false);
      } else if (mode === "swipe") {
        const t = e.touches[0];
        const dx = t.clientX - start.x, dy = t.clientY - start.y;
        start.dx = dx; start.dy = dy;
        start.vertical = dy > 0 && Math.abs(dy) > Math.abs(dx);
        lbImg.style.transition = "none";
        if (start.vertical) {                // drag down to close
          lbImg.style.transform = `translateY(${dy}px) scale(${clamp(1 - dy / 1400, .8, 1)})`;
          lb.style.background = `rgba(0,0,0,${clamp(.82 - dy / 500, .1, .82)})`;
        } else {                             // horizontal swipe to navigate
          lbImg.style.transform = `translateX(${dx}px)`;
        }
      }
    }, { passive: false });

    lbStage.addEventListener("touchend", (e) => {
      if (mode === "swipe" && start) {
        if (start.vertical && start.dy > 110) { closeLightbox(); mode = null; start = null; return; }
        if (!start.vertical && Math.abs(start.dx || 0) > 55) { nav(start.dx < 0 ? 1 : -1); mode = null; start = null; return; }
        lb.style.background = ""; resetZoom(true);   // snap back
      } else if (mode === "pinch" && scale <= 1.02) {
        resetZoom(true);
      }
      if (e.touches.length === 0) { mode = null; start = null; }
    });

    // ---- caches: register the image-caching service worker ----
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
    }

    // Escape hatch (no UI): run hardRefresh() in the console to clear data + image
    // caches and re-probe everything, e.g. after backfilling photos into an old day.
    window.hardRefresh = async function hardRefresh() {
      try { localStorage.removeItem(CACHE_KEY); } catch {}
      try {
        const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {}
      try {
        const keys = await window.caches?.keys?.() || [];
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
      location.reload();
    };

    init();
