// ------------------------
// UNAMUNO - script.js
// ------------------------
// 1) Replace the two values below with your Supabase project info
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co"; // <-- REPLACE
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";               // <-- REPLACE
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------
// Helpers
// ------------------------
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const formatDate = d => d.toLocaleDateString('es-ES');

// ------------------------
// State
// ------------------------
let loggedIn = false;
let eventsCache = [];

// ------------------------
// DOM refs
// ------------------------
document.addEventListener("DOMContentLoaded", () => {
  const adminPanel = $("#admin-panel");
  const calendarPanel = $("#calendar-panel");
  const adminDrag = $("#admin-drag") || $("#admin-drag");
  const calendarDrag = $("#calendar-drag") || $("#calendar-drag");

  // Buttons & fields
  const adminToggle = $("#admin-toggle");
  const adminClose = $("#admin-close");
  const loginBtn = $("#login-btn");
  const logoutBtn = $("#logout-btn");
  const pwInput = $("#pw-input");
  const controlsArea = $("#controls-area");
  const saveBtn = $("#save-changes");
  const newItemBtn = $("#new-item-btn");
  const publicPostBtn = $("#public-post-btn");
  const searchBtn = $("#search-btn");
  const searchInput = $("#search-input");
  const itemsGrid = $("#items-grid");
  const statusPill = $("#status-pill");

  // Calendar refs
  const calendarToggle = $("#calendar-toggle");
  const calendarClose = $("#calendar-close");
  const calGrid = $("#calendar-grid");
  const calTitle = $("#cal-title");
  const calPrev = $("#cal-prev");
  const calNext = $("#cal-next");

  // Drag handles (admin-panel header and calendar header)
  enableDrag("#admin-panel", "#admin-drag");
  enableDrag("#calendar-panel", "#calendar-drag");

  // Init session and listeners
  initAuth();
  attachUI();

  // ------------------------
  // Functions
  // ------------------------
  function attachUI() {
    // Panels
    adminToggle.onclick = async () => {
      $("#admin-panel").classList.remove("hidden");
      $("#admin-panel").style.display = "block";
      await fetchSettingsIntoAdmin();
    };
    adminClose.onclick = () => { hidePanel("#admin-panel"); };
    calendarToggle.onclick = () => { showCalendarPanel(new Date()); };
    calendarClose.onclick = () => { hidePanel("#calendar-panel"); };

    // Login / logout
    loginBtn.onclick = async () => {
      const email = (pwInput?.value || "").trim();
      if (!email) return alert("Introduce el email del admin.");
      const password = prompt("Introduce la contraseña del admin:");
      if (!password) return;
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) return alert("Login falló: " + error.message);
      loggedIn = !!data.session;
      updateAuthUI();
      await loadAll();
    };
    logoutBtn.onclick = async () => {
      await supabaseClient.auth.signOut();
      loggedIn = false;
      updateAuthUI();
      hidePanel("#admin-panel");
    };

    // Save site settings
    saveBtn?.addEventListener("click", async () => {
      if (!loggedIn) return alert("Necesitas iniciar sesión como admin.");
      const title = $("#edit-title").value || "UNAMUNO";
      const desc = $("#edit-desc").value || "";
      const accent = $("#edit-accent").value || "#16a34a";
      const { error } = await supabaseClient.from("site_settings").upsert([{
        id: '00000000-0000-0000-0000-000000000001',
        title, description: desc, accent
      }]);
      if (error) return alert("Error guardando: " + error.message);
      document.documentElement.style.setProperty("--accent", accent);
      await loadSiteSettings();
      alert("Ajustes guardados");
    });

    // Posting
    publicPostBtn.onclick = async () => {
      const title = prompt("Título de la publicación:");
      if (!title) return;
      const description = prompt("Descripción (opcional):") || null;
      const { error } = await supabaseClient.from("items").insert([{ title, description }]);
      if (error) {
        console.error("Public post error", error);
        return alert("No se pudo publicar: " + error.message);
      }
      await loadItems();
    };

    newItemBtn.onclick = async () => {
      if (!loggedIn) return alert("Debes ser admin.");
      const title = prompt("Título (admin):");
      if (!title) return;
      const description = prompt("Descripción (opcional):") || null;
      const { error } = await supabaseClient.from("items").insert([{ title, description }]);
      if (error) return alert("Error creando post: " + error.message);
      await loadItems();
    };

    // Search
    searchBtn.onclick = async () => {
      const q = (searchInput.value || "").trim();
      if (!q) return loadItems();
      const { data, error } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`).order("created_at", { ascending: false });
      if (error) return console.error("Search error", error);
      renderItems(data || []);
    };

    // Calendar navigation (if present)
    calPrev?.addEventListener("click", () => shiftCalendar(-1));
    calNext?.addEventListener("click", () => shiftCalendar(1));
  }

  // ------------------------
  // Auth & init
  // ------------------------
  async function initAuth() {
    const { data } = await supabaseClient.auth.getSession();
    loggedIn = !!data?.session;
    updateAuthUI();
    await loadAll();
    // Realtime subscriptions
    try {
      supabaseClient.channel('unamuno-public')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => loadItems())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => loadSiteSettings())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => loadEvents())
        .subscribe();
    } catch (e) {
      console.warn("Realtime subscription failed (not critical):", e);
    }
  }

  function updateAuthUI() {
    if (controlsArea) controlsArea.classList.toggle("hidden", !loggedIn);
    if (statusPill) statusPill.textContent = loggedIn ? "Admin" : "Público";
    if ($("#login-area")) $("#login-area").style.display = loggedIn ? "none" : "block";
  }

  // ------------------------
  // Loaders
  // ------------------------
  async function loadAll() {
    await Promise.all([loadSiteSettings(), loadItems(), loadEvents()]);
  }

  async function loadSiteSettings() {
    const { data, error } = await supabaseClient.from("site_settings").select("*").eq("id", '00000000-0000-0000-0000-000000000001').maybeSingle();
    if (error) { console.error("loadSiteSettings", error); return; }
    if (data) {
      $("#site-title").textContent = data.title || "UNAMUNO";
      $("#site-desc").textContent = data.description || "";
      $("#edit-title") && ($("#edit-title").value = data.title || "");
      $("#edit-desc") && ($("#edit-desc").value = data.description || "");
      $("#edit-accent") && ($("#edit-accent").value = data.accent || "#16a34a");
      document.documentElement.style.setProperty("--accent", data.accent || "#16a34a");
    }
  }

  async function fetchSettingsIntoAdmin() {
    await loadSiteSettings();
    // show controls only if loggedIn
    if (loggedIn) {
      $("#controls-area").classList.remove("hidden");
    } else {
      $("#controls-area").classList.add("hidden");
    }
  }

  async function loadItems() {
    const { data, error } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    if (error) { console.error("loadItems", error); return; }
    renderItems(data || []);
  }

  async function loadEvents() {
    const { data, error } = await supabaseClient.from("events").select("*");
    if (error) { console.error("loadEvents", error); return; }
    eventsCache = data || [];
    // If calendar open, re-render
    if (!$("#calendar-panel").classList.contains("hidden")) {
      renderCalendar(currentCalendarDate || new Date());
    }
  }

  // ------------------------
  // Renderers
  // ------------------------
  function renderItems(items = []) {
    itemsGrid.innerHTML = "";
    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "card";
      const title = document.createElement("h3"); title.textContent = item.title;
      const desc = document.createElement("p"); desc.textContent = item.description || "";
      card.appendChild(title); card.appendChild(desc);

      if (loggedIn) {
        const del = document.createElement("button");
        del.className = "danger";
        del.textContent = "Eliminar";
        del.addEventListener("click", async () => {
          if (!confirm("¿Eliminar esta publicación?")) return;
          const { error } = await supabaseClient.from("items").delete().eq("id", item.id);
          if (error) return alert("Error al eliminar: " + error.message);
          await loadItems();
        });
        card.appendChild(del);
      }
      itemsGrid.appendChild(card);
    });

    // update admin items list
    const itemsList = $("#items-list");
    if (itemsList) {
      itemsList.innerHTML = "";
      items.forEach(it => {
        const r = document.createElement("div");
        r.className = "row";
        r.innerHTML = `<div><strong>${it.title}</strong><div style="font-size:12px;color:var(--muted)">${new Date(it.created_at).toLocaleString()}</div></div>`;
        if (loggedIn) {
          const dbtn = document.createElement("button");
          dbtn.className = "ghost small";
          dbtn.textContent = "Eliminar";
          dbtn.onclick = async () => {
            if (!confirm("Eliminar?")) return;
            const { error } = await supabaseClient.from("items").delete().eq("id", it.id);
            if (error) return alert("Error: " + error.message);
            await loadItems();
          };
          r.appendChild(dbtn);
        }
        itemsList.appendChild(r);
      });
    }
  }

  // ------------------------
  // Calendar UI
  // ------------------------
  let currentCalendarDate = new Date();
  function showCalendarPanel(date) {
    $("#calendar-panel").classList.remove("hidden");
    $("#calendar-panel").style.display = "block";
    currentCalendarDate = date || new Date();
    renderCalendar(currentCalendarDate);
  }

  function hidePanel(sel) {
    const el = document.querySelector(sel);
    if (el) { el.classList.add("hidden"); el.style.display = "none"; }
  }

  function shiftCalendar(months) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + months);
    renderCalendar(currentCalendarDate);
  }

  function renderCalendar(date) {
    const grid = calGrid;
    grid.innerHTML = "";
    if (!grid) return;
    const year = date.getFullYear(), month = date.getMonth();
    calTitle && (calTitle.textContent = `${date.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}`);
    // weekday headers
    const weekdays = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
    weekdays.forEach(w => {
      const wEl = document.createElement("div");
      wEl.style.fontWeight = "700";
      wEl.style.textAlign = "center";
      wEl.textContent = w;
      grid.appendChild(wEl);
    });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i=0;i<firstDay;i++) grid.appendChild(document.createElement("div"));
    for (let d=1; d<=daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEl = document.createElement("div");
      dayEl.className = "day";
      dayEl.textContent = d;
      const ev = eventsCache.find(e => e.event_date === dateStr);
      if (ev) { dayEl.classList.add("has-event"); dayEl.classList.add("has-event"); dayEl.classList.add("has-event"); dayEl.style.background = "#ef4444"; dayEl.style.color = "#fff"; }
      dayEl.style.padding = "8px";
      dayEl.style.borderRadius = "6px";
      dayEl.style.textAlign = "center";
      dayEl.onclick = async () => {
        if (!loggedIn) {
          if (ev) return alert(`Nota (${dateStr}):\n\n${ev.note}`);
          return alert("Solo administradores pueden añadir notas.");
        }
        const currentNote = ev ? ev.note : "";
        const note = prompt(`Nota para ${dateStr}:`, currentNote);
        if (note === null) return;
        if (note.trim() === "") {
          // delete if exists
          if (ev) {
            const { error } = await supabaseClient.from("events").delete().eq("event_date", dateStr);
            if (error) return alert("Error eliminando nota: " + error.message);
            await loadEvents();
          }
          return;
        }
        const { error } = await supabaseClient.from("events").upsert([{ event_date: dateStr, note }], { onConflict: 'event_date' });
        if (error) return alert("Error guardando nota: " + error.message);
        await loadEvents();
      };
      grid.appendChild(dayEl);
    }
  }

  // ------------------------
  // Draggable panels
  // ------------------------
  function enableDrag(panelSel, handleSel) {
    const panel = document.querySelector(panelSel);
    const handle = document.querySelector(handleSel);
    if (!panel || !handle) return;
    let dragging = false, offsetX = 0, offsetY = 0;
    handle.style.cursor = "grab";
    handle.addEventListener("mousedown", e => {
      dragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
      document.body.style.userSelect = "none";
      handle.style.cursor = "grabbing";
    });
    window.addEventListener("mousemove", e => {
      if (!dragging) return;
      let left = e.clientX - offsetX;
      let top = e.clientY - offsetY;
      // keep in viewport
      left = Math.max(8, Math.min(left, window.innerWidth - panel.offsetWidth - 8));
      top = Math.max(8, Math.min(top, window.innerHeight - panel.offsetHeight - 8));
      panel.style.left = left + "px";
      panel.style.top = top + "px";
      panel.style.right = "auto";
    });
    window.addEventListener("mouseup", () => {
      dragging = false;
      document.body.style.userSelect = "";
      handle.style.cursor = "grab";
    });
  }

  // ------------------------
  // Initial loads
  // ------------------------
  async function loadItems() { await loadItemsImpl(); }
  async function loadEvents() { await loadEventsImpl(); }
  async function loadSiteSettings() { await loadSiteSettingsImpl(); }

  // Implementations (named to avoid hoisting confusion)
  async function loadItemsImpl() {
    const { data, error } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    if (error) return console.error("loadItemsImpl", error);
    renderItems(data || []);
  }
  async function loadEventsImpl() {
    const { data, error } = await supabaseClient.from("events").select("*");
    if (error) return console.error("loadEventsImpl", error);
    eventsCache = data || [];
    // rerender calendar if open
    if (!$("#calendar-panel").classList.contains("hidden")) renderCalendar(currentCalendarDate || new Date());
  }
  async function loadSiteSettingsImpl() {
    const { data, error } = await supabaseClient.from("site_settings").select("*").eq("id", '00000000-0000-0000-0000-000000000001').maybeSingle();
    if (error) return console.error("loadSiteSettingsImpl", error);
    if (data) {
      $("#site-title").textContent = data.title || "UNAMUNO";
      $("#site-desc").textContent = data.description || "";
      $("#edit-title") && ($("#edit-title").value = data.title || "");
      $("#edit-desc") && ($("#edit-desc").value = data.description || "");
      $("#edit-accent") && ($("#edit-accent").value = data.accent || "#16a34a");
      document.documentElement.style.setProperty("--accent", data.accent || "#16a34a");
    }
  }

  // Ensure functions are callable by name used earlier
  async function loadItems() { return loadItemsImpl(); }
  async function loadEvents() { return loadEventsImpl(); }
  async function loadSiteSettings() { return loadSiteSettingsImpl(); }
  // Kick off
  loadAll();
  async function loadAll() { await Promise.all([loadSiteSettings(), loadItems(), loadEvents()]); }
});

