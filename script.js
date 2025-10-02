// ------------------------
// UNAMUNO main script.js
// ------------------------
// Replace these with your Supabase details:
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co"; // <-- REPLACE
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";               // <-- REPLACE
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simple selectors
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

let loggedIn = false;
let eventsCache = [];
let currentCalendarDate = new Date();

// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {
  // DOM refs
  const adminPanel = $("#admin-panel");
  const calendarPanel = $("#calendar-panel");

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

  const calendarToggle = $("#calendar-toggle");
  const calendarClose = $("#calendar-close");
  const calGrid = $("#calendar-grid");
  const calTitle = $("#cal-title");
  const calPrev = $("#cal-prev");
  const calNext = $("#cal-next");

  // Drag handles
  enableDrag("#admin-panel", "#admin-drag");
  enableDrag("#calendar-panel", "#calendar-drag");

  // Auth init + realtime subscribe
  initAuth();

  // UI bindings
  adminToggle.onclick = async () => {
    showPanel("#admin-panel");
    await fetchSettingsIntoAdmin();
  };
  adminClose.onclick = () => hidePanel("#admin-panel");

  calendarToggle.onclick = () => { showPanel("#calendar-panel"); renderCalendar(currentCalendarDate); };
  calendarClose.onclick = () => hidePanel("#calendar-panel");

  loginBtn.onclick = async () => {
    const email = (pwInput?.value || "").trim();
    if (!email) return alert("Introduce el email de admin");
    const password = prompt("Introduce la contraseña:");
    if (!password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Login failed: " + error.message);
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

  saveBtn?.addEventListener("click", async () => {
    if (!loggedIn) return alert("Necesitas estar autenticado para guardar.");
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
    alert("Guardado ✅");
  });

  newItemBtn.onclick = async () => {
    if (!loggedIn) return alert("Debes ser admin para usar este botón");
    const title = prompt("Título del post:");
    if (!title) return;
    const description = prompt("Descripción (opcional):") || null;
    const { error } = await supabaseClient.from("items").insert([{ title, description }]);
    if (error) return alert("Error creando post: " + error.message);
    await loadItems();
  };

  publicPostBtn.onclick = async () => {
    const title = prompt("Título de la publicación:");
    if (!title) return;
    const description = prompt("Descripción (opcional):") || null;
    const { error } = await supabaseClient.from("items").insert([{ title, description }]);
    if (error) return alert("No se pudo publicar: " + error.message);
    await loadItems();
  };

  searchBtn.onclick = async () => {
    const q = (searchInput.value || "").trim();
    if (!q) return loadItems();
    const { data, error } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`).order("created_at", { ascending: false });
    if (error) return alert("Search error: " + error.message);
    renderItems(data || []);
  };

  // calendar nav
  calPrev?.addEventListener("click", () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1); renderCalendar(currentCalendarDate); });
  calNext?.addEventListener("click", () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1); renderCalendar(currentCalendarDate); });

  // --- helper UI functions
  function showPanel(sel) { document.querySelector(sel).classList.remove("hidden"); document.querySelector(sel).style.display = "block"; }
  function hidePanel(sel) { const el = document.querySelector(sel); if (!el) return; el.classList.add("hidden"); el.style.display = "none"; }

  // ------------------------
  // Auth + Init
  // ------------------------
  async function initAuth() {
    try {
      const { data } = await supabaseClient.auth.getSession();
      loggedIn = !!data.session;
      updateAuthUI();
      await loadAll();
    } catch (e) {
      console.error("initAuth error", e);
    }

    // Realtime
    try {
      supabaseClient.channel('unamuno-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => loadItems())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => loadSiteSettings())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => loadEvents())
        .subscribe();
    } catch (e) {
      console.warn("Realtime subscribe failed (non-fatal)", e);
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
  async function loadAll() { await Promise.all([loadSiteSettings(), loadItems(), loadEvents()]); }

  async function loadSiteSettings() {
    const { data, error } = await supabaseClient.from("site_settings").select("*").eq("id", '00000000-0000-0000-0000-000000000001').maybeSingle();
    if (error) { console.error("site_settings load error", error); return; }
    if (data) {
      $("#site-title").textContent = data.title || "UNAMUNO";
      $("#site-desc").textContent = data.description || "";
      $("#edit-title") && ($("#edit-title").value = data.title || "");
      $("#edit-desc") && ($("#edit-desc").value = data.description || "");
      $("#edit-accent") && ($("#edit-accent").value = data.accent || "#16a34a");
      document.documentElement.style.setProperty("--accent", data.accent || "#16a34a");
    }
  }

  async function loadItems() {
    const { data, error } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    if (error) {
      // If permission denied, recommend SQL fix
      if (error.code === '42501' || (error.message && error.message.toLowerCase().includes('permission'))) {
        alert("Error cargando publicaciones: permiso denegado. Ejecuta el SQL setup o verifica las policies en Supabase.");
      }
      console.error("loadItems error", error);
      return;
    }
    renderItems(data || []);
  }

  async function loadEvents() {
    const { data, error } = await supabaseClient.from("events").select("*");
    if (error) {
      console.error("loadEvents error", error);
      return;
    }
    eventsCache = data || [];
    if (!$("#calendar-panel").classList.contains("hidden")) renderCalendar(currentCalendarDate);
  }

  // ------------------------
  // Renderers
  // ------------------------
  function renderItems(items = []) {
    itemsGrid.innerHTML = "";
    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "card";
      const h = document.createElement("h3"); h.textContent = item.title;
      const p = document.createElement("p"); p.textContent = item.description || "";
      card.appendChild(h); card.appendChild(p);
      if (loggedIn) {
        const del = document.createElement("button");
        del.className = "danger";
        del.textContent = "Eliminar";
        del.onclick = async () => {
          if (!confirm("¿Eliminar esta publicación?")) return;
          const { error } = await supabaseClient.from("items").delete().eq("id", item.id);
          if (error) return alert("Error al eliminar: " + error.message);
          await loadItems();
        };
        card.appendChild(del);
      }
      itemsGrid.appendChild(card);
    });

    // update admin items list if present
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
  // Calendar
  // ------------------------
  function renderCalendar(date) {
    const grid = $("#calendar-grid");
    if (!grid) return;
    grid.innerHTML = "";
    calTitle && (calTitle.textContent = `${date.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}`);
    const year = date.getFullYear(), month = date.getMonth();
    // weekday headers
    ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].forEach(w => {
      const el = document.createElement("div"); el.textContent = w; el.style.fontWeight = "700"; el.style.textAlign = "center";
      grid.appendChild(el);
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
      if (ev) { dayEl.classList.add("has-event"); dayEl.style.background = "#ef4444"; dayEl.style.color = "#fff"; }
      dayEl.onclick = async () => {
        if (!loggedIn) {
          if (ev) return alert(`Nota (${dateStr}):\n\n${ev.note}`);
          return alert("Solo administradores pueden añadir notas.");
        }
        const note = prompt(`Nota para ${dateStr}:`, ev ? ev.note : "");
        if (note === null) return;
        if (note.trim() === "") {
          // delete existing
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
  // Dragging util
  // ------------------------
  function enableDrag(panelSel, handleSel) {
    const panel = document.querySelector(panelSel);
    const handle = document.querySelector(handleSel);
    if (!panel || !handle) return;
    let dragging=false, offsetX=0, offsetY=0;
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
});

