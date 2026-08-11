// ============================================================
// SHARED CONFIG + AUTH HELPERS
// Loaded by every page before its page-specific script.
// ============================================================
const API_BASE_URL = "http://127.0.0.1:8000";
const PREDICT_ENDPOINT = `${API_BASE_URL}/predict`;
const HEALTH_ENDPOINT = `${API_BASE_URL}/`;
const TOKEN_ENDPOINT = `${API_BASE_URL}/token`;
const REGISTER_ENDPOINT = `${API_BASE_URL}/register`;
const ME_ENDPOINT = `${API_BASE_URL}/me`;
const PREDICTIONS_ENDPOINT = `${API_BASE_URL}/predictions`;

const TOKEN_STORAGE_KEY = "airbnb_predictor_token";

function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function logout() {
  setToken(null);
  window.location.href = "login.html";
}

/**
 * Call at the top of any page that requires a logged-in user.
 * Verifies the stored token against /me. If missing/invalid, redirects
 * to login.html (carrying the current page as ?next= so login can
 * send the user back). Resolves with the user object on success.
 */
async function requireAuth() {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return null;
  }
  try {
    const res = await fetch(ME_ENDPOINT, { headers: authHeaders() });
    if (!res.ok) throw new Error("session invalid");
    return await res.json();
  } catch {
    setToken(null);
    redirectToLogin();
    return null;
  }
}

function redirectToLogin() {
  const next = encodeURIComponent(window.location.pathname.split("/").pop());
  window.location.href = `login.html?next=${next}`;
}

/** Fills in the shared top nav bar once the user is known. */
function renderNav(user, activePage) {
  const mount = document.getElementById("siteNav");
  if (!mount) return;
  mount.innerHTML = `
    <nav class="site-nav">
      <a href="dashboard.html" class="${activePage === "dashboard" ? "active" : ""}">Case history</a>
      <a href="index.html" class="${activePage === "predict" ? "active" : ""}">New filing</a>
      <span class="nav-spacer"></span>
      <span class="nav-user">${user?.email ?? ""}</span>
      <button type="button" class="btn-ghost" id="navLogout">Log out</button>
    </nav>
  `;
  document.getElementById("navLogout").addEventListener("click", logout);
}