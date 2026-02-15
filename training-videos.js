function buildTrainingSectionId(card, index) {
  const explicitId = (card?.sectionId || "").trim();
  if (explicitId) return explicitId;

  const baseTitle = (card?.title || `section-${index + 1}`).toLowerCase();
  const slug = baseTitle
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "section"}-${index + 1}`;
}

function renderTrainingVideoSections() {
  const container = document.getElementById("videos-sections");
  if (!container) return;

  const cards = window.appContent?.features?.cards || [];
  if (cards.length === 0) {
    container.innerHTML =
      '<div class="video-section-card"><h2>No Sections Found</h2><p>Add items under features.cards in content.json.</p></div>';
    return;
  }

  container.innerHTML = cards
    .map((card, index) => {
      const title = (card.title || `Section ${index + 1}`).trim();
      const sectionId = buildTrainingSectionId(card, index);
      return `
        <section class="video-section-card" id="${sectionId}">
          <h2>${title}</h2>
          <p>Video content for "${title}" can be added here.</p>
        </section>
      `;
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("contentReady", renderTrainingVideoSections);

  if (window.appContent && Object.keys(window.appContent).length > 0) {
    renderTrainingVideoSections();
  }
});
