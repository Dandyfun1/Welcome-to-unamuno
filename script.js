// ---------------------- CONFIG: replace with your Supabase details ----------------------
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------- STATE ----------------------
let loggedIn = false;
let currentCalendarDate = new Date(); // controls which month the admin calendar shows

// ---------------------- DOM ----------------------
const adminPanel = () => document.getElementById("admin-panel");
const adminToggle = () => document.getElementById("admin-toggle");
const adminClose = () => document.getElementById("admin-close");
const loginBtn = () => document.getElementById("login-btn");
const logoutBtn = () => document.getElementById("logout-btn");
const pwInput = () => document.getElementById("pw-input");
const controlsArea = () => document.getElementById("controls-area");
const statusPill = () => document.getElementById("status-pill");

const itemsGrid = () => document.getElementById("items-grid");
const publicPostBtn = () => document.getElementById("public-post-btn");
const searchInput = () => document.getElementById("search-input");
const searchBtn = () => document.getElementById("search-btn");

const calendarContainer = () => document.getElementById("calendar-container");
const calMonthLabel = () => document.getElementById("cal-month");
const calPrev = () => document.getElementById("cal-prev");
const calNext = () => document.getElementById("cal-next");
const openCalendarBtn = () => document.getElementById("open-calendar");

// Admin tab controls
const tabs = () => Array.from(document.querySelectorAll(".tab"));
const showTab = (name) => {
  document.querySelectorAll(".tab-body").forEach(b => b.classList.add("hidden"));
  const el = document.getElementById(name);
  if (el) el.classList.remove("hidden");
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  const tb = document.querySelector(`.tab[data-tab="${name}"]`);
  if (tb) tb.classList.add("active");
};

// ---------------------- UTIL ----------------------
function alertErr(prefix, e) {
  console.error(prefix, e);
  if (e && e.message) alert(prefix + ": " + e.message);
  else alert(prefix + ": " + JSON.stringify(e));
}
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------------------- INIT ----------------------
document.addEventListener("DOMContentLoaded", () => {
  // wire UI
  document.getElementById("admin-toggle").onclick = () => { adminPanel().classList.remove("hidden"); loadSiteSettings(); loadItems(); renderCalendar(); updateAuthUI(); };
  document.getElementById("admin-close").onclick = () => adminPanel().classList.add("hidden");
  document.getElementById("search-btn").onclick = () => doSearch();
  document.getElementById("public-post-btn").onclick = () => doPublicPost();
  document.getElementById("open-calendar").onclick = () => { adminPanel().classList.remove("hidden"); showTab("calendar"); renderCalendar(); updateAuthUI(); };

  // admin tab clicks
  document.querySelectorAll(".tab").forEach(t => t.onclick = () => showTab(t.dataset.tab));

  // calendar nav
  calPrev().onclick = () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1); renderCalendar(); };
  calNext().onclick = () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1); renderCalendar(); };

  // admin auth wiring
  document.getElementById("login-btn").onclick = adminLogin;
  document.getElementById("logout-btn").onclick = adminLogout;

  // draggable admin header
  makeDraggable(document.getElementById("admin-header"), adminPanel());

  // session check
  supabaseClient.auth.getSession().then(({ data }) => {
    loggedIn = !!data.session;
    updateAuthUI();
    loadSiteSettings();
    loadItems();
    renderMiniCalendar();
    scheduleDailyUpdate();
  });

  // realtime
  try {
    supabaseClient.channel('items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => loadItems())
      .subscribe();
    supabaseClient.channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => { renderCalendar(); renderMiniCalendar(); })
      .subscribe();
    supabaseClient.channel('settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => loadSiteSettings())
      .subscribe();
  } catch(e){ console.warn("Realtime not available", e); }
});

