// MSAL Configuration
const msalConfig = {
  auth: {
    clientId: "d9051dac-005c-4352-b9e3-58aaf47061c3", // Replace with your Azure AD Client ID
    authority:
      "https://login.microsoftonline.com/aa947143-f10f-46fc-a1e0-b2e5cba0bbaa",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

document.addEventListener("DOMContentLoaded", () => {
  // MSAL Authentication Logic
  const myMSALObj = new msal.PublicClientApplication(msalConfig);

  function updateUI(account) {
    const guestArea = document.getElementById("guest-area");
    const userArea = document.getElementById("user-area");
    const userName = document.getElementById("user-name");

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
});
