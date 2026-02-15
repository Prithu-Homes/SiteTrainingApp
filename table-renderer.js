document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("tables-container");

  if (!container || typeof appContent === "undefined") return;

  // 1. Render Hero Section Data
  createTableFromObject("Hero Section", appContent.hero, "hero-section");

  // 2. Render Features Section Data (excluding cards array)
  const featuresData = { ...appContent.features };
  delete featuresData.cards; // Remove array to handle separately
  createTableFromObject("Features Section", featuresData, "features-section");

  // 3. Render Feature Cards (Array)
  createTableFromArray(
    "Feature Cards",
    appContent.features.cards,
    "cards-section",
  );

  // 4. Render Footer
  createTableFromObject(
    "Footer",
    { text: appContent.footer },
    "footer-section",
  );

  // 5. Handle JSON Download
  const downloadBtn = document.getElementById("download-json-btn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      const dataStr = JSON.stringify(appContent, null, 2);
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

  // 6. Handle Save Changes
  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const newContent = {
        hero: scrapeObject("hero-section"),
        features: scrapeObject("features-section"),
        footer: scrapeObject("footer-section").text,
      };

      // Add cards back to features
      newContent.features.cards = scrapeArray("cards-section");

      // Save to LocalStorage
      localStorage.setItem("siteContent", JSON.stringify(newContent));
      alert("Changes saved! Return to the Home page to see updates.");
    });
  }

  // 7. Handle Reset
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to reset all content to default?")) {
        localStorage.removeItem("siteContent");
        location.reload();
      }
    });
  }

  // --- Helper Functions for Scraping Data ---

  function scrapeObject(elementId) {
    const container = document.getElementById(elementId);
    const rows = container.querySelectorAll("tbody tr");
    const obj = {};
    rows.forEach((row) => {
      const key = row.cells[0].innerText;
      const value = row.cells[1].innerText;
      obj[key] = value;
    });
    return obj;
  }

  function scrapeArray(elementId) {
    const container = document.getElementById(elementId);
    const headers = Array.from(container.querySelectorAll("thead th")).map(
      (th) => th.dataset.key,
    );
    const rows = container.querySelectorAll("tbody tr");
    return Array.from(rows).map((row) => {
      const obj = {};
      Array.from(row.cells).forEach((cell, index) => {
        obj[headers[index]] = cell.innerText;
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
});
