document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("contentReady", initTableRenderer);
  if (window.appContent && Object.keys(window.appContent).length > 0) {
    initTableRenderer();
  }
});

function initTableRenderer() {
  const container = document.getElementById("tables-container");
  if (!container || container.dataset.rendered === "true") return;

  const contentState = deepClone(window.appContent || {});
  const defaultState = deepClone(contentState);

  const searchInput = document.getElementById("table-search");
  const entryCount = document.getElementById("entry-count");
  const filterStatus = document.getElementById("filter-status");
  const jumpLinksContainer = document.getElementById("section-jump-links");
  const expandAllBtn = document.getElementById("expand-all-btn");
  const collapseAllBtn = document.getElementById("collapse-all-btn");
  const downloadBtn = document.getElementById("download-json-btn");

  const pages = buildPageModel(contentState, defaultState);
  const refreshRenderer = () => {
    window.appContent = deepClone(contentState);
    container.removeAttribute("data-rendered");
    initTableRenderer();
  };

  container.innerHTML = "";
  const allRenderedRows = [];
  const sectionLinkItems = [];

  pages.forEach((page, pageIndex) => {
    const pageDetails = document.createElement("details");
    pageDetails.className = "page-group";
    pageDetails.dataset.page = page.id;
    pageDetails.open = true;

    const totalRows = page.sections.reduce(
      (sum, section) => sum + section.rows.length,
      0,
    );

    pageDetails.innerHTML = `
      <summary>
        <span>${pageIndex + 1}.</span>
        <span>${escapeHtml(page.title)}</span>
        <span class="summary-meta">${totalRows} items</span>
      </summary>
      <div class="page-sections"></div>
    `;

    const pageSectionsHost = pageDetails.querySelector(".page-sections");

    page.sections.forEach((section, sectionIndex) => {
      const sectionDetails = document.createElement("details");
      sectionDetails.className = "section-group";
      sectionDetails.id = `section-${slugify(`${page.id}-${section.id}`)}`;
      sectionDetails.open = true;

      const trainingToolsHtml = section.type === "training-cards"
        ? `
          <div class="training-tools">
            <label class="training-tools-label" for="title-filter-${escapeHtml(section.id)}">Filter by Title</label>
            <select id="title-filter-${escapeHtml(section.id)}" class="training-tools-select" data-title-filter>
              <option value="__all__">All Titles</option>
            </select>
            <label class="training-tools-label" for="sequence-filter-${escapeHtml(section.id)}">Card Sequence</label>
            <select id="sequence-filter-${escapeHtml(section.id)}" class="training-tools-select" data-sequence-filter>
              <option value="__all__">All Cards</option>
            </select>
            <input class="training-tools-input" type="text" placeholder="New title section..." data-title-input />
            <button type="button" class="mini-btn training-tools-add" data-add-title-section>Add Title Section</button>
            <button type="button" class="mini-btn" data-collapse-all-titles>Collapse Titles</button>
            <button type="button" class="mini-btn" data-expand-all-titles>Expand Titles</button>
          </div>
        `
        : "";

      sectionDetails.innerHTML = `
        <summary>
          <span class="summary-label">- ${escapeHtml(section.title)}</span>
          <span class="summary-meta">${section.rows.length} items</span>
        </summary>
        ${trainingToolsHtml}
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th style="width: 22%;">Key</th>
                <th style="width: 35%;">Value</th>
                <th style="width: 22%;">Group Path</th>
                <th style="width: 13%;">Selector</th>
                <th style="width: 8%;">Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      `;

      const tbody = sectionDetails.querySelector("tbody");
      let previousCardIndex = -1;
      const titleByCard = getTrainingCardTitles(contentState);
      const rowCountByCard = {};

      section.rows.forEach((row) => {
        const cardIndex = extractCardIndex(row.statePath);
        if (
          section.type === "training-cards" &&
          cardIndex >= 0 &&
          cardIndex !== previousCardIndex
        ) {
          const headerRow = document.createElement("tr");
          headerRow.className = "card-group-header-row";
          headerRow.dataset.cardIndex = String(cardIndex);
          headerRow.innerHTML = `
            <td colspan="5" class="card-group-header-cell">
              <button type="button" class="card-group-toggle" data-card-toggle="${cardIndex}">
                <span class="card-toggle-icon">▾</span>
                <strong>Card ${cardIndex + 1}:</strong> ${escapeHtml(titleByCard[cardIndex] || `Untitled ${cardIndex + 1}`)}
              </button>
              <span class="card-group-meta">Grouped title block</span>
            </td>
          `;
          tbody.appendChild(headerRow);
        }

        const tr = document.createElement("tr");
        if (cardIndex >= 0) {
          tr.dataset.cardIndex = String(cardIndex);
          tr.classList.add("card-data-row");
          tr.classList.add(cardIndex % 2 === 0 ? "card-swatch-even" : "card-swatch-odd");
          if (cardIndex !== previousCardIndex) {
            tr.classList.add("card-start-row");
            previousCardIndex = cardIndex;
          }
          if (/\.Video 1\.sequence$/i.test(row.keyLabel)) {
            tr.classList.add("video-start-row");
          }
          rowCountByCard[cardIndex] = (rowCountByCard[cardIndex] || 0) + 1;
        }
        tr.dataset.search = `${row.keyLabel} ${row.groupPath} ${row.selector} ${row.getValueString()}`.toLowerCase();

        tr.innerHTML = `
          <td class="key-cell">${escapeHtml(row.keyLabel)}</td>
          <td>
            <textarea class="value-input" rows="${recommendedRows(row.getValue())}" data-path="${escapeHtml(
              row.statePath,
            )}">${escapeHtml(row.getValueString())}</textarea>
          </td>
          <td class="path-cell">${escapeHtml(row.groupPath)}</td>
          <td class="selector-cell">
            <code>${escapeHtml(row.selector)}</code>
            ${row.openHref ? `<a class="selector-link" href="${escapeHtml(row.openHref)}">Open in ${escapeHtml(
              row.openLabel || "Page",
            )}</a>` : ""}
          </td>
          <td>
            <div class="action-cell">
              <button type="button" class="mini-btn" data-copy-path="${escapeHtml(row.groupPath)}">Copy</button>
              <button type="button" class="mini-btn" data-reset-path="${escapeHtml(row.statePath)}">Reset</button>
            </div>
          </td>
        `;

        const input = tr.querySelector("textarea");
        input.addEventListener("input", () => {
          const raw = input.value;
          row.setValue(raw);
          tr.dataset.search = `${row.keyLabel} ${row.groupPath} ${row.selector} ${raw}`.toLowerCase();
          if (row.statePath.endsWith(".title")) {
            rebuildTrainingTitleOptions(sectionDetails, contentState);
          }
          updateFilter();
        });

        const copyBtn = tr.querySelector("[data-copy-path]");
        copyBtn.addEventListener("click", async () => {
          const text = copyBtn.dataset.copyPath || row.groupPath;
          const ok = await copyToClipboard(text);
          copyBtn.textContent = ok ? "Copied" : "Copy";
          window.setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 1100);
        });

        const resetBtn = tr.querySelector("[data-reset-path]");
        resetBtn.addEventListener("click", () => {
          row.reset();
          input.value = row.getValueString();
          tr.dataset.search = `${row.keyLabel} ${row.groupPath} ${row.selector} ${input.value}`.toLowerCase();
          updateFilter();
        });

        tbody.appendChild(tr);
        allRenderedRows.push(tr);
      });

      if (section.type === "training-cards") {
        tbody.querySelectorAll(".card-group-header-row").forEach((header) => {
          const cardIndex = Number.parseInt(header.dataset.cardIndex || "-1", 10);
          const meta = header.querySelector(".card-group-meta");
          if (meta && Number.isInteger(cardIndex) && cardIndex >= 0) {
            meta.textContent = `${rowCountByCard[cardIndex] || 0} rows`;
          }
        });
      }

      sectionDetails.dataset.rowCount = String(section.rows.length);
      if (section.type === "training-cards") {
        wireTrainingSectionTools(sectionDetails, contentState, defaultState, refreshRenderer);
      }
      pageSectionsHost.appendChild(sectionDetails);

      sectionLinkItems.push({
        id: sectionDetails.id,
        label: section.title,
        pageTitle: page.title,
        indexLabel: `${pageIndex + 1}.${sectionIndex + 1}`,
      });
    });

    container.appendChild(pageDetails);
  });

  if (jumpLinksContainer) {
    jumpLinksContainer.innerHTML = sectionLinkItems
      .map(
        (link) =>
          `<a class="jump-link" href="#${escapeHtml(link.id)}" title="${escapeHtml(
            `${link.pageTitle} > ${link.label}`,
          )}">${escapeHtml(link.indexLabel)} ${escapeHtml(link.label)}</a>`,
      )
      .join("");
  }

  container.dataset.rendered = "true";

  function updateFilter() {
    const query = String(searchInput?.value || "")
      .trim()
      .toLowerCase();

    let visibleRows = 0;
    allRenderedRows.forEach((tr) => {
      const isVisible = !query || tr.dataset.search.includes(query);
      tr.classList.toggle("query-hidden", !isVisible);
      syncRowVisibility(tr);
      if (!tr.classList.contains("hidden-row")) visibleRows += 1;
    });

    container.querySelectorAll(".section-group[data-title-filter-value]").forEach((sectionDetails) => {
      applyTrainingCardFilters(sectionDetails);
    });

    container.querySelectorAll(".section-group").forEach((sectionDetails) => {
      const rows = Array.from(sectionDetails.querySelectorAll("tbody tr"));
      const visibleInSection = rows.filter(
        (row) => !row.classList.contains("hidden-row"),
      ).length;
      sectionDetails.style.display = visibleInSection > 0 ? "" : "none";
      const meta = sectionDetails.querySelector(".summary-meta");
      if (meta) {
        const total = Number.parseInt(sectionDetails.dataset.rowCount || "0", 10);
        meta.textContent = query
          ? `${visibleInSection}/${total} items`
          : `${total} items`;
      }
    });

    container.querySelectorAll(".page-group").forEach((pageDetails) => {
      const visibleSections = Array.from(
        pageDetails.querySelectorAll(".section-group"),
      ).filter((node) => node.style.display !== "none").length;
      pageDetails.style.display = visibleSections > 0 ? "" : "none";
    });

    if (entryCount) {
      entryCount.textContent = `${visibleRows} content entries`;
    }
    if (filterStatus) {
      filterStatus.textContent = query
        ? `Filtered by "${query}" (${visibleRows} matches)`
        : "Showing all entries";
    }
  }

  searchInput?.addEventListener("input", updateFilter);

  expandAllBtn?.addEventListener("click", () => {
    container
      .querySelectorAll(".page-group, .section-group")
      .forEach((node) => (node.open = true));
  });

  collapseAllBtn?.addEventListener("click", () => {
    container
      .querySelectorAll(".section-group")
      .forEach((node) => (node.open = false));
  });

  downloadBtn?.addEventListener("click", () => {
    const dataStr = JSON.stringify(contentState, null, 2);
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

  updateFilter();
}

function buildPageModel(state, defaults) {
  const pagesById = new Map();
  const navigationCandidates = deriveNavigationCandidates(state.navigation?.links || []);

  const ensurePage = (id, title, order, openHref = "") => {
    if (!pagesById.has(id)) {
      pagesById.set(id, {
        id,
        title,
        order,
        openHref,
        openLabel: defaultOpenLabel(title, openHref),
        sections: [],
      });
      return pagesById.get(id);
    }
    const page = pagesById.get(id);
    page.order = Math.min(page.order, order);
    if (!page.openHref && openHref) page.openHref = openHref;
    return page;
  };

  Object.entries(state || {}).forEach(([topKey, topValue], index) => {
    const placement = resolvePagePlacement(topKey, navigationCandidates, index);
    const page = ensurePage(
      placement.id,
      placement.title,
      placement.order,
      placement.openHref,
    );
    if (placement.openLabel) page.openLabel = placement.openLabel;
    const sections = buildSectionsForTopKey({
      topKey,
      topValue,
      pageTitle: page.title,
      openHref: placement.openHref || page.openHref || "",
      openLabel: placement.openLabel || page.openLabel || "",
      state,
      defaults,
    });
    sections.forEach((section) => {
      if (section.rows.length) page.sections.push(section);
    });
  });

  // trainingVideos.html is driven by features.cards/videos; expose it as a dedicated page group
  const trainingVideosRows = buildFeatureCardRows({
    state,
    defaults,
    pageTitle: "Training Videos",
    sectionTitle: "Feature Cards & Videos",
    openHref: "trainingVideos.html",
    openLabel: "Training Videos",
  });
  if (trainingVideosRows.length > 0) {
    const trainingPage = ensurePage(
      "training-videos",
      "Training Videos",
      2,
      "trainingVideos.html",
    );
    trainingPage.openLabel = "Training Videos";
    trainingPage.sections.push({
      id: "training-videos-content",
      title: "Feature Cards & Videos",
      rows: trainingVideosRows,
      type: "training-cards",
    });
  }

  const pages = Array.from(pagesById.values())
    .filter((page) => page.sections.length > 0)
    .sort((a, b) => a.order - b.order)
    .map((page) => ({
      id: page.id,
      title: page.title,
      openHref: page.openHref || "",
      openLabel: page.openLabel || "",
      sections: page.sections,
    }));

  return pages;
}

function wireTrainingSectionTools(sectionDetails, state, defaults, refreshRenderer) {
  rebuildTrainingTitleOptions(sectionDetails, state);
  sectionDetails.dataset.titleFilterValue = "__all__";
  sectionDetails.dataset.sequenceFilterValue = "__all__";

  const filterSelect = sectionDetails.querySelector("[data-title-filter]");
  const sequenceSelect = sectionDetails.querySelector("[data-sequence-filter]");
  const addButton = sectionDetails.querySelector("[data-add-title-section]");
  const titleInput = sectionDetails.querySelector("[data-title-input]");
  const collapseAllBtn = sectionDetails.querySelector("[data-collapse-all-titles]");
  const expandAllBtn = sectionDetails.querySelector("[data-expand-all-titles]");

  filterSelect?.addEventListener("change", () => {
    sectionDetails.dataset.titleFilterValue = filterSelect.value || "__all__";
    applyTrainingCardFilters(sectionDetails);
  });

  sequenceSelect?.addEventListener("change", () => {
    sectionDetails.dataset.sequenceFilterValue = sequenceSelect.value || "__all__";
    applyTrainingCardFilters(sectionDetails);
  });

  addButton?.addEventListener("click", () => {
    const selectedText =
      filterSelect && filterSelect.selectedIndex >= 0
        ? filterSelect.options[filterSelect.selectedIndex].textContent || ""
        : "";
    const newTitle = String(titleInput?.value || "").trim()
      || (filterSelect?.value && filterSelect.value !== "__all__"
        ? `${selectedText} Copy`
        : "");
    const finalTitle = newTitle || `New Title ${((state.features?.cards || []).length || 0) + 1}`;

    if (!state.features || typeof state.features !== "object") {
      state.features = {};
    }
    if (!Array.isArray(state.features.cards)) {
      state.features.cards = [];
    }
    if (!defaults.features || typeof defaults.features !== "object") {
      defaults.features = {};
    }
    if (!Array.isArray(defaults.features.cards)) {
      defaults.features.cards = [];
    }

    const newCard = {
      title: finalTitle,
      badge: finalTitle,
      image: "",
      alt: "",
      description: "",
      sectionId: "",
      videos: [],
    };
    state.features.cards.push(deepClone(newCard));
    defaults.features.cards.push(deepClone(newCard));
    if (titleInput) titleInput.value = "";
    refreshRenderer();
  });

  collapseAllBtn?.addEventListener("click", () => {
    sectionDetails
      .querySelectorAll(".card-group-header-row")
      .forEach((header) => setCardCollapsed(sectionDetails, header.dataset.cardIndex, true));
  });

  expandAllBtn?.addEventListener("click", () => {
    sectionDetails
      .querySelectorAll(".card-group-header-row")
      .forEach((header) => setCardCollapsed(sectionDetails, header.dataset.cardIndex, false));
  });

  sectionDetails.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-card-toggle]");
    if (!toggle) return;
    const cardIndex = toggle.getAttribute("data-card-toggle");
    const isCollapsed = isCardCollapsed(sectionDetails, cardIndex);
    setCardCollapsed(sectionDetails, cardIndex, !isCollapsed);
    applyTrainingCardFilters(sectionDetails);
  });
}

