// ===========================
// SUPABASE INIT
// ===========================
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co"; // <-- replace
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";              // <-- replace
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===========================
// DOM HELPERS
// ===========================
const $ = (id) => document.querySelector(id);
function escapeHtml(text) {
  return text
    ? text.replace(/[&<>'"]/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[
          c
        ])
      )
    : "";
}
function showPanel(id) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
  $(id).classList.remove("hidden");
}

// ===========================
// AUTH (Admin login)
// ===========================
let currentUser = null;

async function login(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return alert("Login error: " + error.message);
  currentUser = data.user;
  alert("Logged in!");
}
async function logout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  alert("Logged out");
}

// ===========================
// SITE SETTINGS
// ===========================
async function loadSiteSettings() {
  const { data, error } = await supabaseClient
    .from("site_settings")
    .select("*")
    .limit(1)
    .single();
  if (error) return console.error("loadSiteSettings", error);
  if (!data) return;

  $("#site-title").textContent = data.title || "Untitled";
  $("#site-description").textContent = data.description || "";
  document.body.style.setProperty("--accent", data.accent || "#0088ff");

  if (data.logo_url) $("#logo").src = data.logo_url;
  if (data.hero_url) $("#hero").style.backgroundImage = `url(${data.hero_url})`;
}

async function saveSiteSettings(settings) {
  if (!currentUser) return alert("Only admins can save settings");
  const { error } = await supabaseClient.from("site_settings").upsert(settings);
  if (error) return alert("Save failed: " + error.message);
  loadSiteSettings();
}

// ===========================
// ITEMS (Posts)
// ===========================
async function loadItems() {
  const { data, error } = await supabaseClient
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return console.error("loadItems", error);

  const container = $("#items");
  container.innerHTML = "";
  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <p>${escapeHtml(item.content)}</p>
      <small>${item.category || "uncategorized"}</small>
      ${item.pinned ? "<span class='pin'>📌</span>" : ""}
    `;
    container.appendChild(div);
  });
}

async function addItem(content, category) {
  const { error } = await supabaseClient
    .from("items")
    .insert([{ content, category }]);
  if (error) return alert("Create failed: " + error.message);
  loadItems();
}

async function deleteItem(id) {
  if (!currentUser) return alert("Only admins can delete");
  const { error } = await supabaseClient.from("items").delete().eq("id", id);
  if (error) return alert("Delete failed: " + error.message);
  loadItems();
}

async function pinItem(id, pinned) {
  if (!currentUser) return alert("Only admins can pin/unpin");
  const { error } = await supabaseClient
    .from("items")
    .update({ pinned })
    .eq("id", id);
  if (error) return alert("Pin failed: " + error.message);
  loadItems();
}

// ===========================
// CALENDAR EVENTS
// ===========================
let calendarCursor = new Date();
let eventsCache = [];

async function loadEvents() {
  const { data, error } = await supabaseClient
    .from("calendar_events")
    .select("*");
  if (error) return console.error("loadEvents", error);
  eventsCache = data || [];
  renderCalendar(calendarCursor);
}

function renderCalendar(cursor) {
  const month = cursor.getMonth();
  const year = cursor.getFullYear();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const grid = $("#calendar-grid");
  grid.innerHTML = "";

  for (let d = start.getDate(); d <= end.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    const ev = eventsCache.find((e) => e.event_date === dateStr);

    const cell = document.createElement("div");
    cell.className = "day";
    cell.innerHTML = `<span>${d}</span>${
      ev ? `<div class="event">${escapeHtml(ev.title || "")}</div>` : ""
    }`;
    cell.onclick = () => openEventPopup(dateStr, ev);
    grid.appendChild(cell);
  }
}

function openEventPopup(dateStr, ev) {
  const title = prompt(
    `Event for ${dateStr}`,
    ev ? ev.title + " | " + ev.note : ""
  );
  if (title === null) return;

  const [t, n] = title.split("|").map((s) => s.trim());
  saveEvent(dateStr, t, n);
}

async function saveEvent(dateStr, title, note) {
  if (!currentUser) return alert("Only admins can save events");
  const { error } = await supabaseClient
    .from("calendar_events")
    .upsert([{ event_date: dateStr, title, note }], {
      onConflict: "event_date",
    });
  if (error) return alert("Save failed: " + error.message);
  loadEvents();
}

async function deleteEvent(dateStr) {
  if (!currentUser) return alert("Only admins can delete events");
  const { error } = await supabaseClient
    .from("calendar_events")
    .delete()
    .eq("event_date", dateStr);
  if (error) return alert("Delete failed: " + error.message);
  loadEvents();
}

// ===========================
// INIT
// ===========================
document.addEventListener("DOMContentLoaded", () => {
  loadSiteSettings();
  loadItems();
  loadEvents();
});

