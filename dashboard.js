const CLASS_COLORS = {
  "Entire home/apt": "#1F3D5C",
  "Private room": "#2F6B45",
  "Shared room": "#A23324",
};

const historyLoading = document.getElementById("historyLoading");
const historyEmpty = document.getElementById("historyEmpty");
const historyError = document.getElementById("historyError");
const historyTable = document.getElementById("historyTable");
const historyBody = document.getElementById("historyBody");
const recordCount = document.getElementById("recordCount");

(async function init() {
  const user = await requireAuth();
  if (!user) return; // requireAuth already redirected to login

  renderNav(user, "dashboard");
  await loadHistory();
})();

async function loadHistory() {
  try {
    const res = await fetch(PREDICTIONS_ENDPOINT, { headers: authHeaders() });

    if (res.status === 401) {
      setToken(null);
      redirectToLogin();
      return;
    }
    if (!res.ok) throw new Error(`Could not load case history (${res.status}).`);

    const records = await res.json();
    historyLoading.hidden = true;

    recordCount.textContent = `${records.length} record${records.length === 1 ? "" : "s"}`;

    if (records.length === 0) {
      historyEmpty.hidden = false;
      return;
    }

    historyTable.hidden = false;
    historyBody.innerHTML = "";
    records.forEach((r) => historyBody.appendChild(buildRow(r)));
  } catch (err) {
    historyLoading.hidden = true;
    historyError.textContent = err.message || "Something went wrong loading your case history.";
  }
}

function buildRow(record) {
  const tr = document.createElement("tr");

  const date = new Date(record.created_at);
  const dateStr = date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  const color = CLASS_COLORS[record.predicted_room_type] || "#6B6355";

  tr.innerHTML = `
    <td class="mono">${dateStr}</td>
    <td>
      <span class="class-pill" style="--pill-color:${color}">
        <span class="class-bullet"></span>${record.predicted_room_type}
      </span>
    </td>
    <td>${record.neighbourhood_group} <span class="muted">/ ${record.neighbourhood}</span></td>
    <td class="mono">$${record.price}</td>
    <td class="mono">${record.minimum_nights}</td>
    <td class="mono">${record.number_of_reviews}</td>
  `;
  return tr;
}