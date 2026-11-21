import { SITE_CONFIG, TRACKS } from "./config.js";
import { trackStreamClick, trackAudioPreview } from "./pixel.js";

const dom = {
  year: document.getElementById("year"),
  footerName: document.getElementById("footerName"),
  artistAvatar: document.getElementById("artistAvatar"),
  artistTagline: document.getElementById("artistTagline"),
  stage: document.getElementById("coverflowStage"),
  npCover: document.getElementById("npCover"),
  npTitle: document.getElementById("npTitle"),
  npSub: document.getElementById("npSub"),
  activeSongLabel: document.getElementById("activeSongLabel"),
  streamGrid: document.getElementById("streamGrid"),
  audioEl: document.getElementById("audioPreview"),
  playIcon: document.getElementById("playIcon"),
  pauseIcon: document.getElementById("pauseIcon"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  playBtn: document.getElementById("playBtn")
};

let activeIndex = resolveInitialTrackIndex();

function resolveInitialTrackIndex() {
  const hashSlug = window.location.hash.replace("#", "").toLowerCase().trim();
  const querySlug = new URLSearchParams(window.location.search).get("song")?.toLowerCase().trim();
  const targetSlug = querySlug || hashSlug || SITE_CONFIG.defaultSlug;

  const idx = TRACKS.findIndex((t) => t.slug === targetSlug);
  return idx !== -1 ? idx : 0;
}

function setPlayingUI(isPlaying) {
  dom.playIcon.style.display = isPlaying ? "none" : "block";
  dom.pauseIcon.style.display = isPlaying ? "block" : "none";
}

function getVisibleSlots(centerIdx) {
  const total = TRACKS.length;
  if (total === 1) {
    return [{ track: TRACKS[0], pos: "pos-center", targetIdx: 0 }];
  }
  const prevIdx = (centerIdx - 1 + total) % total;
  const nextIdx = (centerIdx + 1) % total;

  return [
    { track: TRACKS[prevIdx], pos: "pos-left", targetIdx: prevIdx },
    { track: TRACKS[centerIdx], pos: "pos-center", targetIdx: centerIdx },
    { track: TRACKS[nextIdx], pos: "pos-right", targetIdx: nextIdx }
  ];
}

function renderTrack(index, syncUrl = true) {
  activeIndex = index;
  const track = TRACKS[activeIndex];

  if (syncUrl && window.history?.replaceState) {
    window.history.replaceState(null, "", `#${track.slug}`);
  }

  document.title = `${track.title} — ${SITE_CONFIG.artistName}`;
  document.body.style.background = track.bgGradient;

  dom.audioEl.pause();
  setPlayingUI(false);

  // Render 3D Cover Flow cards
  dom.stage.innerHTML = "";
  getVisibleSlots(activeIndex).forEach(({ track: item, pos, targetIdx }) => {
    const card = document.createElement("article");
    card.className = `cover-card ${pos}`;
    card.innerHTML = `
      <img src="${item.cover}" alt="${item.title}" />
      <div class="cover-card-meta">
        <div class="cover-card-title">${item.title}</div>
        <div class="cover-card-sub">${item.subtitle}</div>
      </div>
    `;
    card.addEventListener("click", () => {
      if (pos !== "pos-center") {
        renderTrack(targetIdx, true);
      } else {
        dom.playBtn.click();
      }
    });
    dom.stage.appendChild(card);
  });

  // Update glass player bar
  dom.npCover.src = track.cover;
  dom.npCover.alt = track.title;
  dom.npTitle.textContent = track.title;
  dom.npSub.textContent = track.previewAudioUrl
    ? "Tap play for preview"
    : `${SITE_CONFIG.artistName} • Spotify`;
  dom.activeSongLabel.textContent = track.title;

  // Render 1-tap platform links
  dom.streamGrid.innerHTML = track.platforms
    .map(
      (p) => `
      <a href="${p.url}" target="_blank" rel="noopener noreferrer"
         class="stream-pill" data-platform="${p.name}">
        <span><span class="dot" style="background:${p.color};"></span>${p.name}</span>
        <span class="arrow">↗</span>
      </a>
    `
    )
    .join("");

  dom.streamGrid.querySelectorAll(".stream-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      trackStreamClick(track.title, pill.dataset.platform);
    });
  });
}

function bindEvents() {
  dom.prevBtn.addEventListener("click", () => {
    renderTrack((activeIndex - 1 + TRACKS.length) % TRACKS.length, true);
  });

  dom.nextBtn.addEventListener("click", () => {
    renderTrack((activeIndex + 1) % TRACKS.length, true);
  });

  dom.playBtn.addEventListener("click", () => {
    const current = TRACKS[activeIndex];
    if (current.previewAudioUrl) {
      if (dom.audioEl.paused) {
        dom.audioEl.src = current.previewAudioUrl;
        dom.audioEl.play();
        setPlayingUI(true);
        dom.npSub.textContent = "Playing preview...";
        trackAudioPreview(current.title);
      } else {
        dom.audioEl.pause();
        setPlayingUI(false);
        dom.npSub.textContent = "Paused";
      }
    } else {
      trackStreamClick(current.title, "Spotify");
      window.open(current.primaryStreamUrl, "_blank", "noopener");
    }
  });

  dom.audioEl.addEventListener("ended", () => {
    setPlayingUI(false);
    dom.npSub.textContent = `${SITE_CONFIG.artistName} • Spotify`;
  });

  window.addEventListener("hashchange", () => {
    renderTrack(resolveInitialTrackIndex(), false);
  });

  // Mobile swipe gestures
  let touchStartX = 0;
  dom.stage.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  dom.stage.addEventListener(
    "touchend",
    (e) => {
      const diff = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(diff) > 40) {
        const nextIdx =
          diff < 0
            ? (activeIndex + 1) % TRACKS.length
            : (activeIndex - 1 + TRACKS.length) % TRACKS.length;
        renderTrack(nextIdx, true);
      }
    },
    { passive: true }
  );
}

function init() {
  dom.year.textContent = new Date().getFullYear();
  dom.footerName.textContent = SITE_CONFIG.artistName;
  dom.artistAvatar.src = SITE_CONFIG.avatarUrl;
  dom.artistAvatar.alt = SITE_CONFIG.artistName;
  dom.artistTagline.textContent = SITE_CONFIG.tagline;

  bindEvents();
  renderTrack(activeIndex, Boolean(window.location.hash));
}

init();