// ---------------------- AUTH ----------------------
async function adminLogin(){
  try {
    const email = pwInput().value?.trim();
    if(!email) return alert("Introduce tu email de admin.");
    const password = prompt("Introduce la contraseña:");
    if(!password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { alert("Login failed:\n" + JSON.stringify(error, null, 2)); console.error(error); return; }
    if(data?.session){
      loggedIn = true;
      updateAuthUI();
      loadItems();
      loadSiteSettings();
      alert("Logged in as admin.");
    } else {
      alert("Login returned no session.");
      console.warn(data);
    }
  } catch(e){ alertErr("Login error", e); }
}

async function adminLogout(){
  try {
    const { error } = await supabaseClient.auth.signOut();
    if(error) alertErr("Logout failed", error);
    loggedIn = false;
    updateAuthUI();
  } catch(e){ alertErr("Logout error", e); }
}

function updateAuthUI(){
  const controls = controlsArea();
  if(!controls) return;
  if(loggedIn){
    controls.classList.remove("hidden");
    statusPill().textContent = "Admin";
    document.getElementById("logout-btn").style.display = "inline-block";
    document.getElementById("login-btn").style.display = "none";
  } else {
    controls.classList.add("hidden");
    statusPill().textContent = "Public";
    document.getElementById("logout-btn").style.display = "none";
    document.getElementById("login-btn").style.display = "inline-block";
  }
}

// ---------------------- SITE SETTINGS ----------------------
async function loadSiteSettings(){
  try {
    const { data, error } = await supabaseClient.from("site_settings").select("*").eq("id",'00000000-0000-0000-0000-000000000001').single();
    if(error && error.code !== "PGRST116") console.warn("settings read error", error);
    if(data){
      document.getElementById("site-title").textContent = data.title || "UNAMUNO";
      document.getElementById("site-desc").textContent = data.description || "";
      document.getElementById("edit-title").value = data.title || "";
      document.getElementById("edit-desc").value = data.description || "";
      document.getElementById("edit-accent").value = data.accent || getComputedStyle(document.documentElement).getPropertyValue("--accent");
      if(data.logo_url){ const logo = document.getElementById("site-logo"); logo.src = data.logo_url; logo.style.display = "block"; }
      document.documentElement.style.setProperty("--accent", data.accent || "#16a34a");
    }
  } catch(e){ console.error("loadSiteSettings", e); }
}

document.getElementById("save-changes").onclick = async () => {
  try {
    const title = document.getElementById("edit-title").value.trim();
    const description = document.getElementById("edit-desc").value.trim();
    const accent = document.getElementById("edit-accent").value.trim() || "#16a34a";
    const logo_url = document.getElementById("edit-logo")?.value?.trim() || null;
    const { error } = await supabaseClient.from("site_settings").upsert([{ id:'00000000-0000-0000-0000-000000000001', title, description, accent, logo_url }]);
    if(error) return alertErr("Save settings failed", error);
    document.documentElement.style.setProperty("--accent", accent);
    loadSiteSettings();
    alert("Apariencia guardada.");
  } catch(e) { alertErr("Save settings", e); }
};

// ---------------------- POSTS ----------------------
async function loadItems(){
  try {
    const { data, error } = await supabaseClient.from("items").select("*").order("created_at",{ascending:false});
    if(error) return alertErr("Load posts failed", error);
    renderItems(data || []);
  } catch(e) { alertErr("loadItems", e); }
}

function renderItems(items){
  const grid = itemsGrid();
  grid.innerHTML = "";
  (items||[]).forEach(it => {
    const card = document.createElement("div");
    card.className = "post-card card";
    card.innerHTML = `<div><strong>${escapeHtml(it.title)}</strong></div><div class="muted">${escapeHtml(it.description || "")}</div>`;
    if(loggedIn){
      const del = document.createElement("button");
      del.className = "ghost";
      del.textContent = "Eliminar";
      del.onclick = async () => {
        if(!confirm("Eliminar post?")) return;
        const { error } = await supabaseClient.from("items").delete().eq("id", it.id);
        if(error) return alertErr("Delete post failed", error);
        loadItems();
      };
      card.appendChild(del);
    }
    grid.appendChild(card);
  });

  // also populate items list inside admin panel
  const itemsList = document.getElementById("items-list");
  if(itemsList){
    itemsList.innerHTML = "";
    (items||[]).forEach(it => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `<div>${escapeHtml(it.title)}<div class="muted">${new Date(it.created_at).toLocaleString()}</div></div>`;
      const del = document.createElement("button");
      del.className = "ghost";
      del.textContent = "Eliminar";
      del.onclick = async () => {
        if(!confirm("Eliminar post?")) return;
        const { error } = await supabaseClient.from("items").delete().eq("id", it.id);
        if(error) return alertErr("Delete post failed", error);
        loadItems();
      };
      row.appendChild(del);
      itemsList.appendChild(row);
    });
  }
}

document.getElementById("new-item-btn")?.addEventListener("click", async () => {
  const title = prompt("Título del post:");
  if(!title) return;
  const description = prompt("Descripción:");
  const { error } = await supabaseClient.from("items").insert([{ title, description }]);
  if(error) return alertErr("Create post failed", error);
  loadItems();
});

document.getElementById("refresh-posts")?.addEventListener("click", () => loadItems());

async function doPublicPost(){
  const title = prompt("Título:");
  if(!title) return;
  const desc = prompt("Descripción:");
  const { error } = await supabaseClient.from("items").insert([{ title, description: desc }]);
  if(error) return alertErr("Public post failed", error);
  loadItems();
}

