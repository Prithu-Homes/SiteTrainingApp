function buildTrainingSectionId(card, index) {
  const explicitId = (card?.sectionId || "").trim();
  if (explicitId) return explicitId;

  const baseTitle = (card?.title || `section-${index + 1}`).toLowerCase();
  const slug = baseTitle
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "section"}-${index + 1}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toSequenceNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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
      const videos = Array.isArray(card.videos) ? card.videos : [];
      const sortedVideos = [...videos].sort(
        (a, b) =>
          toSequenceNumber(a.sequence, Number.MAX_SAFE_INTEGER) -
          toSequenceNumber(b.sequence, Number.MAX_SAFE_INTEGER),
      );

      const videosHtml =
        sortedVideos.length > 0
          ? sortedVideos
              .map((video, videoIndex) => {
                const sequence = toSequenceNumber(video.sequence, videoIndex + 1);
                const name = escapeHtml(video.name || `Video ${videoIndex + 1}`);
                const description = escapeHtml(video.description || "");
                const url = escapeHtml(video.url || "");

                return `
                  <article class="training-video-item">
                    <video class="training-video-player" controls preload="metadata">
                      <source src="${url}" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <div class="training-video-meta">
                      <p><strong>Sequence:</strong> ${sequence}</p>
                      <p><strong>Name:</strong> ${name}</p>
                      <p><strong>Description:</strong> ${description}</p>
                    </div>
                  </article>
                `;
              })
              .join("")
          : `<p class="empty-videos">No videos added for this section yet.</p>`;

      return `
        <section class="video-section-card" id="${sectionId}">
          <h2>${escapeHtml(title)}</h2>
          <div class="training-video-list">
            ${videosHtml}
          </div>
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
