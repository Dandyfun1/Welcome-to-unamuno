// =========================
// Supabase Client Setup
// =========================
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co"; // 🔧 replace with your Supabase URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ"; // 🔧 replace with your anon key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Init] Document ready");

  // Elements
  const adminPanel = document.getElementById("admin-panel");
  const adminToggle = document.getElementById("admin-toggle");
  const adminClose = document.getElementById("admin-close");
  const adminDrag = document.getElementById("admin-drag");
  const loginArea = document.getElementById("login-area");
  const controlsArea = document.getElementById("controls-area");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const saveBtn = document.getElementById("save-changes");
  const newItemBtn = document.getElementById("new-item-btn");
  const itemsGrid = document.getElementById("items-grid");
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  const statusPill = document.getElementById("status-pill");
  const publicPostBtn = document.getElementById("public-post-btn");

  const calendarPanel = document.getElementById("calendar-panel");
  const calendarToggle = document.getElementById("calendar-toggle");
  const calendarClose = document.getElementById("calendar-close");
  const calendarDrag = document.getElementById("calendar-drag");
  const calTitle = document.getElementById("cal-title");
  const calPrev = document.getElementById("cal-prev");
  const calNext = document.getElementById("cal-next");
  const calGrid = document.getElementById("calendar-grid");

  const eventPopup = document.getElementById("event-popup");
  const eventDateTitle = document.getElementById("event-date-title");
  const eventDetails = document.getElementById("event-details");
  const editEventBtn = document.getElementById("edit-event-btn");
  const deleteEventBtn = document.getElementById("delete-event-btn");
  const eventAdminControls = document.getElementById("event-admin-controls");

  // =========================
  // Auth handling
  // =========================
  supabaseClient.auth.getSession().then(({ data }) => {
    loggedIn = !!data.session;
    updateAuthUI();
    loadData();
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    loggedIn = !!session;
    updateAuthUI();
    loadData();
  });

  function updateAuthUI() {
    console.log("[Auth] LoggedIn:", loggedIn);
    loginArea.style.display = loggedIn ? "none" : "block";
    controlsArea.classList.toggle("hidden", !loggedIn);
    statusPill.textContent = loggedIn ? "Admin" : "Public";
  }

  // =========================
  // Admin Panel
  // =========================
  adminToggle.onclick = () => { adminPanel.classList.remove("hidden"); };
  adminClose.onclick = () => { adminPanel.classList.add("hidden"); };

  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value.trim();
    const password = prompt("Enter your Supabase password:");
    if (!email || !password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { console.error("[Login Error]", error); alert("Login failed: " + error.message); return; }
    loggedIn = !!data.session;
    updateAuthUI();
    loadData();
  };

  logoutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    adminPanel.classList.add("hidden");
  };

  // =========================
  // Admin Save Settings
  // =========================
  saveBtn.onclick = async () => {
    const title = document.getElementById("edit-title").value;
    const desc = document.getElementById("edit-sub").value;
    const accent = document.getElementById("edit-accent").value || "#16a34a";
    const logo_url = document.getElementById("edit-logo").value;
    const hero_url = document.getElementById("edit-hero").value;

    console.log("[Save Settings]", { title, desc, accent, logo_url, hero_url });

    const { error } = await supabaseClient.from("site_settings").upsert([{
      id: '00000000-0000-0000-0000-000000000001',
      title, description: desc, accent, logo_url, hero_url
    }]);

    if (error) { console.error("[Save Settings Error]", error); alert("Save failed"); }
    else { showToast("Configuración guardada"); loadData(); }
  };

  // =========================
  // Admin New Post
  // =========================
  newItemBtn.onclick = async () => {
    const title = prompt("Título del post:"); if (!title) return;
    const desc = prompt("Descripción:");
    const { error } = await supabaseClient.from("items").insert([{ title, description: desc }]);
    if (error) { console.error("[New Post Error]", error); alert("Error al crear post"); }
    else { showToast("Nuevo post creado"); loadData(); }
  };

  // =========================
  // Public Posting
  // =========================
  publicPostBtn.onclick = async () => {
    const username = prompt("Tu nombre:"); if (!username) return;
    const title = prompt("Título del post:"); if (!title) return;
    const desc = prompt("Descripción:");
    const { error } = await supabaseClient.from("items").insert([{ title, description: desc, username }]);
    if (error) { console.error("[Public Post Error]", error); alert("No se pudo publicar"); }
    else { showToast("Publicado!"); loadData(); }
  };

  // =========================
  // Search
  // =========================
  searchBtn.onclick = async () => {
    const q = searchInput.value;
    let { data: items } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    renderItems(items || []);
  };

  // =========================
  // Render Items
  // =========================
  function renderItems(items) {
    itemsGrid.innerHTML = "";
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.description || ""}</p>
        <small>${item.username ? "by " + item.username : ""}</small>
        ${loggedIn ? `<button class="danger" data-id="${item.id}">Eliminar</button>` : ""}
      `;
      itemsGrid.appendChild(div);
    });
    if (loggedIn) {
      itemsGrid.querySelectorAll(".danger").forEach(btn => {
        btn.onclick = async e => {
          const id = e.target.getAttribute("data-id");
          if (confirm("Eliminar este post?")) {
            await supabaseClient.from("items").delete().eq("id", id);
            loadData();
          }
        };
      });
    }
  }

  // =========================
  // Calendar
  // =========================
  calendarToggle.onclick = () => { calendarPanel.classList.remove("hidden"); renderCalendar(); };
  calendarClose.onclick = () => { calendarPanel.classList.add("hidden"); };
  calPrev.onclick = () => { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } renderCalendar(); };
  calNext.onclick = () => { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar(); };

  async function renderCalendar() {
    const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    calTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();
    calGrid.innerHTML = "";

    let { data: events } = await supabaseClient.from("calendar_events").select("*");
    const eventDates = events.map(ev => ev.event_date);

    for (let i=0;i<firstDay;i++) {
      calGrid.innerHTML += `<div></div>`;
    }

    for (let d=1; d<=daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const hasEvent = eventDates.includes(dateStr);
      const today = new Date();
      const isToday = d===today.getDate() && currentMonth===today.getMonth() && currentYear===today.getFullYear();
      calGrid.innerHTML += `<div class="day ${isToday?"today":""} ${hasEvent?"has-event":""}" data-date="${dateStr}">${d}</div>`;
    }

    calGrid.querySelectorAll(".day").forEach(day => {
      day.onclick = () => openEvent(day.dataset.date);
    });
  }

  async function openEvent(dateStr) {
    eventPopup.classList.remove("hidden");
    eventDateTitle.textContent = `Evento: ${dateStr}`;
    let { data: ev } = await supabaseClient.from("calendar_events").select("*").eq("event_date", dateStr).single();
    if (ev) {
      eventDetails.textContent = ev.note;
      eventAdminControls.classList.toggle("hidden", !loggedIn);
      editEventBtn.onclick = async () => {
        const note = prompt("Nota:", ev.note || "");
        if (!note) return;
        await supabaseClient.from("calendar_events").upsert([{ event_date: dateStr, note }]);
        renderCalendar(); openEvent(dateStr);
      };
      deleteEventBtn.onclick = async () => {
        await supabaseClient.from("calendar_events").delete().eq("event_date", dateStr);
        renderCalendar(); eventPopup.classList.add("hidden");
      };
    } else {
      eventDetails.textContent = "No hay evento.";
      if (loggedIn) {
        editEventBtn.onclick = async () => {
          const note = prompt("Nota nueva:");
          if (!note) return;
          await supabaseClient.from("calendar_events").upsert([{ event_date: dateStr, note }]);
          renderCalendar(); openEvent(dateStr);
        };
        eventAdminControls.classList.remove("hidden");
      } else {
        eventAdminControls.classList.add("hidden");
      }
    }
  }

  // =========================
  // Load Site Data
  // =========================
  async function loadData() {
    console.log("[Load Data]");
    let { data: settings } = await supabaseClient.from("site_settings").select("*").eq("id", '00000000-0000-0000-0000-000000000001').single();
    if (settings) {
      document.getElementById("site-title").textContent = settings.title;
      document.getElementById("site-sub").textContent = settings.description;
      document.documentElement.style.setProperty("--accent", settings.accent || "#16a34a");
      if (settings.logo_url) {
        const logoEl = document.getElementById("site-logo");
        logoEl.src = settings.logo_url; logoEl.style.display = "block";
      }
    }

    let { data: items } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    renderItems(items || []);
  }

  // =========================
  // Utils
  // =========================
  function showToast(msg) {
    const note = document.createElement("div");
    note.className = "toast";
    note.textContent = msg;
    document.body.appendChild(note);
    setTimeout(()=>note.remove(), 2500);
  }

  // Make draggable
  makeDraggable(adminPanel, adminDrag);
  makeDraggable(calendarPanel, calendarDrag);

  function makeDraggable(panel, header) {
    let dragging = false, offsetX=0, offsetY=0;
    header.addEventListener("mousedown", e => {
      dragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
      document.body.style.userSelect = "none";
    });
    window.addEventListener("mousemove", e => {
      if (dragging) {
        panel.style.left = (e.clientX - offsetX) + "px";
        panel.style.top = (e.clientY - offsetY) + "px";
        panel.style.right = "auto";
      }
    });
    window.addEventListener("mouseup", () => { dragging = false; document.body.style.userSelect = ""; });
  }
});
