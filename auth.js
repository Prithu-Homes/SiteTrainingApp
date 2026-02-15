// MSAL Configuration
const msalConfig = {
  auth: {
    clientId: "d9051dac-005c-4352-b9e3-58aaf47061c3", // Replace with your Azure AD Client ID
    authority:
      "https://login.microsoftonline.com/aa947143-f10f-46fc-a1e0-b2e5cba0bbaa",
    redirectUri: "https://prithu-homes.github.io/SiteTrainingApp/",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

document.addEventListener("DOMContentLoaded", () => {
  // MSAL Authentication Logic
  console.log("MSAL Redirect URI:", msalConfig.auth.redirectUri);
  const myMSALObj = new msal.PublicClientApplication(msalConfig);

  function updateUI(account) {
    const guestArea = document.getElementById("guest-area");
    const userArea = document.getElementById("user-area");
    const userName = document.getElementById("user-name");

    // 1. Toggle Data View Link based on login status
    const dataViewLink = document.querySelector('a[href="data-view.html"]');
    if (dataViewLink) {
      dataViewLink.style.display = account ? "" : "none";
    }

    if (account) {
      guestArea.classList.add("hidden");
      userArea.classList.remove("hidden");
      userName.textContent = `Hi, ${account.name}`;
    } else {
      guestArea.classList.remove("hidden");
      userArea.classList.add("hidden");
      userName.textContent = "";
    }
  }

  // Ensure UI is updated when content is loaded (handles race condition where content loads after auth)
  window.addEventListener("contentReady", () => {
    const currentAccounts = myMSALObj.getAllAccounts();
    if (currentAccounts.length > 0) {
      updateUI(currentAccounts[0]);
    } else {
      updateUI(null);
    }
  });

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

  // 2. Intercept Card Clicks if not logged in
  document.addEventListener("click", (e) => {
    const cardLink = e.target.closest(".card-link");
    if (cardLink) {
      const currentAccounts = myMSALObj.getAllAccounts();
      if (currentAccounts.length === 0) {
        e.preventDefault();
        alert("Please Log in to Access Training Videos");
      }
    }
  });
});
