/**
 * Video Configuration
 * Manages paths and settings for video assets.
 */
const videoConfig = {
  hero: {
    elementId: "hero-video",
    // Ensure this file exists in assets/videos/
    src: "assets/videos/hero-workout.mp4",
    poster: "assets/images/hero-poster.jpg",
    autoplay: true,
    muted: true,
  },
};

/**
 * Loads the hero video dynamically to optimize performance.
 */
function loadHeroVideo() {
  const config = videoConfig.hero;
  const videoElement = document.getElementById(config.elementId);

  if (!videoElement) {
    console.warn(`Video element with ID '${config.elementId}' not found.`);
    return;
  }

  // Set poster
  if (config.poster) {
    videoElement.poster = config.poster;
  }

  // Create source
  const source = document.createElement("source");
  source.src = config.src;
  source.type = "video/mp4";

  videoElement.appendChild(source);

  // Handle autoplay
  if (config.autoplay) {
    videoElement.muted = config.muted; // Autoplay usually requires muted
    const playPromise = videoElement.play();

    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log("Autoplay prevented:", error);
        // Add UI fallback here if needed (e.g., show a play button)
      });
    }
  }
}
