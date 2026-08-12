renderNav(null, "login");

// If already logged in, skip straight to the dashboard (or wherever ?next= points).
(async function redirectIfAuthed() {
  const token = getToken();
  if (!token) return;
  try {
    const res = await fetch(ME_ENDPOINT, { headers: authHeaders() });
    if (res.ok) {
      window.location.href = nextPageOr("dashboard.html");
    } else {
      setToken(null);
    }
  } catch {
    // API unreachable — let them try logging in manually instead of looping.
  }
})();

function nextPageOr(fallback) {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  const allowed = ["dashboard.html", "index.html"];
  return next && allowed.includes(next) ? next : fallback;
}

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const authError = document.getElementById("authError");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";

  const fd = new FormData(loginForm);
  const body = new URLSearchParams();
  body.set("username", fd.get("email"));
  body.set("password", fd.get("password"));

  setLoading(true);
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "That email and password don't match. Try again?");
    }
    const data = await res.json();
    setToken(data.access_token);
    window.location.href = nextPageOr("dashboard.html");
  } catch (err) {
    authError.textContent = err.message?.includes("fetch")
      ? "Can't reach the server right now — make sure it's running."
      : err.message;
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  loginBtn.classList.toggle("loading", isLoading);
}