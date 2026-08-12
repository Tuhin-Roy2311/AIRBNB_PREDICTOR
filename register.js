renderNav(null, "register");

const registerForm = document.getElementById("registerForm");
const registerBtn = document.getElementById("registerBtn");
const authError = document.getElementById("authError");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";

  const fd = new FormData(registerForm);
  const email = fd.get("email");
  const password = fd.get("password");

  setLoading(true);
  try {
    const res = await fetch(REGISTER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(formatDetail(err?.detail) || "Something went wrong signing you up.");
    }

    // Auto-login right after registering, then go straight to the dashboard.
    const body = new URLSearchParams();
    body.set("username", email);
    body.set("password", password);
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!tokenRes.ok) {
      window.location.href = "login.html";
      return;
    }
    const data = await tokenRes.json();
    setToken(data.access_token);
    window.location.href = "dashboard.html";
  } catch (err) {
    authError.textContent = err.message?.includes("fetch")
      ? "Can't reach the server right now — make sure it's running."
      : err.message;
  } finally {
    setLoading(false);
  }
});

function formatDetail(detail) {
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join(" ");
  }
  return detail ? String(detail) : "";
}

function setLoading(isLoading) {
  registerBtn.disabled = isLoading;
  registerBtn.classList.toggle("loading", isLoading);
}