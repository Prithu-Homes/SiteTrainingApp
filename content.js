// Global content variable
window.appContent = {};

// Custom event to notify other scripts when data is loaded
const contentReadyEvent = new Event("contentReady");

async function loadContent() {
  // 1. Fetch from JSON file (Base of Truth)
  let fileContent = {};
  try {
    const response = await fetch("content.json");
    if (response.ok) {
      fileContent = await response.json();
    } else {
      console.error(`Failed to load content.json: ${response.status}`);
    }
  } catch (error) {
    console.error("Error loading content:", error);
  }

  window.appContent = fileContent;

  updateDOM();
  window.dispatchEvent(contentReadyEvent);
}

/**
 * Updates the DOM elements with the current appContent data.
 */
function updateDOM() {
  // Guard clause: Only run if we are on the main page (checking for hero section)
  if (!document.querySelector(".hero-content")) return;

  // 1. Populate Hero Section
  // We use optional chaining (?.) just in case a key is missing in the saved data
  document.querySelector(".hero-content h1").textContent =
    window.appContent.hero?.title || "";
  document.querySelector(".hero-content p").textContent =
    window.appContent.hero?.subtitle || "";
  document.querySelector(".hero-content .btn-primary").textContent =
    window.appContent.hero?.ctaPrimary || "";
  document.querySelector(".hero-content .btn-outline").textContent =
    window.appContent.hero?.ctaSecondary || "";

  // 2. Populate Features Header
  document.querySelector(".section-header h2").textContent =
    window.appContent.features?.heading || "";
  document.querySelector(".section-header p").textContent =
    window.appContent.features?.subheading || "";

  // 3. Generate Feature Cards Dynamically
  const featureGrid = document.querySelector(".feature-grid");
  if (featureGrid && window.appContent.features?.cards) {
    featureGrid.innerHTML = window.appContent.features.cards
      .map(
        (card) => `
        <div class="card">
            <div class="card-image">
                <img src="${card.image}" alt="${card.title}" onerror="this.style.display='none'; this.parentElement.style.backgroundColor='#ccc'">
                <div class="card-badge">${card.badge}</div>
            </div>
            <div class="card-body">
                <h3>${card.title}</h3>
                <p>${card.description}</p>
            </div>
        </div>
    `,
      )
      .join("");
  }

  // 4. Populate Footer
  document.querySelector("footer p").innerHTML = window.appContent.footer || "";

  // 5. Render Image Sequence
  renderImageSequence();
}

document.addEventListener("DOMContentLoaded", () => {
  loadContent();
});

// Handle BFCache (Back/Forward Cache) for browser navigation
window.addEventListener("pageshow", (event) => {
  // If the page is being served from the cache (e.g. back button)
  if (event.persisted) {
    loadContent();
  }
});

/**
 * Renders the scrolling image sequence section.
 */
function renderImageSequence() {
  const data = window.appContent.imageSequence;
  if (!data) return;

  let container = document.getElementById("image-sequence-section");
  if (!container) {
    container = document.createElement("div");
    container.id = "image-sequence-section";
    // Insert before footer
    const footer = document.querySelector("footer");
    if (footer) {
      footer.parentNode.insertBefore(container, footer);
    } else {
      document.body.appendChild(container);
    }
  }

  // Inject CSS for the marquee effect
  if (!document.getElementById("seq-styles")) {
    const style = document.createElement("style");
    style.id = "seq-styles";
    style.innerHTML = `
      #image-sequence-section { position: relative; width: 100%; height: 300px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000; margin: 2rem 0; }
      .seq-track { display: flex; position: absolute; left: 0; top: 0; height: 100%; animation: scrollRight 30s linear infinite; }
      .seq-track img { height: 100%; width: auto; object-fit: cover; }
      @keyframes scrollRight {
        0% { transform: translateX(-50%); }
        100% { transform: translateX(0); }
      }
      .seq-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 10; display: flex; align-items: center; justify-content: center; pointer-events: none; }
      .seq-text { color: white; font-size: 3rem; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); z-index: 20; text-align: center; padding: 0 1rem; }
    `;
    document.head.appendChild(style);
  }

  // Prepare images (duplicated for seamless loop)
  const images = data.images || [];
  if (images.length === 0) return;

  // Create enough duplicates to fill screen and scroll smoothly
  const imagesHtml = images
    .map(
      (img) =>
        `<img src="${img.src}" alt="" onerror="this.style.display='none'">`,
    )
    .join("");
  const trackContent = imagesHtml + imagesHtml + imagesHtml + imagesHtml;

  const opacity = data.overlayOpacity || "0.3";

  // Render HTML
  container.innerHTML = `
    <div class="seq-track">
      ${trackContent}
    </div>
    <div class="seq-overlay" style="background-color: rgba(0,0,0,${opacity})">
      <h2 class="seq-text">${data.overlayText || ""}</h2>
    </div>
  `;
}