document.getElementById("search-btn").onclick = async () => doSearch();
async function doSearch(){
  const q = searchInput().value.trim();
  try {
    const { data, error } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`).order("created_at",{ascending:false});
    if(error) return alertErr("Search failed", error);
    renderItems(data || []);
  } catch(e){ alertErr("Search error", e); }
}

// ---------------------- CALENDAR (infinite months, Spanish) ----------------------
async function fetchEventsForRange(startIso, endIso){
  const { data, error } = await supabaseClient.from("events").select("*").gte("event_date", startIso).lte("event_date", endIso);
  if(error) throw error;
  return data || [];
}

function firstDayOffset(year, month){
  // JS getDay: 0 = Sunday; we want Monday=0 for Spanish calendar -> offset
  const d = new Date(year, month, 1).getDay();
  return (d === 0 ? 6 : d - 1);
}

async function renderCalendar(){
  const container = calendarContainer();
  container.innerHTML = "";
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  calMonthLabel().textContent = currentCalendarDate.toLocaleString("es-ES", { month: "long", year: "numeric" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDayOffset(year, month);

  // request events for month
  const startIso = `${year}-${String(month+1).padStart(2,"0")}-01`;
  const endIso = `${year}-${String(month+1).padStart(2,"0")}-${daysInMonth}`;
  let events = [];
  try {
    events = await fetchEventsForRange(startIso, endIso);
  } catch(e){ return alertErr("Fetch events failed", e); }

  const eventMap = {};
  events.forEach(ev => { eventMap[String(ev.event_date).slice(0,10)] = ev; });

  const grid = document.createElement("div");
  grid.className = "calendar-grid";

  // blank offset
  for(let i=0;i<offset;i++) grid.appendChild(document.createElement("div"));

  for(let day=1; day<=daysInMonth; day++){
    const d = new Date(year, month, day);
    const iso = d.toISOString().slice(0,10);
    const cell = document.createElement("div");
    cell.className = "day";
    if(eventMap[iso]) cell.classList.add("red");
    if(d.toDateString() === (new Date()).toDateString()) cell.classList.add("today");
    cell.textContent = day;
    cell.onclick = async () => {
      // click: if admin allow edit; otherwise show note
      const ev = eventMap[iso];
      if(!loggedIn){
        alert(ev ? `Nota (${iso}):\\n\\n${ev.note}` : `No hay nota para ${iso}`);
        return;
      }
      const existing = ev ? ev.note : "";
      const note = prompt(`Nota para ${iso}:`, existing);
      if(note === null) return;
      if(note.trim() === ""){
        if(ev){
          const { error } = await supabaseClient.from("events").delete().eq("id", ev.id);
          if(error) return alertErr("Eliminar nota falló", error);
          renderCalendar(); renderMiniCalendar();
        }
      } else {
        // upsert event
        const payload = ev ? { id: ev.id, event_date: iso, note } : { event_date: iso, note };
        const { error } = await supabaseClient.from("events").upsert([payload]);
        if(error) return alertErr("Guardar nota falló", error);
        renderCalendar(); renderMiniCalendar();
      }
    };
    grid.appendChild(cell);
  }
  container.appendChild(grid);
}

// mini calendar shows current month small
async function renderMiniCalendar(){
  const mini = document.getElementById("mini-calendar");
  if(!mini) return;
  mini.innerHTML = "";
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const offset = firstDayOffset(y, m);
  // fetch events this month
  const startIso = `${y}-${String(m+1).padStart(2,"0")}-01`;
  const endIso = `${y}-${String(m+1).padStart(2,"0")}-${daysInMonth}`;
  let events = [];
  try { events = await fetchEventsForRange(startIso, endIso); } catch(e){ console.warn("mini cal fetch failed", e); }
  const eventSet = new Set((events||[]).map(e => String(e.event_date).slice(0,10)));
  for(let i=0;i<offset;i++){ const s=document.createElement("div"); mini.appendChild(s); }
  for(let d=1; d<=daysInMonth; d++){
    const dd = new Date(y,m,d);
    const iso = dd.toISOString().slice(0,10);
    const el = document.createElement("div");
    el.className = "mday";
    if(eventSet.has(iso)) el.style.background = "#fecaca";
    if(dd.toDateString() === (new Date()).toDateString()) el.style.border = "2px solid var(--accent)";
    el.textContent = d;
    mini.appendChild(el);
  }
}

// schedule daily update at midnight to keep "today" accurate
function scheduleDailyUpdate(){
  const now = new Date();
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0,0,2) - now;
  setTimeout(()=>{ renderCalendar(); renderMiniCalendar(); scheduleDailyUpdate(); }, msUntilMidnight);
}

// ---------------------- DRAGGABLE ----------------------
function makeDraggable(handleEl, panelEl){
  if(!handleEl||!panelEl) return;
  let dragging=false, ox=0, oy=0;
  handleEl.addEventListener("pointerdown", e => {
    dragging=true; ox = e.clientX - panelEl.offsetLeft; oy = e.clientY - panelEl.offsetTop; document.body.style.userSelect="none";
  });
  window.addEventListener("pointermove", e => { if(!dragging) return; panelEl.style.left = (e.clientX - ox) + "px"; panelEl.style.top = (e.clientY - oy) + "px"; panelEl.style.right="auto"; });
  window.addEventListener("pointerup", ()=> { dragging=false; document.body.style.userSelect=""; });
}

// ---------------------- HELPER: schedule + safety ----------------------
// small initial loads
async function loadAllMinimal(){ loadSiteSettings(); loadItems(); renderMiniCalendar(); }
loadAllMinimal();