function rebuildTrainingTitleOptions(sectionDetails, state) {
  const filterSelect = sectionDetails.querySelector("[data-title-filter]");
  const sequenceSelect = sectionDetails.querySelector("[data-sequence-filter]");
  if (!filterSelect || !sequenceSelect) return;

  const previousValue = sectionDetails.dataset.titleFilterValue || "__all__";
  const previousSeqValue = sectionDetails.dataset.sequenceFilterValue || "__all__";
  const cards = Array.isArray(state.features?.cards) ? state.features.cards : [];

  filterSelect.innerHTML = '<option value="__all__">All Titles</option>';
  sequenceSelect.innerHTML = '<option value="__all__">All Cards</option>';
  cards.forEach((card, index) => {
    const title = String(card?.title || "").trim() || `Untitled ${index + 1}`;
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = title;
    filterSelect.appendChild(option);

    const seqOption = document.createElement("option");
    seqOption.value = String(index);
    seqOption.textContent = `Card ${index + 1}`;
    sequenceSelect.appendChild(seqOption);
  });

  const canReuseValue =
    previousValue === "__all__" ||
    (Number.isInteger(Number.parseInt(previousValue, 10)) &&
      Number.parseInt(previousValue, 10) >= 0 &&
      Number.parseInt(previousValue, 10) < cards.length);
  const resolvedValue = canReuseValue ? previousValue : "__all__";
  const resolvedSeqValue =
    previousSeqValue === "__all__" ||
    (Number.isInteger(Number.parseInt(previousSeqValue, 10)) &&
      Number.parseInt(previousSeqValue, 10) >= 0 &&
      Number.parseInt(previousSeqValue, 10) < cards.length)
      ? previousSeqValue
      : "__all__";
  sectionDetails.dataset.titleFilterValue = resolvedValue;
  sectionDetails.dataset.sequenceFilterValue = resolvedSeqValue;
  filterSelect.value = resolvedValue;
  sequenceSelect.value = resolvedSeqValue;
  applyTrainingCardFilters(sectionDetails);
}

