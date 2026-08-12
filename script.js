// Each room type mapped to an accent color and a small emoji, used
// consistently across the guess card, bullets, and confidence bars.
const ROOM_CLASSES = [
  { key: "Entire home/apt", label: "Whole place", emoji: "🏠", color: "#14A38C", soft: "rgba(20,163,140,0.12)" },
  { key: "Private room", label: "Private room", emoji: "🛏️", color: "#FF6B54", soft: "rgba(255,107,84,0.12)" },
  { key: "Shared room", label: "Shared room", emoji: "🛋️", color: "#FFB648", soft: "rgba(255,182,72,0.16)" },
];

// A few realistic example listings so people can explore without typing.
const EXAMPLES = [
  {
    latitude: 40.7484, longitude: -73.9857, price: 120, minimum_nights: 2,
    number_of_reviews: 84, reviews_per_month: 2.3, calculated_host_listings_count: 1,
    availability_365: 210, neighbourhood_group: "Manhattan", neighbourhood: "Midtown",
  },
  {
    latitude: 40.6782, longitude: -73.9442, price: 55, minimum_nights: 1,
    number_of_reviews: 210, reviews_per_month: 4.1, calculated_host_listings_count: 3,
    availability_365: 300, neighbourhood_group: "Brooklyn", neighbourhood: "Bedford-Stuyvesant",
  },
  {
    latitude: 40.7282, longitude: -73.7949, price: 38, minimum_nights: 3,
    number_of_reviews: 12, reviews_per_month: 0.6, calculated_host_listings_count: 1,
    availability_365: 90, neighbourhood_group: "Queens", neighbourhood: "Flushing",
  },
];
let exampleIndex = 0;

const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ============================================================
// INIT — gate the whole page behind auth, then wire everything up
// ============================================================
(async function init() {
  const user = await getCurrentUser();
  renderNav(user, "predict");

  if (user) {
    document.getElementById("appContent").hidden = false;
    checkApiStatus();
  } else {
    document.getElementById("authPrompt").hidden = false;
  }
})();

// ============================================================
// FORM WIRING
// ============================================================
const form = document.getElementById("predictForm");
const predictBtn = document.getElementById("predictBtn");
const formError = document.getElementById("formError");
const availabilityInput = document.getElementById("availability_365");
const availabilityValue = document.getElementById("availabilityValue");
const exampleBtn = document.getElementById("exampleBtn");

availabilityInput.addEventListener("input", () => {
  availabilityValue.textContent = availabilityInput.value;
});

exampleBtn.addEventListener("click", () => {
  const data = EXAMPLES[exampleIndex % EXAMPLES.length];
  exampleIndex++;
  Object.entries(data).forEach(([key, value]) => {
    const el = form.elements[key];
    if (el) el.value = value;
  });
  availabilityValue.textContent = data.availability_365;
  formError.textContent = "";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  if (!form.reportValidity()) return;

  const payload = collectPayload();
  setLoading(true);

  try {
    const res = await fetch(PREDICT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      setToken(null);
      redirectToLogin();
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail ? formatDetail(body.detail) : `That didn't work (${res.status}).`);
    }

    const result = await res.json();
    renderResult(result);
  } catch (err) {
    formError.textContent = err.message?.includes("fetch")
      ? "Can't reach the server right now — make sure it's running."
      : err.message || "Something went wrong. Double check the values and try again.";
  } finally {
    setLoading(false);
  }
});

function collectPayload() {
  const fd = new FormData(form);
  return {
    latitude: parseFloat(fd.get("latitude")),
    longitude: parseFloat(fd.get("longitude")),
    price: parseFloat(fd.get("price")),
    minimum_nights: parseInt(fd.get("minimum_nights"), 10),
    number_of_reviews: parseInt(fd.get("number_of_reviews"), 10),
    reviews_per_month: parseFloat(fd.get("reviews_per_month")),
    calculated_host_listings_count: parseInt(fd.get("calculated_host_listings_count"), 10),
    availability_365: parseInt(fd.get("availability_365"), 10),
    neighbourhood_group: fd.get("neighbourhood_group"),
    neighbourhood: fd.get("neighbourhood"),
  };
}

