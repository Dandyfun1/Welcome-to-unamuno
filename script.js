// Replace with your Supabase credentials
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;

document.addEventListener("DOMContentLoaded", () => {
  const adminPanel = document.getElementById("admin-panel");
  const adminToggle = document.getElementById("admin-toggle");
  const adminClose = document.getElementById("admin-close");
  const loginArea = document.getElementById("login-area");
  const controlsArea = document.getElementById("controls-area");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const statusPill = document.getElementById("status-pill");
  const saveBtn = document.getElementById("save-changes");
  const newItemBtn = document.getElementById("new-item-btn");
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  const itemsGrid = document.getElementById("items-grid");
  const publicPostBtn = document.getElementById("public-post-btn");
  const calendarPanel = document.getElementById("calendar-panel");
  const calendarToggle = document.getElementById("calendar-toggle");
  const calendarClose = document.getElementById("calendar-close");
  const calendarGrid = document.getElementById("calendar-grid");

  // Session check
  supabaseClient.auth.getSession().then(({ data }) => {
    loggedIn = !!data.session;
    updateAuthUI();
    loadSite();
    loadItems();
    loadEvents();
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    loggedIn = !!session;
    updateAuthUI();
    loadSite();
    loadItems();
    loadEvents();
  });

  // Auth UI
  function updateAuthUI() {
    loginArea.style.display = loggedIn ? "none" : "block";
    controlsArea.classList.toggle("hidden", !loggedIn);
    statusPill.textContent = loggedIn ? "Admin" : "Public";
  }

  // Toggle panels
  adminToggle.onclick = () => (adminPanel.style.display = "block");
  adminClose.onclick = () => (adminPanel.style.display = "none");
  calendarToggle.onclick = () => (calendarPanel.style.display = "block");
  calendarClose.onclick = () => (calendarPanel.style.display = "none");

  // Login
  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value.trim();
    const password = prompt("Enter password:");
    if (!email || !password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Login failed: " + error.message);
    loggedIn = !!data.session;
    updateAuthUI();
  };

  // Logout
  logoutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    adminPanel.style.display = "none";
  };

  // Save site settings (admin only)
  saveBtn.onclick = async () => {
    const title = document.getElementById("edit-title").value;
    const desc = document.getElementById("edit-desc").value;
    const accent = document.getElementById("edit-accent").value || "#16a34a";
    const { error } = await supabaseClient.from("site_settings").upsert([
      { id: "00000000-0000-0000-0000-000000000001", title, description: desc, accent }
    ]);
    if (error) alert("Error guardando: " + error.message);
    else {
      document.documentElement.style.setProperty("--accent", accent);
      loadSite();
    }
  };

  // Admin new post
  newItemBtn.onclick = async () => {
    const title = prompt("Post title:");
    if (!title) return;
    const desc = prompt("Post description:");
    const { error } = await supabaseClient.from("items").insert([{ title, description: desc }]);
    if (error) alert("Error creando post: " + error.message);
    loadItems();
  };

  // Public new post
  publicPostBtn.onclick = async () => {
    const title = prompt("Post title:");
    if (!title) return;
    const desc = prompt("Post description:");
    const { error } = await supabaseClient.from("items").insert([{ title, description: desc }]);
    if (error) alert("No se pudo publicar: " + error.message);
    loadItems();
  };

  // Search posts
  searchBtn.onclick = async () => {
    const q = searchInput.value;
    const { data, error } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    if (!error) renderItems(data || []);
  };

  // Load site settings
  async function loadSite() {
    const { data, error } = await supabaseClient.from("site_settings").select("*").eq("id", "00000000-0000-0000-0000-000000000001").single();
    if (!error && data) {
      document.getElementById("site-title").textContent = data.title;
      document.getElementById("site-desc").textContent = data.description;
      document.getElementById("edit-title").value = data.title;
      document.getElementById("edit-desc").value = data.description;
      document.getElementById("edit-accent").value = data.accent;
      document.documentElement.style.setProperty("--accent", data.accent || "#16a34a");
    }
  }

  // Load posts
  async function loadItems() {
    const { data, error } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    if (!error) renderItems(data || []);
    else alert("Error cargando publicaciones: " + error.message);
  }

  function renderItems(items) {
    itemsGrid.innerHTML = "";
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.description || ""}</p>
        ${loggedIn ? `<button class="danger" data-id="${item.id}">Delete</button>` : ""}
      `;
      itemsGrid.appendChild(div);
    });

    if (loggedIn) {
      itemsGrid.querySelectorAll(".danger").forEach(btn => {
        btn.onclick = async e => {
          const id = e.target.getAttribute("data-id");
          if (confirm("Delete this post?")) {
            await supabaseClient.from("items").delete().eq("id", id);
            loadItems();
          }
        };
      });
    }
  }

  // Calendar functions
  async function loadEvents() {
    const { data, error } = await supabaseClient.from("events").select("*");
    if (!error) renderCalendar(data || []);
  }

  function renderCalendar(events) {
    calendarGrid.innerHTML = "";
    const today = new Date();
    const year = today.getFullYear();
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const event = events.find(ev => ev.event_date === dateStr);
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        cell.textContent = day;
        if (event) cell.style.background = "tomato";
        cell.onclick = () => {
          const note = prompt("Add/edit note:", event ? event.note : "");
          if (note !== null) saveEvent(dateStr, note);
        };
        calendarGrid.appendChild(cell);
      }
    }
  }

  async function saveEvent(date, note) {
    const { error } = await supabaseClient.from("events").upsert([{ event_date: date, note }]);
    if (error) alert("Error guardando evento: " + error.message);
    else loadEvents();
  }
});

