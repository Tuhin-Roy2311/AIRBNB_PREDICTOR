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
      throw new Error(formatDetail(err?.detail) || "Registration failed.");
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
      // Registered fine, but auto-login failed — send them to log in manually.
      window.location.href = "login.html";
      return;
    }
    const data = await tokenRes.json();
    setToken(data.access_token);
    window.location.href = "dashboard.html";
  } catch (err) {
    authError.textContent = err.message?.includes("fetch")
      ? "Can't reach the classification registry. Make sure the API is running."
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