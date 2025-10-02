// Supabase setup
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;

document.addEventListener("DOMContentLoaded", () => {
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
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  const itemsGrid = document.getElementById("items-grid");
  const publicPostBtn = document.getElementById("public-post-btn");

  // Calendar
  const calendarPanel = document.getElementById("calendar-panel");
  const calendarHeader = document.getElementById("calendar-header");
  const calendarToggle = document.getElementById("calendar-toggle");
  const calendarClose = document.getElementById("calendar-close");
  const calendarBody = document.getElementById("calendar");

  // Auth session
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

  // Admin panel
  adminToggle.onclick = () => { adminPanel.style.display = "block"; };
  adminClose.onclick = () => { adminPanel.style.display = "none"; };

  // Calendar panel
  calendarToggle.onclick = () => { renderCalendar(new Date()); calendarPanel.style.display = "block"; };
  calendarClose.onclick = () => { calendarPanel.style.display = "none"; };

  // Login
  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value.trim();
    const password = prompt("Introduce la contraseña:");
    if (!email || !password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Error: " + error.message);
    loggedIn = !!data.session;
    updateAuthUI();
    loadData();
  };

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
    const background_url = document.getElementById("edit-bg").value;
    const logo_url = document.getElementById("edit-logo").value;
    await supabaseClient.from("site_settings").upsert([{ id: 1, title, description: desc, accent, background_url, logo_url }]);
    document.documentElement.style.setProperty("--accent", accent);
    loadData();
  };

  // New item (admin)
  newItemBtn.onclick = async () => {
    const title = prompt("Título:"); if (!title) return;
    const desc = prompt("Descripción:");
    const image_url = prompt("URL de imagen (opcional):");
    await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    loadData();
  };

  // Public post
  publicPostBtn.onclick = async () => {
    const title = prompt("Título:"); if (!title) return;
    const desc = prompt("Descripción:");
    const image_url = prompt("URL de imagen (opcional):");
    await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    loadData();
  };

  // Search
  searchBtn.onclick = async () => {
    const q = searchInput.value;
    let { data: items } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    renderItems(items || []);
  };

  async function loadData() {
    let { data: settings } = await supabaseClient.from("site_settings").select("*").eq("id", 1).single();
    if (settings) {
      document.getElementById("site-title").textContent = settings.title;
      document.getElementById("site-desc").textContent = settings.description;
      document.getElementById("edit-title").value = settings.title;
      document.getElementById("edit-desc").value = settings.description;
      document.getElementById("edit-accent").value = settings.accent;
      document.getElementById("edit-bg").value = settings.background_url || "";
      document.getElementById("edit-logo").value = settings.logo_url || "";
      if (settings.background_url) {
        document.body.style.backgroundImage = `url(${settings.background_url})`;
      }
      if (settings.logo_url) {
        const logoEl = document.getElementById("site-logo");
        logoEl.src = settings.logo_url; logoEl.style.display = "block";
      }
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
          if (confirm("¿Eliminar publicación?")) {
            await supabaseClient.from("items").delete().eq("id", id);
            loadData();
          }
        };
      });
    }
  }

  // Render Spanish Calendar
  async function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    calendarBody.innerHTML = "";
    for (let d = 1; d <= end.getDate(); d++) {
      const dayEl = document.createElement("div");
      dayEl.className = "day";
      dayEl.textContent = d;
      const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      // check events
      const { data: events } = await supabaseClient.from("events").select("*").eq("date", dateStr);
      if (events && events.length > 0) dayEl.classList.add("has-event");
      dayEl.onclick = async () => {
        const note = prompt("Nota para " + dateStr);
        if (note) {
          await supabaseClient.from("events").upsert([{ date: dateStr, note }]);
          renderCalendar(date);
        }
      };
      calendarBody.appendChild(dayEl);
    }
  }
});

