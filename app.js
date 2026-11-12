const STORAGE_KEY = "trade-checklist-v1";
const groups = [
  { id:"contextItems", items:["With 4H trend","With macro trend","Mark all 4H levels"] },
  { id:"executionItems", items:["Hit 4H level","Initial 15M reaction","15M change of state","Entry on second 15M reaction close"] },
  { id:"riskItems", items:["Stop at next 4H level","TP at range H/L","Invalidation zone"] }
];
const allItems = groups.flatMap(g => g.items);
const $ = id => document.getElementById(id);
let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.checked) && Array.isArray(saved.history)) return saved;
  } catch (_) {}
  return { checked: allItems.map(() => false), history: [] };
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function completed() { return state.checked.length === allItems.length && state.checked.every(Boolean); }

function renderItems() {
  let offset = 0;
  groups.forEach(group => {
    const root = $(group.id);
    root.innerHTML = "";
    group.items.forEach((label, localIndex) => {
      const index = offset + localIndex;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "item" + (state.checked[index] ? " checked" : "");
      button.setAttribute("aria-pressed", String(state.checked[index]));
      button.innerHTML = `<span class="box" aria-hidden="true">${state.checked[index] ? "✓" : ""}</span><span class="item-label"></span>`;
      button.querySelector(".item-label").textContent = label;
      button.addEventListener("click", () => toggle(index));
      root.appendChild(button);
    });
    offset += group.items.length;
  });
}
function toggle(index) {
  const wasComplete = completed();
  state.checked[index] = !state.checked[index];
  const isComplete = completed();
  if (!wasComplete && isComplete) {
    state.history.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), completedAt: new Date().toISOString() });
  }
  save(); render();
}
function reset() {
  if (!state.checked.some(Boolean)) return;
  state.checked = allItems.map(() => false);
  save(); render();
}
function renderHistory() {
  $("history").innerHTML = "";
  const count = state.history.length;
  $("historyCount").textContent = `${count} ${count === 1 ? "record" : "records"}`;
  $("setupCount").textContent = `${count} ${count === 1 ? "setup" : "setups"} logged`;
  if (!count) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No completed setups yet. Your first fully checked setup will appear here.";
    $("history").appendChild(empty);
    return;
  }
  state.history.forEach((entry, i) => {
    const date = new Date(entry.completedAt);
    const row = document.createElement("div");
    row.className = "record";
    const details = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `Setup ${count - i}`;
    const time = document.createElement("small");
    time.textContent = date.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" }) + " · " + date.toLocaleTimeString(undefined, { hour:"numeric", minute:"2-digit" });
    details.append(title, time);
    const tag = document.createElement("span");
    tag.className = "record-tag";
    tag.textContent = "10 / 10";
    row.append(details, tag);
    $("history").appendChild(row);
  });
}
function render() {
  renderItems();
  const n = state.checked.filter(Boolean).length;
  const done = completed();
  $("percent").textContent = `${n} / ${allItems.length}`;
  $("progressFill").style.width = `${n / allItems.length * 100}%`;
  $("progressCard").classList.toggle("complete", done);
  $("statusText").textContent = done ? "Setup complete — all conditions met" : "Setup in progress";
  $("resetBtn").disabled = n === 0;
  renderHistory();
}
function exportJournal() {
  if (!state.history.length) return;
  const rows = [["Setup","Completed at (local time)"], ...state.history.map((entry, i) => [
    `Setup ${state.history.length - i}`, new Date(entry.completedAt).toLocaleString()
  ])];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "trading-setup-journal.csv"; a.click();
  URL.revokeObjectURL(url);
}
$("resetBtn").addEventListener("click", reset);
$("exportBtn").addEventListener("click", exportJournal);
render();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