function applyTrainingCardFilters(sectionDetails) {
  const selectedTitle = sectionDetails.dataset.titleFilterValue || "__all__";
  const selectedSequence = sectionDetails.dataset.sequenceFilterValue || "__all__";
  sectionDetails.querySelectorAll("tbody tr").forEach((tr) => {
    if (!tr.classList.contains("card-data-row")) return;

    const cardIndex = tr.dataset.cardIndex || "";
    const hideByTitle = selectedTitle !== "__all__" && cardIndex !== selectedTitle;
    const hideBySequence =
      selectedSequence !== "__all__" && cardIndex !== selectedSequence;
    tr.classList.toggle("title-hidden", hideByTitle || hideBySequence);
    tr.classList.toggle("collapsed-hidden", isCardCollapsed(sectionDetails, cardIndex));
    syncRowVisibility(tr);
  });

  sectionDetails.querySelectorAll(".card-group-header-row").forEach((header) => {
    const cardIndex = header.dataset.cardIndex || "";
    const hideByTitle = selectedTitle !== "__all__" && cardIndex !== selectedTitle;
    const hideBySequence =
      selectedSequence !== "__all__" && cardIndex !== selectedSequence;
    const headerHidden = hideByTitle || hideBySequence;
    header.classList.toggle("hidden-row", headerHidden);
    if (headerHidden) return;

    const visibleChildRows = Array.from(
      sectionDetails.querySelectorAll(`tbody tr.card-data-row[data-card-index="${cardIndex}"]`),
    ).filter((row) => !row.classList.contains("hidden-row")).length;
    if (visibleChildRows === 0) {
      header.classList.add("hidden-row");
      return;
    }
    header.classList.remove("hidden-row");
  });
}

