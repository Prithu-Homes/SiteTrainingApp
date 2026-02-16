document.addEventListener("DOMContentLoaded", () => {
  // Listen for the content to be ready (fetched or loaded from storage)
  window.addEventListener("contentReady", initTableRenderer);

  // If content is already loaded by the time this script runs
  if (window.appContent && Object.keys(window.appContent).length > 0) {
    initTableRenderer();
  }
});

function initTableRenderer() {
  const container = document.getElementById("tables-container");
  let featureCardsState = normalizeFeatureCardsData(
    window.appContent.features?.cards || [],
  );

  // Prevent double rendering (check if content is already rendered)
  if (!container || container.querySelector(".data-section")) return;

  // Clear placeholder content (like comments/whitespace)
  container.innerHTML = "";

  // 1. Render Site Section
  createTableFromObject("Site", window.appContent.site || {}, "site-section");

  // 2. Render Branding Section
  createTableFromObject(
    "Branding",
    window.appContent.branding || {},
    "branding-section",
  );

  // 3. Render Navigation Links
  createTableFromArray(
    "Navigation Links",
    window.appContent.navigation?.links || [],
    "navigation-links-section",
  );

  // 4. Render Auth Labels
  createTableFromObject("Auth", window.appContent.auth || {}, "auth-section");

  // 5. Render MSAL Config
  createTableFromObject("MSAL", window.appContent.msal || {}, "msal-section");

  // 6. Render Hero Section Data
  createTableFromObject(
    "Hero Section",
    window.appContent.hero || {},
    "hero-section",
  );

  // 7. Render Features Section Data (excluding cards array)
  const featuresData = { ...(window.appContent.features || {}) };
  delete featuresData.cards; // Remove array to handle separately
  createTableFromObject("Features Section", featuresData, "features-section");

  // 8. Render Feature Cards (Array)
  renderFeatureCardsEditor(
    "Feature Cards",
    featureCardsState,
    "cards-section",
  );

  // 9. Render Image Sequence Settings
  const seqData = { ...(window.appContent.imageSequence || {}) };
  delete seqData.images; // Separate array
  createTableFromObject(
    "Image Sequence Settings",
    seqData,
    "sequence-settings",
  );

  // 10. Render Image Sequence Images
  createTableFromArray(
    "Image Sequence Images",
    window.appContent.imageSequence?.images || [],
    "sequence-images",
  );

  // 11. Render Footer
  createTableFromObject(
    "Footer",
    { text: window.appContent.footer || "" },
    "footer-section",
  );

  // 12. Handle JSON Download
  const downloadBtn = document.getElementById("download-json-btn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      // Scrape data directly from the table inputs
      const currentData = scrapeAllData();
      const dataStr = JSON.stringify(currentData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "content.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // --- Helper Functions for Scraping Data ---

  function scrapeAllData() {
    const content = {
      site: scrapeObject("site-section"),
      branding: scrapeObject("branding-section"),
      navigation: { links: scrapeArray("navigation-links-section") },
      auth: scrapeObject("auth-section"),
      msal: scrapeObject("msal-section"),
      hero: scrapeObject("hero-section"),
      features: scrapeObject("features-section"),
      imageSequence: scrapeObject("sequence-settings"),
      footer: scrapeObject("footer-section").text,
    };
    content.features.cards = getFeatureCardsData();
    content.imageSequence.images = scrapeArray("sequence-images");
    return content;
  }

  function getFeatureCardsData() {
    return featureCardsState.map((card) => ({
      image: String(card.image || "").trim(),
      alt: String(card.alt || "").trim(),
      badge: String(card.badge || "").trim(),
      title: String(card.title || "").trim(),
      description: String(card.description || "").trim(),
      ...(String(card.sectionId || "").trim()
        ? { sectionId: String(card.sectionId || "").trim() }
        : {}),
      videos: (Array.isArray(card.videos) ? card.videos : []).map(
        (video, index) => {
          const parsedSequence = Number.parseInt(video.sequence, 10);
          return {
            sequence: Number.isFinite(parsedSequence)
              ? parsedSequence
              : index + 1,
            name: String(video.name || "").trim(),
            description: String(video.description || "").trim(),
            url: String(video.url || "").trim(),
          };
        },
      ),
    }));
  }

  function scrapeObject(elementId) {
    const container = document.getElementById(elementId);
    if (!container) return {};
    const rows = container.querySelectorAll("tbody tr");
    const obj = {};
    rows.forEach((row) => {
      const key = row.cells[0].innerText.trim();
      const value = row.cells[1].innerText.trim();
      obj[key] = value;
    });
    return obj;
  }

  function scrapeArray(elementId) {
    const container = document.getElementById(elementId);
    if (!container) return [];
    const headers = Array.from(container.querySelectorAll("thead th")).map(
      (th) => th.dataset.key,
    );
    const rows = container.querySelectorAll("tbody tr");
    return Array.from(rows).map((row) => {
      const obj = {};
      Array.from(row.cells).forEach((cell, index) => {
        obj[headers[index]] = cell.innerText.trim();
      });
      return obj;
    });
  }

  /**
   * Helper to create a table from a simple Key-Value object
   */
  function createTableFromObject(title, dataObj, elementId) {
    const section = document.createElement("div");
    section.className = "data-section";
    section.id = elementId;

    let html = `<h2>${title}</h2>`;
    html += `<table><thead><tr><th width="30%">Key</th><th>Value</th></tr></thead><tbody>`;

    for (const [key, value] of Object.entries(dataObj)) {
      html += `
            <tr>
                <td><strong>${key}</strong></td>
                <td contenteditable="true" style="background-color: #fffde7;">${value}</td>
            </tr>`;
    }

    html += `</tbody></table>`;
    section.innerHTML = html;
    container.appendChild(section);
  }

  /**
   * Helper to create a table from an Array of Objects
   */
  function createTableFromArray(title, dataArray, elementId) {
    if (!dataArray || dataArray.length === 0) return;

    const section = document.createElement("div");
    section.className = "data-section";
    section.id = elementId;

    // Get headers from the first object keys
    const headers = Object.keys(dataArray[0]);

    let html = `<h2>${title}</h2>`;
    html += `<table><thead><tr>`;

    // Create Headers
    headers.forEach((header) => {
      html += `<th data-key="${header}">${header.charAt(0).toUpperCase() + header.slice(1)}</th>`;
    });
    html += `</tr></thead><tbody>`;

    // Create Rows
    dataArray.forEach((item) => {
      html += `<tr>`;
      headers.forEach((header) => {
        let cellValue = item[header];
        // If it looks like an image path, make it a link or preview
        if (
          typeof cellValue === "string" &&
          (cellValue.includes(".jpg") ||
            cellValue.includes(".png") ||
            cellValue.includes(".avif"))
        ) {
          cellValue = `<span style="color: #666; font-size: 0.9em;">${cellValue}</span>`;
        }
        html += `<td contenteditable="true" style="background-color: #fffde7;">${cellValue}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    section.innerHTML = html;
    container.appendChild(section);
  }

  function renderFeatureCardsEditor(title, cardsArray, elementId) {
    const section = document.createElement("div");
    section.className = "data-section";
    section.id = elementId;

    section.innerHTML = `
      <h2>${title}</h2>
      <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; margin-top:1rem;">
        <label for="card-section-select"><strong>Section:</strong></label>
        <select id="card-section-select" style="padding:0.35rem 0.5rem; min-width:220px;"></select>
        <button type="button" id="add-card-section-btn" class="btn btn-primary" style="padding:0.4rem 0.8rem;">Add Section</button>
        <button type="button" id="delete-card-section-btn" class="btn" style="padding:0.4rem 0.8rem; background:#c62828; color:#fff;">Delete Section</button>
      </div>
      <div id="card-section-editor" style="margin-top:1rem;"></div>
    `;
    container.appendChild(section);

    const sectionSelect = section.querySelector("#card-section-select");
    const addSectionBtn = section.querySelector("#add-card-section-btn");
    const deleteSectionBtn = section.querySelector("#delete-card-section-btn");
    const editorContainer = section.querySelector("#card-section-editor");

    function currentSectionIndex() {
      const idx = Number.parseInt(sectionSelect.value, 10);
      return Number.isInteger(idx) ? idx : -1;
    }

    function setCardField(index, field, value) {
      if (!cardsArray[index]) return;
      cardsArray[index][field] = value;
    }

    function renderSectionOptions(selectedIndex = 0) {
      sectionSelect.innerHTML = "";
      cardsArray.forEach((card, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = card.title?.trim()
          ? `${index + 1}. ${card.title}`
          : `${index + 1}. Untitled Section`;
        sectionSelect.appendChild(option);
      });

      if (cardsArray.length === 0) {
        sectionSelect.disabled = true;
        deleteSectionBtn.disabled = true;
      } else {
        sectionSelect.disabled = false;
        deleteSectionBtn.disabled = false;
        const nextSelected = Math.max(
          0,
          Math.min(selectedIndex, cardsArray.length - 1),
        );
        sectionSelect.value = String(nextSelected);
      }
    }

    function renderVideosEditor(card, cardIndex) {
      const videos = Array.isArray(card.videos) ? card.videos : [];
      const tableRows = videos
        .map(
          (video, videoIndex) => `
          <tr data-video-index="${videoIndex}">
            <td><input data-video-field="sequence" data-video-index="${videoIndex}" type="number" value="${escapeHtml(video.sequence)}" style="width:80px;" /></td>
            <td><input data-video-field="name" data-video-index="${videoIndex}" value="${escapeHtml(video.name)}" style="width:100%;" /></td>
            <td><input data-video-field="description" data-video-index="${videoIndex}" value="${escapeHtml(video.description)}" style="width:100%;" /></td>
            <td><input data-video-field="url" data-video-index="${videoIndex}" value="${escapeHtml(video.url)}" style="width:100%;" /></td>
            <td><button type="button" data-delete-video-index="${videoIndex}" class="btn" style="padding:0.35rem 0.65rem; background:#c62828; color:#fff;">Delete</button></td>
          </tr>
        `,
        )
        .join("");

      return `
        <div style="margin-top:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <h3 style="margin:0;">Videos</h3>
            <button type="button" id="add-video-btn" class="btn btn-primary" style="padding:0.4rem 0.8rem;">Add Video</button>
          </div>
          ${
            videos.length === 0
              ? '<p style="margin:0.5rem 0 0; color:#666;">No videos in this section yet.</p>'
              : `<table>
                  <thead>
                    <tr>
                      <th style="width:90px;">Sequence</th>
                      <th>Name</th>
                      <th>Description</th>
                      <th>URL</th>
                      <th style="width:110px;">Action</th>
                    </tr>
                  </thead>
                  <tbody>${tableRows}</tbody>
                </table>`
          }
        </div>
      `;
    }

    function renderSelectedSection() {
      const index = currentSectionIndex();
      if (index < 0 || !cardsArray[index]) {
        editorContainer.innerHTML =
          '<p style="margin-top:0.75rem; color:#666;">No sections yet. Click "Add Section" to create one.</p>';
        return;
      }

      const card = cardsArray[index];
      editorContainer.innerHTML = `
        <div style="display:grid; gap:0.75rem; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));">
          <label><strong>Title</strong><br/><input id="card-title" value="${escapeHtml(card.title)}" style="width:100%;" /></label>
          <label><strong>Badge</strong><br/><input id="card-badge" value="${escapeHtml(card.badge)}" style="width:100%;" /></label>
          <label><strong>Image</strong><br/><input id="card-image" value="${escapeHtml(card.image)}" style="width:100%;" /></label>
          <label><strong>Alt</strong><br/><input id="card-alt" value="${escapeHtml(card.alt)}" style="width:100%;" /></label>
          <label><strong>Section ID (optional)</strong><br/><input id="card-section-id" value="${escapeHtml(card.sectionId || "")}" style="width:100%;" /></label>
        </div>
        <label style="display:block; margin-top:0.75rem;"><strong>Description</strong><br/><textarea id="card-description" rows="3" style="width:100%;">${escapeHtml(card.description)}</textarea></label>
        ${renderVideosEditor(card, index)}
      `;

      editorContainer.querySelector("#card-title")?.addEventListener("input", (e) => {
        setCardField(index, "title", e.target.value);
        renderSectionOptions(index);
      });
      editorContainer.querySelector("#card-badge")?.addEventListener("input", (e) => {
        setCardField(index, "badge", e.target.value);
      });
      editorContainer.querySelector("#card-image")?.addEventListener("input", (e) => {
        setCardField(index, "image", e.target.value);
      });
      editorContainer.querySelector("#card-alt")?.addEventListener("input", (e) => {
        setCardField(index, "alt", e.target.value);
      });
      editorContainer.querySelector("#card-section-id")?.addEventListener("input", (e) => {
        setCardField(index, "sectionId", e.target.value);
      });
      editorContainer.querySelector("#card-description")?.addEventListener("input", (e) => {
        setCardField(index, "description", e.target.value);
      });

      editorContainer.querySelector("#add-video-btn")?.addEventListener("click", () => {
        const videos = Array.isArray(cardsArray[index].videos)
          ? cardsArray[index].videos
          : [];
        videos.push({
          sequence: videos.length + 1,
          name: "",
          description: "",
          url: "",
        });
        cardsArray[index].videos = videos;
        renderSelectedSection();
      });

      editorContainer
        .querySelectorAll("input[data-video-field]")
        .forEach((input) => {
          input.addEventListener("input", (e) => {
            const videoIndex = Number.parseInt(
              e.target.dataset.videoIndex || "-1",
              10,
            );
            const field = e.target.dataset.videoField;
            if (!Number.isInteger(videoIndex) || videoIndex < 0 || !field) return;
            const videos = cardsArray[index].videos || [];
            if (!videos[videoIndex]) return;
            videos[videoIndex][field] = e.target.value;
          });
        });

      editorContainer
        .querySelectorAll("button[data-delete-video-index]")
        .forEach((button) => {
          button.addEventListener("click", (e) => {
            const videoIndex = Number.parseInt(
              e.currentTarget.dataset.deleteVideoIndex || "-1",
              10,
            );
            if (!Number.isInteger(videoIndex) || videoIndex < 0) return;
            cardsArray[index].videos.splice(videoIndex, 1);
            renderSelectedSection();
          });
        });
    }

    addSectionBtn.addEventListener("click", () => {
      cardsArray.push({
        image: "",
        alt: "",
        badge: "",
        title: "New Section",
        description: "",
        videos: [],
      });
      renderSectionOptions(cardsArray.length - 1);
      renderSelectedSection();
    });

    deleteSectionBtn.addEventListener("click", () => {
      const index = currentSectionIndex();
      if (index < 0 || !cardsArray[index]) return;
      cardsArray.splice(index, 1);
      renderSectionOptions(Math.max(0, index - 1));
      renderSelectedSection();
    });

    sectionSelect.addEventListener("change", () => {
      renderSelectedSection();
    });

    renderSectionOptions(0);
    renderSelectedSection();
  }

  function normalizeFeatureCardsData(cards) {
    return (Array.isArray(cards) ? cards : []).map((card) => ({
      image: String(card.image || ""),
      alt: String(card.alt || ""),
      badge: String(card.badge || ""),
      title: String(card.title || ""),
      description: String(card.description || ""),
      sectionId: String(card.sectionId || ""),
      videos: (Array.isArray(card.videos) ? card.videos : []).map((video) => ({
        sequence: String(video.sequence ?? ""),
        name: String(video.name || ""),
        description: String(video.description || ""),
        url: String(video.url || ""),
      })),
    }));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
}
