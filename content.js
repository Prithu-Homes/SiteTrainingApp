// Global content variable
window.appContent = {};

// Custom event to notify other scripts when data is loaded
const contentReadyEvent = new Event("contentReady");

async function loadContent() {
  // 1. Try LocalStorage first (Fastest for returning users/edits)
  const stored = localStorage.getItem("siteContent");
  if (stored) {
    try {
      window.appContent = JSON.parse(stored);
      updateDOM();
      window.dispatchEvent(contentReadyEvent);
      return;
    } catch (e) {
      console.error("Error parsing stored content:", e);
      localStorage.removeItem("siteContent");
    }
  }

  // 2. Fetch from JSON file (Default)
  try {
    const response = await fetch("content.json");
    if (!response.ok)
      throw new Error(`Failed to load content.json: ${response.status}`);
    window.appContent = await response.json();
    updateDOM();
    window.dispatchEvent(contentReadyEvent);
  } catch (error) {
    console.error("Error loading content:", error);
    alert("Error loading content. Check console for details.");
  }
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
