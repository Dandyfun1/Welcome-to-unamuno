// ------------------ Replace these with your actual Supabase values ------------------
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co"; // <-- replace if different
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";            // <-- must be anon public key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------ App state ------------------
let loggedIn = false;
let currentDate = new Date();
let selectedDateISO = null;

// ------------------ Utility ------------------
function logError(prefix, err) {
  console.error(prefix, err);
  if (err && err.message) alert(prefix + ": " + err.message);
  else if (err) alert(prefix + ": " + JSON.stringify(err));
}

function safeText(s){ return s ? String(s) : ""; }

// ------------------ DOM Ready ------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const adminPanel = document.getElementById("admin-panel");
  const adminHeader = document.getElementById("admin-header");
  const adminToggle = document.getElementById("admin-toggle");
  const adminClose = document.getElementById("admin-close");

  const loginArea = document.getElementById("login-area");
  const controlsArea = document.getElementById("controls-area");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const statusPill = document.getElementById("status-pill");
  const saveBtn = document.getElementById("save-changes");
  const newItemBtn = document.getElementById("new-item-btn");
  const itemsGrid = document.getElementById("items-grid");

  const publicPostBtn = document.getElementById("public-post-btn");

  // Calendar
  const calendarPanel = document.getElementById("calendar-panel");
  const calendarToggle = document.getElementById("calendar-toggle");
  const calendarClose = document.getElementById("calendar-close");
  const calTitle = document.getElementById("cal-title");
  const calContainer = document.getElementById("calendar-container");
  const calPrev = document.getElementById("cal-prev");
  const calNext = document.getElementById("cal-next");

  // Auth init
  try {
    const { data } = await supabaseClient.auth.getSession();
    loggedIn = !!data.session;
  } catch (err) {
    logError("auth.getSession failed", err);
  }
  updateAuthUI();
  await loadAll();

  // Listen for auth changes
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    loggedIn = !!session;
    updateAuthUI();
    loadAll().catch(e => console.error("loadAll after auth change failed:", e));
  });

  function updateAuthUI(){
    loginArea.style.display = loggedIn ? "none" : "block";
    if (controlsArea) controlsArea.classList.toggle("hidden", !loggedIn);
    if (statusPill) statusPill.textContent = loggedIn ? "Admin" : "Public";
  }

  // Admin panel open/close
  adminToggle.onclick = () => { adminPanel.style.display = "block"; updateAuthUI(); };
  adminClose.onclick = () => { adminPanel.style.display = "none"; };

  // Login
  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value?.trim();
    const password = prompt("Enter your Supabase password:");
    if (!email || !password) return alert("Email and password required");
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      loggedIn = !!data.session;
      updateAuthUI();
      await loadAll();
      alert("Logged in");
    } catch (err) {
      logError("Login failed", err);
    }
  };

  // Logout
  logoutBtn.onclick = async () => {
    try {
      await supabaseClient.auth.signOut();
      loggedIn = false;
      updateAuthUI();
      adminPanel.style.display = "none";
      await loadAll();
    } catch (err) {
      logError("Logout failed", err);
    }
  };

  // Save settings
  saveBtn.onclick = async () => {
    try {
      const title = safeText(document.getElementById("edit-title").value);
      const description = safeText(document.getElementById("edit-desc").value);
      const accent = safeText(document.getElementById("edit-accent").value) || "#16a34a";
      const { error } = await supabaseClient.from("site_settings").upsert([{
        id: '00000000-0000-0000-0000-000000000001',
        title, description, accent
      }]);
      if (error) throw error;
      document.documentElement.style.setProperty("--accent", accent);
      alert("Settings saved");
      await loadAll();
    } catch (err) {
      logError("Save settings failed", err);
    }
  };

  // New item (admin)
  newItemBtn.onclick = async () => {
    try {
      const title = prompt("Post title:");
      if (!title) return;
      const description = prompt("Post description:");
      const image_url = prompt("Image URL (optional):");
      const { data, error } = await supabaseClient.from("items").insert([{ title, description, image_url }]);
      if (error) throw error;
      alert("Post created (admin)");
      await loadAll();
    } catch (err) { logError("New item failed", err); }
  };

  // Public post
  publicPostBtn.onclick = async () => {
    try {
      const title = prompt("Título del post:");
      if (!title) return;
      const description = prompt("Descripción:");
      const image_url = prompt("URL de imagen (opcional):");
      const { data, error } = await supabaseClient.from("items").insert([{ title, description, image_url }]);
      if (error) throw error;
      alert("Post publicado");
      await loadAll();
    } catch (err) {
      logError("Public post failed", err);
    }
  };

  // Drag admin panel
  (function makeDraggable() {
    let dragging = false, offsetX = 0, offsetY = 0;
    adminHeader?.addEventListener("mousedown", e => {
      dragging = true;
      offsetX = e.clientX - adminPanel.offsetLeft;
      offsetY = e.clientY - adminPanel.offsetTop;
      document.body.style.userSelect = "none";
    });
    window.addEventListener("mousemove", e => {
      if (!dragging) return;
      adminPanel.style.left = (e.clientX - offsetX) + "px";
      adminPanel.style.top = (e.clientY - offsetY) + "px";
      adminPanel.style.right = "auto";
    });
    window.addEventListener("mouseup", () => { dragging = false; document.body.style.userSelect = ""; });
  })();

  // ========== Load functions ==========
  async function loadSiteSettings() {
    try {
      const { data, error } = await supabaseClient.from("site_settings").select("*").eq("id", '00000000-0000-0000-0000-000000000001').single();
      if (error && error.code !== 'PGRST116') { // PGRST116 sometimes indicates no rows in single() - ignore if empty
        console.warn("site_settings select error:", error);
      }
      if (data) {
        document.getElementById("site-title").textContent = data.title;
        document.getElementById("site-desc").textContent = data.description || "";
        document.getElementById("edit-title").value = data.title || "";
        document.getElementById("edit-desc").value = data.description || "";
        document.getElementById("edit-accent").value = data.accent || "#16a34a";
        document.documentElement.style.setProperty("--accent", data.accent || "#16a34a");
      }
    } catch (err) {
      console.error("loadSiteSettings threw:", err);
    }
  }

  async function loadItems() {
    try {
      const { data, error } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      renderItems(data || []);
    } catch (err) {
      logError("loadItems failed", err);
    }
  }

  function renderItems(items) {
    itemsGrid.innerHTML = "";
    (items || []).forEach(item => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="">` : ""}
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description || "")}</p>
        ${loggedIn ? `<button class="danger" data-id="${item.id}">Eliminar</button>` : ""}
      `;
      itemsGrid.appendChild(div);
    });

    if (loggedIn) {
      itemsGrid.querySelectorAll(".danger").forEach(btn => {
        btn.onclick = async (e) => {
          const id = e.target.getAttribute("data-id");
          if (!id) return;
          if (!confirm("¿Eliminar este post?")) return;
          const { error } = await supabaseClient.from("items").delete().eq("id", id);
          if (error) return logError("Delete failed", error);
          await loadItems();
        };
      });
    }
  }

  // Escape
  function escapeHtml(unsafe) {
    return (unsafe || "").toString().replace(/[&<"'>]/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); });
  }

  // ========== Calendar ==========

  calendarToggle.onclick = () => { calendarPanel.style.display = "block"; renderCalendar(); };
  calendarClose.onclick = () => { calendarPanel.style.display = "none"; };
  calPrev.onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
  calNext.onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };

  async function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    calTitle.textContent = currentDate.toLocaleString("es-ES", { month: "long", year: "numeric" });
    calContainer.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    try {
      // get events for month
      const start = `${year}-${String(month + 1).padStart(2,'0')}-01`;
      const end = `${year}-${String(month + 1).padStart(2,'0')}-${daysInMonth}`;
      const { data: events, error } = await supabaseClient.from("events").select("*").gte("event_date", start).lte("event_date", end);
      if (error) throw error;

      const eventDays = (events || []).map(e => (typeof e.event_date === "string" ? e.event_date : e.event_date.toISOString().slice(0,10)));

      const grid = document.createElement("div");
      grid.className = "calendar-grid";

      const offset = (firstDay === 0 ? 6 : firstDay - 1); // start Monday for es locale
      for (let i = 0; i < offset; i++) grid.appendChild(document.createElement("div"));

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const iso = date.toISOString().slice(0,10);
        const dayEl = document.createElement("div");
        dayEl.className = "day";
        if (eventDays.includes(iso)) dayEl.classList.add("red");
        if (date.toDateString() === (new Date()).toDateString()) dayEl.classList.add("today");
        dayEl.textContent = d;
        dayEl.onclick = async () => {
          // open prompt (admin-only save). Public can view only.
          if (!loggedIn) {
            // view-only: fetch and alert
            const ev = (events || []).find(e => (typeof e.event_date === "string" ? e.event_date : e.event_date.toISOString().slice(0,10)) === iso);
            alert(ev ? `Nota (${iso}):\n\n${ev.note}` : `No hay nota para ${iso}`);
            return;
          }
          // admin: prompt to add/update/delete
          const existing = (events || []).find(e => (typeof e.event_date === "string" ? e.event_date : e.event_date.toISOString().slice(0,10)) === iso);
          const currentNote = existing ? existing.note : "";
          const note = prompt(`Nota para ${iso}:`, currentNote);
          if (note === null) return; // cancel
          if (note.trim() === "") {
            if (existing) {
              const { error } = await supabaseClient.from("events").delete().eq("id", existing.id);
              if (error) return logError("Eliminar nota falló", error);
              alert("Nota eliminada");
            }
          } else {
            // upsert
            const payload = existing ? { id: existing.id, event_date: iso, note } : { event_date: iso, note };
            const { error } = await supabaseClient.from("events").upsert([payload]);
            if (error) return logError("Guardar nota falló", error);
            alert("Nota guardada");
          }
          await renderCalendar();
        };
        grid.appendChild(dayEl);
      }
      calContainer.appendChild(grid);
    } catch (err) {
      logError("renderCalendar failed", err);
    }
  }

  function scheduleDailyUpdate() {
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) - now;
    setTimeout(() => {
      currentDate = new Date();
      renderCalendar();
      scheduleDailyUpdate();
    }, msUntilMidnight + 1000);
  }
  scheduleDailyUpdate();

  // ========== loadAll ==========
  async function loadAll() {
    await loadSiteSettings();
    await loadItems();
    await renderCalendar();
  }

  // Realtime (if available)
  try {
    supabaseClient.channel('items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => loadItems())
      .subscribe();

    supabaseClient.channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => renderCalendar())
      .subscribe();

    supabaseClient.channel('settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => loadSiteSettings())
      .subscribe();
  } catch (err) {
    console.warn("Realtime subscription setup failed or not available:", err);
  }
});