function syncRowVisibility(tr) {
  const hidden =
    tr.classList.contains("query-hidden") ||
    tr.classList.contains("title-hidden");
  tr.classList.toggle("hidden-row", hidden);
}

function extractCardIndex(statePath) {
  const match = String(statePath || "").match(/^features\.cards\[(\d+)\]/);
  if (!match) return -1;
  const value = Number.parseInt(match[1], 10);
  return Number.isInteger(value) ? value : -1;
}

function getTrainingCardTitles(state) {
  const cards = Array.isArray(state.features?.cards) ? state.features.cards : [];
  return cards.map((card, index) => String(card?.title || "").trim() || `Untitled ${index + 1}`);
}

function isCardCollapsed(sectionDetails, cardIndex) {
  const raw = sectionDetails.dataset.collapsedCards || "";
  if (!raw) return false;
  return raw.split(",").includes(String(cardIndex));
}

function setCardCollapsed(sectionDetails, cardIndex, collapsed) {
  const list = new Set(
    String(sectionDetails.dataset.collapsedCards || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const key = String(cardIndex || "");
  if (!key) return;
  if (collapsed) {
    list.add(key);
  } else {
    list.delete(key);
  }
  sectionDetails.dataset.collapsedCards = Array.from(list).join(",");
  sectionDetails
    .querySelectorAll(`tbody tr.card-data-row[data-card-index="${key}"]`)
    .forEach((row) => {
      row.classList.toggle("collapsed-hidden", collapsed);
      syncRowVisibility(row);
    });
  sectionDetails
    .querySelectorAll(`tbody tr.card-group-header-row[data-card-index="${key}"] .card-toggle-icon`)
    .forEach((icon) => {
      icon.textContent = collapsed ? "▸" : "▾";
    });
}

function buildSectionsForTopKey({
  topKey,
  topValue,
  pageTitle,
  openHref,
  openLabel,
  state,
  defaults,
}) {
  if (topKey === "features" && topValue && typeof topValue === "object") {
    return [
      {
        id: "features-main",
        title: "Features Section",
        rows: buildObjectRows({
          state,
          defaults,
          path: ["features"],
          pageTitle,
          sectionTitle: "Features Section",
          openHref,
          openLabel,
          skipKeys: ["cards"],
        }),
      },
    ];
  }

  if (topKey === "imageSequence" && topValue && typeof topValue === "object") {
    return [
      {
        id: "image-sequence-settings",
        title: "Image Sequence Settings",
        rows: buildObjectRows({
          state,
          defaults,
          path: ["imageSequence"],
          pageTitle,
          sectionTitle: "Image Sequence Settings",
          openHref,
          openLabel,
          skipKeys: ["images"],
        }),
      },
      {
        id: "image-sequence-images",
        title: "Image Sequence Images",
        rows: buildArrayRows({
          state,
          defaults,
          path: ["imageSequence", "images"],
          pageTitle,
          sectionTitle: "Image Sequence Images",
          itemPrefix: "Image",
          openHref,
          openLabel,
        }),
      },
    ];
  }

  if (topKey === "navigation" && topValue && typeof topValue === "object") {
    return [
      {
        id: "navigation-main",
        title: "Navigation",
        rows: buildObjectRows({
          state,
          defaults,
          path: ["navigation"],
          pageTitle,
          sectionTitle: "Navigation",
          openHref,
          openLabel,
          skipKeys: ["links"],
        }),
      },
      {
        id: "navigation-links",
        title: "Navigation Links",
        rows: buildArrayRows({
          state,
          defaults,
          path: ["navigation", "links"],
          pageTitle,
          sectionTitle: "Navigation Links",
          itemPrefix: "Link",
          openHref,
          openLabel,
        }),
      },
    ];
  }

  if (topValue && typeof topValue === "object" && !Array.isArray(topValue)) {
    const sectionTitle = titleCase(topKey);
    return [
      {
        id: slugify(topKey),
        title: sectionTitle,
        rows: buildObjectRows({
          state,
          defaults,
          path: [topKey],
          pageTitle,
          sectionTitle,
          openHref,
          openLabel,
        }),
      },
    ];
  }

  if (Array.isArray(topValue)) {
    const sectionTitle = titleCase(topKey);
    return [
      {
        id: slugify(topKey),
        title: sectionTitle,
        rows: buildArrayRows({
          state,
          defaults,
          path: [topKey],
          pageTitle,
          sectionTitle,
          itemPrefix: "Item",
          openHref,
          openLabel,
        }),
      },
    ];
  }

  return [
    {
      id: slugify(topKey),
      title: titleCase(topKey),
      rows: [
        createLeafRow({
          state,
          defaults,
          pageTitle,
          sectionTitle: titleCase(topKey),
          keyLabel: "value",
          path: [topKey],
          openHref,
          openLabel,
        }),
      ],
    },
  ];
}

function buildObjectRows({
  state,
  defaults,
  path,
  pageTitle,
  sectionTitle,
  openHref,
  openLabel,
  skipKeys = [],
}) {
  const obj = getValueByPath(state, path) || {};
  if (typeof obj !== "object" || Array.isArray(obj)) return [];

  return Object.keys(obj)
    .filter((key) => !skipKeys.includes(key))
    .map((key) => {
      const keyPath = [...path, key];
      return createLeafRow({
        state,
        defaults,
        pageTitle,
        sectionTitle,
        keyLabel: key,
        path: keyPath,
        openHref,
        openLabel,
      });
    });
}

function buildArrayRows({
  state,
  defaults,
  path,
  pageTitle,
  sectionTitle,
  itemPrefix,
  openHref,
  openLabel,
}) {
  const arr = getValueByPath(state, path);
  if (!Array.isArray(arr)) return [];

  const rows = [];

  arr.forEach((item, index) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      Object.keys(item).forEach((key) => {
        rows.push(
          createLeafRow({
            state,
            defaults,
            pageTitle,
            sectionTitle,
            keyLabel: `${itemPrefix} ${index + 1}.${key}`,
            path: [...path, index, key],
            customGroupPath: `${pageTitle} > ${sectionTitle} > ${itemPrefix} ${index + 1} > ${key}`,
            openHref,
            openLabel,
          }),
        );
      });
      return;
    }

    rows.push(
      createLeafRow({
        state,
        defaults,
        pageTitle,
        sectionTitle,
        keyLabel: `${itemPrefix} ${index + 1}`,
        path: [...path, index],
        customGroupPath: `${pageTitle} > ${sectionTitle} > ${itemPrefix} ${index + 1}`,
        openHref,
        openLabel,
      }),
    );
  });

  return rows;
}

