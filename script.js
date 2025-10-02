// Supabase setup
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;
let currentDate = new Date();

document.addEventListener("DOMContentLoaded", () => {
  // Panels
  const adminPanel = document.getElementById("admin-panel");
  const adminHeader = document.getElementById("admin-header");
  const adminToggle = document.getElementById("admin-toggle");
  const adminClose = document.getElementById("admin-close");

  const calendarPanel = document.getElementById("calendar-panel");
  const calendarToggle = document.getElementById("calendar-toggle");
  const calendarClose = document.getElementById("calendar-close");
  const calTitle = document.getElementById("cal-title");
  const calContainer = document.getElementById("calendar-container");
  const calPrev = document.getElementById("cal-prev");
  const calNext = document.getElementById("cal-next");

  // Admin controls
  const loginArea = document.getElementById("login-area");
  const controlsArea = document.getElementById("controls-area");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const statusPill = document.getElementById("status-pill");
  const saveBtn = document.getElementById("save-changes");
  const newItemBtn = document.getElementById("new-item-btn");
  const itemsGrid = document.getElementById("items-grid");

  // Public posting
  const publicPostBtn = document.getElementById("public-post-btn");

  // Auth
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
    loginArea.style.display = loggedIn ? "none" : "block";
    controlsArea.classList.toggle("hidden", !loggedIn);
    statusPill.textContent = loggedIn ? "Admin" : "Public";
  }

  // Admin panel toggle
  adminToggle.onclick = () => { adminPanel.style.display = "block"; updateAuthUI(); };
  adminClose.onclick = () => { adminPanel.style.display = "none"; };

  // Login
  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value.trim();
    const password = prompt("Enter your Supabase password:");
    if (!email || !password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Login failed: " + error.message);
    loggedIn = !!data.session;
    updateAuthUI();
    loadData();
  };

  // Logout
  logoutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    adminPanel.style.display = "none";
  };

  // Save site settings
  saveBtn.onclick = async () => {
    const title = document.getElementById("edit-title").value;
    const desc = document.getElementById("edit-desc").value;
    const accent = document.getElementById("edit-accent").value || "#16a34a";
    await supabaseClient.from("site_settings").upsert([{
      id: '00000000-0000-0000-0000-000000000001',
      title, description: desc, accent
    }]);
    document.documentElement.style.setProperty("--accent", accent);
    loadData();
  };

  // New item (admin only)
  newItemBtn.onclick = async () => {
    const title = prompt("Post title:"); if (!title) return;
    const desc = prompt("Post description:");
    const image_url = prompt("Image URL (optional):");
    await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
  };

  // Public post
  publicPostBtn.onclick = async () => {
    const title = prompt("Título del post:"); if (!title) return;
    const desc = prompt("Descripción:");
    const image_url = prompt("URL de imagen (opcional):");
    const { error } = await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    if (error) alert("Error al publicar: " + error.message);
  };

  // Drag admin panel
  (function makeDraggable() {
    let dragging = false, offsetX = 0, offsetY = 0;
    adminHeader.addEventListener("mousedown", e => {
      dragging = true;
      offsetX = e.clientX - adminPanel.offsetLeft;
      offsetY = e.clientY - adminPanel.offsetTop;
      document.body.style.userSelect = "none";
    });
    window.addEventListener("mousemove", e => {
      if (dragging) {
        adminPanel.style.left = (e.clientX - offsetX) + "px";
        adminPanel.style.top = (e.clientY - offsetY) + "px";
        adminPanel.style.right = "auto";
      }
    });
    window.addEventListener("mouseup", () => { dragging = false; document.body.style.userSelect = ""; });
  })();

  // Load settings + posts
  async function loadData() {
    let { data: settings } = await supabaseClient.from("site_settings").select("*").eq("id", '00000000-0000-0000-0000-000000000001').single();
    if (settings) {
      document.getElementById("site-title").textContent = settings.title;
      document.getElementById("site-desc").textContent = settings.description;
      document.getElementById("edit-title").value = settings.title;
      document.getElementById("edit-desc").value = settings.description;
      document.getElementById("edit-accent").value = settings.accent;
      document.documentElement.style.setProperty("--accent", settings.accent || "#16a34a");
    }
    let { data: items } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    renderItems(items || []);
  }

  function renderItems(items) {
    itemsGrid.innerHTML = "";
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        ${item.image_url ? `<img src="${item.image_url}" alt="">` : ""}
        <h3>${item.title}</h3>
        <p>${item.description || ""}</p>
        ${loggedIn ? `<button class="danger" data-id="${item.id}">Eliminar</button>` : ""}
      `;
      itemsGrid.appendChild(div);
    });
    if (loggedIn) {
      itemsGrid.querySelectorAll(".danger").forEach(btn => {
        btn.onclick = async e => {
          const id = e.target.getAttribute("data-id");
          if (confirm("¿Eliminar este post?")) {
            await supabaseClient.from("items").delete().eq("id", id);
          }
        };
      });
    }
  }

  // Calendar
  calendarToggle.onclick = () => { 
    calendarPanel.style.display = "block"; 
    renderCalendar(); 
  };
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

    let { data: events } = await supabaseClient
      .from("events")
      .select("*")
      .gte("event_date", `${year}-${month+1}-01`)
      .lte("event_date", `${year}-${month+1}-${daysInMonth}`);
    const eventDays = events ? events.map(e => e.event_date) : [];

    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    const offset = (firstDay === 0 ? 6 : firstDay - 1);
    for (let i = 0; i < offset; i++) {
      grid.appendChild(document.createElement("div"));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = d.toISOString().split("T")[0];
      const cell = document.createElement("div");
      cell.className = "day";
      if (eventDays.includes(dateStr)) cell.classList.add("red");

      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        cell.classList.add("today");
      }

      cell.textContent = day;
      cell.onclick = () => openDayModal(dateStr);
      grid.appendChild(cell);
    }
    calContainer.appendChild(grid);
  }

  function scheduleDailyUpdate() {
    const now = new Date();
    const msUntilMidnight = new Date(
      now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0
    ) - now;
    setTimeout(() => {
      currentDate = new Date();
      renderCalendar();
      scheduleDailyUpdate();
    }, msUntilMidnight);
  }
  scheduleDailyUpdate();

  async function openDayModal(dateStr) {
    const note = prompt(`Nota para ${dateStr}:`);
    if (note) {
      await supabaseClient.from("events").upsert([{ event_date: dateStr, note }]);
      renderCalendar();
    }
  }
});
