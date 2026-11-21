export function trackStreamClick(songTitle, platformName) {
  if (typeof window.fbq !== "function") return;

  window.fbq("track", "ViewContent", {
    content_name: songTitle,
    content_category: platformName
  });

  window.fbq("trackCustom", "StreamClick", {
    song_title: songTitle,
    music_platform: platformName
  });
}

export function trackAudioPreview(songTitle) {
  if (typeof window.fbq !== "function") return;

  window.fbq("trackCustom", "AudioPreviewPlay", {
    song_title: songTitle
  });
}