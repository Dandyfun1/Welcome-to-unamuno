// 🔧 Replace with your Supabase project details
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
  const publicPostBtn = document.getElementById("public-post-btn");
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  const itemsGrid = document.getElementById("items-grid");
  const calendarPanel = document.getElementById("calendar-panel");
  const calendarToggle = document.getElementById("calendar-toggle");
  const calendarClose = document.getElementById("calendar-close");
  const calendarBody = document.getElementById("calendar-body");

  // Init session
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

  adminToggle.onclick = () => { adminPanel.style.display = "block"; updateAuthUI(); };
  adminClose.onclick = () => { adminPanel.style.display = "none"; };

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

  logoutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    adminPanel.style.display = "none";
  };

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

  newItemBtn.onclick = async () => {
    const title = prompt("Post title:"); if (!title) return;
    const desc = prompt("Post description:");
    await supabaseClient.from("items").insert([{ title, description: desc }]);
    loadData();
  };

  publicPostBtn.onclick = async () => {
    const title = prompt("Post title:"); if (!title) return;
    const desc = prompt("Post description:");
    const { error } = await supabaseClient.from("items").insert([{ title, description: desc }]);
    if (error) alert("Failed to post: " + error.message);
    loadData();
  };

  searchBtn.onclick = async () => {
    const q = searchInput.value;
    let { data: items } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    renderItems(items || []);
  };

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
    loadCalendar();
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
            loadData();
          }
        };
      });
    }
  }

  // Calendar
  calendarToggle.onclick = () => { calendarPanel.style.display = "block"; renderCalendar(new Date()); };
  calendarClose.onclick = () => { calendarPanel.style.display = "none"; };

  async function loadCalendar() {
    const { data: events } = await supabaseClient.from("events").select("*");
    window._events = events || [];
  }

  function renderCalendar(currentDate) {
    calendarBody.innerHTML = "";
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(7,1fr)";
    const weekdays = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
    weekdays.forEach(d => { let el=document.createElement("div"); el.textContent=d; el.style.fontWeight="bold"; grid.appendChild(el); });
    for (let i=0;i<firstDay;i++){ grid.appendChild(document.createElement("div")); }
    for (let d=1; d<=daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const dayEl = document.createElement("div");
      dayEl.textContent = d;
      dayEl.style.padding="6px";
      dayEl.style.border="1px solid #e5e7eb";
      if (window._events?.some(ev => ev.event_date === dateStr)) {
        dayEl.style.background = "#fecaca";
      }
      dayEl.onclick = async () => {
        const note = prompt("Nota para " + dateStr);
        if (note && loggedIn) {
          await supabaseClient.from("events").upsert([{ event_date: dateStr, note }]);
          loadData();
        }
      };
      grid.appendChild(dayEl);
    }
    calendarBody.appendChild(grid);
  }

  // Realtime
  supabaseClient.channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => loadData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => loadData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => loadData())
    .subscribe();
});
```
