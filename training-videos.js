function buildTrainingSectionId(card, index) {
  const explicitId = (card?.sectionId || "").trim();
  if (explicitId) return explicitId;

  const baseTitle = (card?.title || `section-${index + 1}`).toLowerCase();
  const slug = baseTitle
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "section"}-${index + 1}`;
}

let videosMsalApp = null;
let authInitPromise = null;

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

function isAzureBlobUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.hostname.endsWith(".blob.core.windows.net");
  } catch {
    return false;
  }
}

function getBlobFileName(url) {
  try {
    const parsed = new URL(url, window.location.href);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return "";
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return "";
  }
}

function getVideosAuthConfig() {
  return window.appContent?.api || {};
}

function getMsalConfigFromContent() {
  const msalConfig = window.appContent?.msal;
  if (!msalConfig?.clientId || !msalConfig?.authority || !msalConfig?.redirectUri) {
    return null;
  }

  return {
    auth: {
      clientId: msalConfig.clientId,
      authority: msalConfig.authority,
      redirectUri: msalConfig.redirectUri
    },
    cache: {
      cacheLocation: msalConfig.cacheLocation || "localStorage",
      storeAuthStateInCookie: Boolean(msalConfig.storeAuthStateInCookie)
    }
  };
}

async function signInForVideos() {
  if (!videosMsalApp) return;
  const popupRedirectUri = new URL("auth-callback.html", window.location.href).href;
  try {
    await videosMsalApp.loginPopup({
      scopes: ["User.Read"],
      redirectUri: popupRedirectUri
    });
  } catch {
    // no-op
  }
}

async function signOutForVideos() {
  if (!videosMsalApp) return;
  const account = videosMsalApp.getAllAccounts()[0];
  if (!account) return;
  try {
    await videosMsalApp.logoutPopup({ account });
  } catch {
    // no-op
  }
}

async function getSignedInAccount() {
  if (!window.msal?.PublicClientApplication) {
    return null;
  }

  const config = getMsalConfigFromContent();
  if (!config) {
    return null;
  }

  if (!videosMsalApp) {
    videosMsalApp = new window.msal.PublicClientApplication(config);
  }

  if (!authInitPromise) {
    authInitPromise = videosMsalApp.handleRedirectPromise().catch(() => null);
  }
  await authInitPromise;

  const accounts = videosMsalApp.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

async function fetchSasUrl(fileName) {
  const apiConfig = getVideosAuthConfig();
  const endpoint = (apiConfig.generateVideoSasUrl || "").trim();
  if (!endpoint) {
    return null;
  }

  const account = await getSignedInAccount();
  if (!account || !videosMsalApp) {
    return null;
  }

  let token = "";
  try {
    const tokenResponse = await videosMsalApp.acquireTokenSilent({
      account,
      scopes: ["openid", "profile"]
    });
    token = (tokenResponse?.idToken || tokenResponse?.accessToken || "").trim();
  } catch {
    return null;
  }

  if (!token) {
    return null;
  }

  const requestUrl = new URL(endpoint);
  requestUrl.searchParams.set("file", fileName);

  const response = await fetch(requestUrl.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return payload?.sasUrl || null;
}

async function resolveVideoUrl(originalUrl, account) {
  if (!isAzureBlobUrl(originalUrl)) {
    return { url: originalUrl, locked: false, error: "" };
  }

  if (!account) {
    return { url: "", locked: true, error: "Log in to load this video." };
  }

  const fileName = getBlobFileName(originalUrl);
  if (!fileName) {
    return { url: "", locked: false, error: "Video file name is invalid." };
  }

  try {
    const sasUrl = await fetchSasUrl(fileName);
    if (!sasUrl) {
      return { url: "", locked: false, error: "Unable to generate secure video URL." };
    }
    return { url: sasUrl, locked: false, error: "" };
  } catch {
    return { url: "", locked: false, error: "Unable to generate secure video URL." };
  }
}

async function renderTrainingVideoSections() {
  const container = document.getElementById("videos-sections");
  if (!container) return;

  const account = await getSignedInAccount();
  const accountBanner = document.getElementById("videos-auth-status");
  if (accountBanner) {
    accountBanner.textContent = account
      ? `Signed in as ${account.name || account.username || "user"}`
      : "You are not signed in. Blob videos require login.";
  }

  const cards = window.appContent?.features?.cards || [];
  if (cards.length === 0) {
    container.innerHTML =
      '<div class="video-section-card"><h2>No Sections Found</h2><p>Add items under features.cards in content.json.</p></div>';
    return;
  }

  const cardHtmlList = await Promise.all(
    cards.map(async (card, index) => {
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
          ? (
            await Promise.all(
              sortedVideos.map(async (video, videoIndex) => {
                const sequence = toSequenceNumber(video.sequence, videoIndex + 1);
                const name = escapeHtml(video.name || `Video ${videoIndex + 1}`);
                const description = escapeHtml(video.description || "");
                const resolved = await resolveVideoUrl(video.url || "", account);
                const url = escapeHtml(resolved.url);
                const error = escapeHtml(resolved.error);
                const mediaBlock = resolved.url
                  ? `
                    <video class="training-video-player" controls preload="metadata">
                      <source src="${url}" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  `
                  : `<p class="empty-videos">${error || "Video unavailable."}</p>`;

                return `
                  <article class="training-video-item">
                    ${mediaBlock}
                    <div class="training-video-meta">
                      <p><strong>Sequence:</strong> ${sequence}</p>
                      <p><strong>Name:</strong> ${name}</p>
                      <p><strong>Description:</strong> ${description}</p>
                    </div>
                  </article>
                `;
              }),
            )
          ).join("")
          : `<p class="empty-videos">No videos added for this section yet.</p>`;

      return `
        <section class="video-section-card" id="${sectionId}">
          <h2>${escapeHtml(title)}</h2>
          <div class="training-video-list">
            ${videosHtml}
          </div>
        </section>
      `;
    }),
  );

  container.innerHTML = cardHtmlList.join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("videos-login-btn");
  const logoutBtn = document.getElementById("videos-logout-btn");

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      await getSignedInAccount();
      await signInForVideos();
      await renderTrainingVideoSections();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await getSignedInAccount();
      await signOutForVideos();
      await renderTrainingVideoSections();
    });
  }

  window.addEventListener("contentReady", renderTrainingVideoSections);

  if (window.appContent && Object.keys(window.appContent).length > 0) {
    renderTrainingVideoSections();
  }
});