function buildFeatureCardRows({
  state,
  defaults,
  pageTitle,
  sectionTitle,
  openHref,
  openLabel,
}) {
  const cards = getValueByPath(state, ["features", "cards"]);
  if (!Array.isArray(cards)) return [];

  const rows = [];
  const cardFields = ["title", "badge", "image", "alt", "description", "sectionId"];

  cards.forEach((card, cardIndex) => {
    cardFields.forEach((field) => {
      if (!(field in (card || {}))) return;
      rows.push(
        createLeafRow({
          state,
          defaults,
          pageTitle,
          sectionTitle,
          keyLabel: `Card ${cardIndex + 1}.${field}`,
          path: ["features", "cards", cardIndex, field],
          customGroupPath: `${pageTitle} > ${sectionTitle} > Card ${cardIndex + 1} > ${field}`,
          openHref,
          openLabel,
        }),
      );
    });

    const videos = Array.isArray(card?.videos) ? card.videos : [];
    videos.forEach((video, videoIndex) => {
      ["sequence", "name", "description", "url"].forEach((field) => {
        if (!(field in (video || {}))) return;
        rows.push(
          createLeafRow({
            state,
            defaults,
            pageTitle,
            sectionTitle,
            keyLabel: `Card ${cardIndex + 1}.Video ${videoIndex + 1}.${field}`,
            path: ["features", "cards", cardIndex, "videos", videoIndex, field],
            customGroupPath: `${pageTitle} > ${sectionTitle} > Card ${cardIndex + 1} > Video ${videoIndex + 1} > ${field}`,
            openHref,
            openLabel,
          }),
        );
      });
    });
  });

  return rows;
}

