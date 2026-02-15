/**
 * Video Configuration
 * Loads video settings dynamically from window.appContent (populated by content.js)
 */
function loadHeroVideo() {
  // 1. Wait for Content to be loaded
  if (!window.appContent || !window.appContent.hero) {
    window.addEventListener("contentReady", loadHeroVideo);
    return;
  }

  const config = window.appContent.hero;
  const videoElement = document.getElementById("hero-video");

  if (!videoElement) {
    console.warn("Hero video element not found.");
    return;
  }

  // 2. Set Poster
  if (config.poster) {
    videoElement.poster = config.poster;
  }

  // 3. Set Video Source
  if (config.video) {
    // Clear previous sources
    videoElement.innerHTML = "";

    const source = document.createElement("source");
    source.src = config.video;
    source.type = "video/mp4";
    videoElement.appendChild(source);

    // 4. Attempt Autoplay
    videoElement.muted = true; // Required for autoplay
    const playPromise = videoElement.play();

    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log("Autoplay prevented or video missing:", error);
      });
    }
  }
}
