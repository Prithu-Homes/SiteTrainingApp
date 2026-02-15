let authInitialized = false;

function buildMsalConfig() {
  const config = window.appContent?.msal;
  if (!config?.clientId || !config?.authority || !config?.redirectUri) {
    return null;
  }

  return {
    auth: {
      clientId: config.clientId,
      authority: config.authority,
      redirectUri: config.redirectUri,
    },
    cache: {
      cacheLocation: config.cacheLocation || "localStorage",
      storeAuthStateInCookie:
        config.storeAuthStateInCookie === true ||
        config.storeAuthStateInCookie === "true",
    },
  };
}

function initAuthFromContent() {
  if (authInitialized) return true;

  const msalConfig = buildMsalConfig();
  if (!msalConfig) return false;

  if (!window.msal || !window.msal.PublicClientApplication) {
    console.error("MSAL library is not available.");
    return false;
  }

  authInitialized = true;
  console.log("MSAL Redirect URI:", msalConfig.auth.redirectUri);
  const myMSALObj = new msal.PublicClientApplication(msalConfig);

  function updateUI(account) {
    const guestArea = document.getElementById("guest-area");
    const userArea = document.getElementById("user-area");
    const userName = document.getElementById("user-name");

    if (account) {
      const greetingPrefix = window.appContent?.auth?.userGreetingPrefix || "Hi";
      guestArea.classList.add("hidden");
      userArea.classList.remove("hidden");
      userName.textContent = `${greetingPrefix}, ${account.name}`;
    } else {
      guestArea.classList.remove("hidden");
      userArea.classList.add("hidden");
      userName.textContent = "";
    }
  }

  // Handle Redirect Promise (for page reloads after login)
  myMSALObj
    .handleRedirectPromise()
    .then((response) => {
      if (response) {
        updateUI(response.account);
      } else {
        const currentAccounts = myMSALObj.getAllAccounts();
        if (currentAccounts.length > 0) {
          updateUI(currentAccounts[0]);
        }
      }
    })
    .catch((error) => {
      console.error(error);
    });

  // Login Button
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      myMSALObj
        .loginPopup({ scopes: ["User.Read"] })
        .then((response) => {
          updateUI(response.account);
        })
        .catch((error) => {
          console.error(error);
        });
    });
  }

  // Logout Button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const account = myMSALObj.getAllAccounts()[0];
      myMSALObj.logoutRedirect({ account: account });
    });
  }
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  const tryInitAuth = () => {
    if (initAuthFromContent()) {
      window.removeEventListener("contentReady", tryInitAuth);
    }
  };

  window.addEventListener("contentReady", tryInitAuth);
  tryInitAuth();
});