function createLeafRow({
  state,
  defaults,
  pageTitle,
  sectionTitle,
  keyLabel,
  path,
  customGroupPath = "",
  openHref = "",
  openLabel = "",
}) {
  const defaultValue = deepClone(getValueByPath(defaults, path));
  const statePath = pathToText(path);
  const selector = `#${slugify(path.join("-"))}`;

  return {
    keyLabel,
    selector,
    statePath,
    groupPath: customGroupPath || `${pageTitle} > ${sectionTitle} > ${keyLabel}`,
    openHref,
    openLabel,
    getValue: () => getValueByPath(state, path),
    getValueString: () => stringifyValue(getValueByPath(state, path)),
    setValue: (raw) => {
      const casted = castValue(raw, defaultValue);
      setValueByPath(state, path, casted);
    },
    reset: () => {
      setValueByPath(state, path, deepClone(defaultValue));
    },
  };
}

function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function pathToText(path) {
  let out = "";
  path.forEach((part) => {
    if (typeof part === "number") {
      out += `[${part}]`;
      return;
    }
    out += out ? `.${part}` : String(part);
  });
  return out;
}

function stringifyValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function castValue(raw, reference) {
  const text = String(raw);
  if (typeof reference === "boolean") {
    const normalized = text.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  if (typeof reference === "number") {
    const next = Number.parseFloat(text);
    return Number.isFinite(next) ? next : reference;
  }
  return text;
}

function getValueByPath(root, path) {
  return path.reduce((acc, part) => (acc == null ? undefined : acc[part]), root);
}

function setValueByPath(root, path, value) {
  if (!path.length) return;
  let current = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    current = current[path[i]];
    if (current == null) return;
  }
  current[path[path.length - 1]] = value;
}

