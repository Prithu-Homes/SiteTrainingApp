document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("tables-container");

  if (!container || typeof appContent === "undefined") return;

  // 1. Render Hero Section Data
  createTableFromObject("Hero Section", appContent.hero);

  // 2. Render Features Section Data (excluding cards array)
  const featuresData = { ...appContent.features };
  delete featuresData.cards; // Remove array to handle separately
  createTableFromObject("Features Section", featuresData);

  // 3. Render Feature Cards (Array)
  createTableFromArray("Feature Cards", appContent.features.cards);

  // 4. Render Footer
  createTableFromObject("Footer", { text: appContent.footer });

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

  /**
   * Helper to create a table from a simple Key-Value object
   */
  function createTableFromObject(title, dataObj) {
    const section = document.createElement("div");
    section.className = "data-section";

    let html = `<h2>${title}</h2>`;
    html += `<table><thead><tr><th width="30%">Key</th><th>Value</th></tr></thead><tbody>`;

    for (const [key, value] of Object.entries(dataObj)) {
      html += `
            <tr>
                <td><strong>${key}</strong></td>
                <td>${value}</td>
            </tr>`;
    }

    html += `</tbody></table>`;
    section.innerHTML = html;
    container.appendChild(section);
  }

  /**
   * Helper to create a table from an Array of Objects
   */
  function createTableFromArray(title, dataArray) {
    if (!dataArray || dataArray.length === 0) return;

    const section = document.createElement("div");
    section.className = "data-section";

    // Get headers from the first object keys
    const headers = Object.keys(dataArray[0]);

    let html = `<h2>${title}</h2>`;
    html += `<table><thead><tr>`;

    // Create Headers
    headers.forEach((header) => {
      html += `<th>${header.charAt(0).toUpperCase() + header.slice(1)}</th>`;
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
        html += `<td>${cellValue}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    section.innerHTML = html;
    container.appendChild(section);
  }
});
