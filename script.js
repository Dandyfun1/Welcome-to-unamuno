// ====== Replace these with your Supabase project values ======
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
// ============================================================
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;
let currentCalendarDate = new Date(); // used by calendar

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

document.addEventListener("DOMContentLoaded", () => {
  // DOM refs
  const adminPanel = $("#admin-panel");
  const adminHeader = $("#admin-header");
  const adminToggle = $("#admin-toggle");
  const adminClose = $("#admin-close");
  const loginArea = $("#login-area");
  const controlsArea = $("#controls-area");
  const loginBtn = $("#login-btn");
  const logoutBtn = $("#logout-btn");
  const statusPill = $("#status-pill");
  const saveBtn = $("#save-changes");
  const newItemBtn = $("#new-item-btn");
  const publicPostBtn = $("#public-post-btn");
  const itemsGrid = $("#items-grid");
  const searchBtn = $("#search-btn");
  const searchInput = $("#search-input");

  const calendarPanel = $("#calendar-panel");
  const calendarToggle = $("#calendar-toggle");
  const calendarClose = $("#calendar-close");
  const calendarBody = $("#calendar");

  // --- Session init ---
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) console.warn("session init error", error);
    loggedIn = !!data?.session;
    updateAuthUI();
    loadSiteAndPosts();
  });

  // react to auth changes
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    loggedIn = !!session;
    updateAuthUI();
    loadSiteAndPosts();
  });

  function updateAuthUI() {
    if (loginArea) loginArea.style.display = loggedIn ? "none" : "block";
    if (controlsArea) controlsArea.classList.toggle("hidden", !loggedIn);
    statusPill.textContent = loggedIn ? "Admin" : "Público";
  }

  // --- Panel toggles ---
  adminToggle.onclick = () => { adminPanel.classList.remove("hidden"); adminPanel.style.display = "block"; };
  adminClose.onclick = () => { adminPanel.classList.add("hidden"); adminPanel.style.display = "none"; };

  calendarToggle.onclick = () => { renderCalendar(currentCalendarDate); calendarPanel.classList.remove("hidden"); calendarPanel.style.display = "block"; };
  calendarClose.onclick = () => { calendarPanel.classList.add("hidden"); calendarPanel.style.display = "none"; };

  // Make admin panel draggable (simple)
  makeDraggable(adminHeader, adminPanel);
  makeDraggable($("#calendar-header"), calendarPanel);

  // --- Login flow ---
  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value?.trim();
    if (!email) return alert("Introduce tu email de admin.");
    const pw = prompt("Contraseña para " + email);
    if (!pw) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pw });
    if (error) {
      alert("Login falló: " + error.message);
      console.error(error);
      return;
    }
    loggedIn = !!data.session;
    alert("Login correcto");
    updateAuthUI();
    loadSiteAndPosts();
  };

  logoutBtn.onclick = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) return alert("Logout failed: " + error.message);
    loggedIn = false;
    updateAuthUI();
    adminPanel.classList.add("hidden");
  };

  // --- Save site settings ---
  saveBtn?.addEventListener("click", async () => {
    const title = $("#edit-title").value || "UNAMUNO";
    const description = $("#edit-desc").value || "";
    const accent = $("#edit-accent").value || "#16a34a";
    const logo_url = $("#edit-logo").value || null;
    const background_url = $("#edit-bg").value || null;

    const { error } = await supabaseClient.from("site_settings").upsert([{
      id: 1, title, description, accent, logo_url, background_url
    }]);
    if (error) { alert("Error guardando: " + error.message); return; }
    document.documentElement.style.setProperty("--accent", accent);
    alert("Ajustes guardados");
    loadSiteAndPosts();
  });

  // --- Create post (admin) ---
  newItemBtn?.addEventListener("click", async () => {
    if (!loggedIn) return alert("Solo admin puede crear desde aquí.");
    const title = prompt("Título de la publicación:");
    if (!title) return;
    const description = prompt("Descripción (opcional):") || null;
    const { error } = await supabaseClient.from("items").insert([{ title, description, posted_by: "admin" }]);
    if (error) { alert("Error al crear: " + error.message); return; }
    alert("Publicación creada.");
    loadPosts();
  });

  // --- Create post (public) ---
  publicPostBtn.addEventListener("click", async () => {
    const title = prompt("Título de la publicación (público):");
    if (!title) return;
    const description = prompt("Descripción (opcional):") || null;
    const { error } = await supabaseClient.from("items").insert([{ title, description, posted_by: "public" }]);
    if (error) { alert("No se pudo publicar: " + error.message); console.error(error); return; }
    alert("Tu publicación se publicó.");
    loadPosts();
  });

  // --- Search ---
  searchBtn.addEventListener("click", async () => {
    const q = searchInput.value?.trim() || "";
    const { data, error } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`).order("created_at", { ascending: false });
    if (error) return alert("Error búsqueda: " + error.message);
    renderItems(data || []);
  });

  // --- Load site settings + posts ---
  async function loadSiteAndPosts() {
    // site settings
    const { data: settingData } = await supabaseClient.from("site_settings").select("*").eq("id", 1).single().catch(()=>({ data:null }));
    if (settingData) {
      $("#site-title").textContent = settingData.title || "UNAMUNO";
      $("#site-desc").textContent = settingData.description || "";
      $("#edit-title").value = settingData.title || "";
      $("#edit-desc").value = settingData.description || "";
      $("#edit-accent").value = settingData.accent || "#16a34a";
      $("#edit-logo").value = settingData.logo_url || "";
      $("#edit-bg").value = settingData.background_url || "";
      if (settingData.background_url) {
        document.body.style.backgroundImage = `url(${settingData.background_url})`;
        document.body.style.backgroundSize = "cover";
      }
      if (settingData.logo_url) {
        const logo = $("#site-logo");
        logo.src = settingData.logo_url;
        logo.style.display = "inline-block";
      }
      document.documentElement.style.setProperty("--accent", settingData.accent || "#16a34a");
    }
    loadPosts();
  }

  async function loadPosts() {
    const { data, error } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    if (error) { console.error("load posts err", error); return; }
    renderItems(data || []);
  }

  function renderItems(items) {
    itemsGrid.innerHTML = "";
    (items || []).forEach(it => {
      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = `
        ${it.image_url ? `<img src="${it.image_url}" alt="">` : ""}
        <h3>${escapeHtml(it.title)}</h3>
        <p>${escapeHtml(it.description || "")}</p>
        <div style="font-size:12px;color:var(--muted);margin-top:8px">Publicado por: ${escapeHtml(it.posted_by || "public")}</div>
      `;
      if (loggedIn) {
        const d = document.createElement("button");
        d.className = "danger";
        d.textContent = "Eliminar";
        d.style.marginTop = "8px";
        d.onclick = async () => {
          if (!confirm("¿Eliminar esta publicación?")) return;
          const { error } = await supabaseClient.from("items").delete().eq("id", it.id);
          if (error) return alert("Error al eliminar: " + error.message);
          loadPosts();
        };
        el.appendChild(d);
      }
      itemsGrid.appendChild(el);
    });

    // admin items list in panel (if present)
    const itemsList = $("#items-list");
    if (itemsList) {
      itemsList.innerHTML = "";
      (items || []).forEach(it => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.padding = "8px 0";
        row.innerHTML = `<div><strong>${escapeHtml(it.title)}</strong><div style="font-size:12px;color:var(--muted)">${new Date(it.created_at).toLocaleString()}</div></div>`;
        const del = document.createElement("button");
        del.className = "ghost";
        del.textContent = "Eliminar";
        del.onclick = async () => {
          if (!confirm("Eliminar?")) return;
          const { error } = await supabaseClient.from("items").delete().eq("id", it.id);
          if (error) return alert("Delete failed: " + error.message);
          loadPosts();
        };
        row.appendChild(del);
        itemsList.appendChild(row);
      });
    }
  }

  // --- Calendar rendering (Spanish, highlights days with events) ---
  async function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    calendarBody.innerHTML = "";
    const daysInMonth = new Date(year, month+1, 0).getDate();

    // fetch events for month range
    const startIso = `${year}-${String(month+1).padStart(2,"0")}-01`;
    const endIso = `${year}-${String(month+1).padStart(2,"0")}-${String(daysInMonth).padStart(2,"0")}`;
    const { data: events } = await supabaseClient.from("events").select("*").gte("date", startIso).lte("date", endIso).order("date", { ascending: true });
    const map = (events || []).reduce((acc, e) => { acc[e.date] = e; return acc; }, {});

    for (let d=1; d<=daysInMonth; d++) {
      const iso = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const cell = document.createElement("div");
      cell.className = "day";
      cell.textContent = d;
      if (map[iso]) {
        cell.classList.add("has-event");
        cell.title = map[iso].note || "";
      }
      cell.onclick = async () => {
        if (!loggedIn) {
          // if not admin, show the note if exists
          if (map[iso]) return alert("Nota: " + (map[iso].note || ""));
          return alert("Solo admin puede editar notas.");
        }
        // admin editing
        const note = prompt("Nota para " + iso, map[iso]?.note || "");
        if (note === null) return; // cancelled
        if (note.trim() === "") {
          // delete if exists
          if (map[iso]) {
            const { error } = await supabaseClient.from("events").delete().eq("date", iso);
            if (error) return alert("Error eliminando nota: " + error.message);
            renderCalendar(date);
            return;
          } else {
            return; // nothing to delete
          }
        } else {
          const { error } = await supabaseClient.from("events").upsert([{ date: iso, note }]);
          if (error) return alert("Error guardando nota: " + error.message);
          renderCalendar(date);
        }
      };
      calendarBody.appendChild(cell);
    }
  }

  // initial calendar render when opening
  // wire quick controls
  // simple month navigation via calendar panel header drag not added to keep minimal
  // render when opening

  // make calendar panel draggable too
  makeDraggable($("#calendar-header"), calendarPanel);

  // initial load of calendar mini (not visible until opened)
  // but keep currentCalendarDate synced
  // (user opens calendar with button)

  // --- Realtime (optional) subscribe to updates for items and events ---
  try {
    supabaseClient.channel("items-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => loadPosts())
      .subscribe();

    supabaseClient.channel("events-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => renderCalendar(currentCalendarDate))
      .subscribe();
  } catch (e) {
    // realtime may fail on older projects / free plan — it's safe to ignore
    console.warn("Realtime subscription skipped or failed:", e);
  }

  // utility functions
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function makeDraggable(handle, panel) {
    if (!handle || !panel) return;
    let dragging = false, ox = 0, oy = 0;
    handle.addEventListener("pointerdown", (e) => {
      dragging = true;
      ox = e.clientX - panel.offsetLeft;
      oy = e.clientY - panel.offsetTop;
      document.body.style.userSelect = "none";
    });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      let x = e.clientX - ox;
      let y = e.clientY - oy;
      x = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, x));
      y = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, y));
      panel.style.left = x + "px";
      panel.style.top = y + "px";
      panel.style.right = "auto";
      panel.style.position = "fixed";
    });
    window.addEventListener("pointerup", () => { dragging = false; document.body.style.userSelect = ""; });
  }

}); // DOMContentLoaded end