function titleCase(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function slugFromHref(href) {
  const value = String(href || "").trim();
  if (!value) return "";
  if (value.startsWith("#")) {
    return slugify(value.slice(1));
  }
  const noQuery = value.split("?")[0].split("#")[0];
  const file = noQuery.split("/").pop() || "";
  return slugify(file.replace(/\.[a-z0-9]+$/i, ""));
}

function deriveNavigationCandidates(links) {
  return (Array.isArray(links) ? links : [])
    .map((link) => {
      const label = String(link?.label || "").trim();
      const href = String(link?.href || "").trim();
      const hrefSlug = slugFromHref(href);
      const labelSlug = slugify(label);
      const id = hrefSlug || labelSlug;
      if (!id || id === "data-view" || id === "data-view-html") return null;
      const openHref = href.startsWith("#") ? "index.html" : href;
      return {
        id,
        title: titleCase(label || id),
        openHref,
        openLabel: titleCase(label || id),
        terms: [normalizeToken(id), normalizeToken(labelSlug), normalizeToken(label)],
      };
    })
    .filter(Boolean);
}

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolvePagePlacement(topKey, navigationCandidates, keyOrder) {
  const globalKeys = new Set([
    "site",
    "branding",
    "navigation",
    "auth",
    "msal",
    "api",
  ]);
  const homeKeys = new Set(["hero", "features", "imageSequence", "footer"]);
  const keyNorm = normalizeToken(topKey);
  const baseNorm = keyNorm.replace(/page$/, "");

  if (globalKeys.has(topKey)) {
    return {
      id: "global-settings",
      title: "Global Settings",
      order: 0,
      openHref: "",
      openLabel: "",
    };
  }

  if (homeKeys.has(topKey)) {
    return {
      id: "home-page",
      title: "Home Page",
      order: 1,
      openHref: "index.html",
      openLabel: "Home",
    };
  }

  if (/page$/i.test(topKey)) {
    return {
      id: slugify(topKey),
      title: titleCase(topKey),
      order: 10 + keyOrder,
      openHref: `${slugify(topKey.replace(/page$/i, "")) || "index"}.html`,
      openLabel: titleCase(topKey.replace(/page$/i, "")) || "Page",
    };
  }

  for (const candidate of navigationCandidates) {
    const matched = candidate.terms.some((term) => {
      if (!term || term.length < 3) return false;
      return (
        keyNorm.includes(term) ||
        term.includes(keyNorm) ||
        baseNorm.includes(term) ||
        term.includes(baseNorm)
      );
    });

    if (matched) {
      return {
        id: `page-${candidate.id}`,
        title: candidate.title,
        order: 20 + keyOrder,
        openHref: candidate.openHref,
        openLabel: candidate.openLabel,
      };
    }
  }

  return {
    id: "content-modules",
    title: "Content Modules",
    order: 99,
    openHref: "",
    openLabel: "",
  };
}

function defaultOpenLabel(title, openHref) {
  if (!openHref) return "";
  if (String(openHref).toLowerCase() === "index.html") return "Home";
  return titleCase(title || "Page");
}

function recommendedRows(value) {
  const text = stringifyValue(value);
  const lines = text.split(/\r\n|\r|\n/).length;
  return Math.max(1, Math.min(5, lines));
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("Clipboard API failed, using fallback.", err);
  }

  try {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
    return true;
  } catch (err) {
    console.error("Fallback clipboard copy failed.", err);
    return false;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