function formatDetail(detail) {
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join(" ");
  }
  return detail ? String(detail) : "";
}

function setLoading(isLoading) {
  predictBtn.disabled = isLoading;
  predictBtn.classList.toggle("loading", isLoading);
}

// ============================================================
// RESULT RENDERING — friendly guess card + confidence bars
// ============================================================
const resultEmpty = document.getElementById("resultEmpty");
const resultContent = document.getElementById("resultContent");
const guessMount = document.getElementById("guessMount");
const probList = document.getElementById("probList");

function renderResult(result) {
  const predicted = result.Predicted_room_type;
  const probs = result.Probability; // array aligned to model.classes_ order

  const paired = ROOM_CLASSES.map((cls, i) => ({
    ...cls,
    prob: typeof probs?.[i] === "number" ? probs[i] : 0,
  }));

  resultEmpty.hidden = true;
  resultContent.hidden = false;

  buildGuessCard(paired, predicted);
  buildConfidenceList(paired, predicted);
}

function buildGuessCard(paired, predicted) {
  guessMount.innerHTML = "";
  const match = paired.find((c) => c.key === predicted) || paired[0];
  const pct = Math.round(match.prob * 100);

  const card = document.createElement("div");
  card.className = "guess-card";
  card.style.setProperty("--guess-color", match.color);
  card.style.setProperty("--guess-soft", match.soft);

  card.innerHTML = `
    <span class="guess-emoji">${match.emoji}</span>
    <div>
      <span class="guess-eyebrow">Looks like a…</span>
      <span class="guess-label">${match.label}${pct ? ` (${pct}% sure)` : ""}</span>
    </div>
  `;

  guessMount.appendChild(card);

  requestAnimationFrame(() => {
    setTimeout(() => card.classList.add("landed"), REDUCE_MOTION ? 0 : 40);
  });
}

function buildConfidenceList(paired, predicted) {
  probList.innerHTML = "";
  const sorted = [...paired].sort((a, b) => b.prob - a.prob);

  sorted.forEach((cls) => {
    const row = document.createElement("div");
    row.className = "prob-row" + (cls.key === predicted ? " top" : "");
    row.style.setProperty("--class-color", cls.color);

    const bullet = document.createElement("span");
    bullet.className = "prob-bullet";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = `${cls.emoji} ${cls.label}`;

    const value = document.createElement("span");
    value.className = "value";
    value.textContent = "0%";

    const track = document.createElement("div");
    track.className = "prob-track";
    const fill = document.createElement("div");
    fill.className = "prob-fill";
    track.appendChild(fill);

    row.appendChild(bullet);
    row.appendChild(name);
    row.appendChild(value);
    row.appendChild(track);
    probList.appendChild(row);

    const pct = Math.round(cls.prob * 100);
    requestAnimationFrame(() => {
      setTimeout(() => {
        fill.style.width = `${pct}%`;
        animateCount(value, pct);
      }, REDUCE_MOTION ? 0 : 150);
    });
  });
}

function animateCount(el, target) {
  if (REDUCE_MOTION) {
    el.textContent = `${target}%`;
    return;
  }
  const duration = 650;
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = `${Math.round(target * eased)}%`;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ============================================================
// API HEALTH CHECK
// ============================================================
async function checkApiStatus() {
  const statusEl = document.getElementById("apiStatus");
  try {
    const res = await fetch(HEALTH_ENDPOINT, { method: "GET" });
    if (res.ok) {
      statusEl.classList.add("online");
      statusEl.classList.remove("offline");
      statusEl.lastChild.textContent = "connected";
    } else {
      throw new Error("bad status");
    }
  } catch {
    statusEl.classList.add("offline");
    statusEl.classList.remove("online");
    statusEl.lastChild.textContent = "can't connect";
  }
}