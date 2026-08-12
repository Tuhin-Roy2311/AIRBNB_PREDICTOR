const CLASS_INFO = {
  "Entire home/apt": { label: "Whole place", emoji: "🏠", color: "#14A38C" },
  "Private room": { label: "Private room", emoji: "🛏️", color: "#FF6B54" },
  "Shared room": { label: "Shared room", emoji: "🛋️", color: "#FFB648" },
};

const historyLoading = document.getElementById("historyLoading");
const historyEmpty = document.getElementById("historyEmpty");
const historyError = document.getElementById("historyError");
const historyList = document.getElementById("historyList");
const recordCount = document.getElementById("recordCount");

(async function init() {
  const user = await getCurrentUser();
  renderNav(user, "dashboard");

  if (user) {
    document.getElementById("appContent").hidden = false;
    await loadHistory();
  } else {
    document.getElementById("authPrompt").hidden = false;
  }
})();

async function loadHistory() {
  try {
    const res = await fetch(PREDICTIONS_ENDPOINT, { headers: authHeaders() });

    if (res.status === 401) {
      setToken(null);
      redirectToLogin();
      return;
    }
    if (!res.ok) throw new Error(`Couldn't load your history (${res.status}).`);

    const records = await res.json();
    historyLoading.hidden = true;

    recordCount.textContent = records.length === 0
      ? "You haven't checked any listings yet."
      : `You've checked ${records.length} listing${records.length === 1 ? "" : "s"} so far.`;

    if (records.length === 0) {
      historyEmpty.hidden = false;
      return;
    }

    historyList.hidden = false;
    historyList.innerHTML = "";
    records.forEach((r) => historyList.appendChild(buildCard(r)));
  } catch (err) {
    historyLoading.hidden = true;
    historyError.textContent = err.message || "Something went wrong loading your history.";
  }
}

function buildCard(record) {
  const info = CLASS_INFO[record.predicted_room_type] || { label: record.predicted_room_type, emoji: "🏷️", color: "#837C6F" };

  const date = new Date(record.created_at);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const card = document.createElement("div");
  card.className = "history-card";
  card.style.setProperty("--hist-color", info.color);

  card.innerHTML = `
    <span class="history-emoji">${info.emoji}</span>
    <div class="history-main">
      <div class="history-type">${info.label}</div>
      <div class="history-meta">${record.neighbourhood}, ${record.neighbourhood_group} · ${dateStr}</div>
    </div>
    <div class="history-price">$${record.price}/night</div>
  `;
  return card;
}