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
      return `
        <section class="video-section-card" id="video-section-${index + 1}">
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
