// 🔧 Replace with your Supabase values
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;

// Fetch site settings + items
async function loadData() {
  // Site settings
  let { data: settings } = await supabaseClient
    .from("site_settings")
    .select("*")
    .limit(1);

  if (settings && settings.length > 0) {
    const site = settings[0];
    document.getElementById("site-title").textContent = site.title;
    document.getElementById("site-desc").textContent = site.description;
    document.documentElement.style.setProperty("--accent", site.accent || "#4f46e5");

    document.getElementById("edit-title").value = site.title;
    document.getElementById("edit-desc").value = site.description;
    document.getElementById("edit-accent").value = site.accent;
  }

  // Items
  let { data: items } = await supabaseClient
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  renderItems(items || []);
}

// Render items
function renderItems(items) {
  const grid = document.getElementById("items-grid");
  grid.innerHTML = "";
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>${item.title}</h3><p>${item.description}</p>`;
    grid.appendChild(card);
  });
}

// Search
document.getElementById("search-btn").onclick = async () => {
  const q = document.getElementById("search-input").value;
  let { data: items } = await supabaseClient
    .from("items")
    .select("*")
    .ilike("title", `%${q}%`);
  renderItems(items || []);
};

// Admin toggle
let showingLogin = false;
document.getElementById("admin-toggle").onclick = () => {
  showingLogin = !showingLogin;
  document.getElementById("admin-panel").classList.toggle("hidden", !showingLogin && !loggedIn);
};

// Admin toggle
document.getElementById("admin-toggle").onclick = () => {
  if (!loggedIn) {
    // show login panel
    document.getElementById("admin-panel").classList.remove("hidden");
    document.getElementById("login-area").classList.remove("hidden");
    document.getElementById("controls-area").classList.add("hidden");
  } else {
    // if already logged in, show admin controls
    document.getElementById("admin-panel").classList.remove("hidden");
    document.getElementById("login-area").classList.add("hidden");
    document.getElementById("controls-area").classList.remove("hidden");
  }
};
// Login
document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("pw-input").value; // reuse field for email
  const password = prompt("Enter your Supabase password:");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    alert("Login failed: " + error.message);
  } else {
    loggedIn = true;
    document.getElementById("login-area").classList.add("hidden");
    document.getElementById("controls-area").classList.remove("hidden");
    document.getElementById("status-pill").textContent = "Admin";
  }
};


// Logout
document.getElementById("logout-btn").onclick = async () => {
  await supabaseClient.auth.signOut();
  loggedIn = false;
  showingLogin = false;
  document.getElementById("admin-panel").classList.add("hidden");
};

// Render admin
function renderAdmin() {
  document.getElementById("login-area").classList.add("hidden");
  document.getElementById("controls-area").classList.remove("hidden");
}

// Save changes
document.getElementById("save-changes").onclick = async () => {
  const title = document.getElementById("edit-title").value;
  const desc = document.getElementById("edit-desc").value;
  const accent = document.getElementById("edit-accent").value;

  await supabaseClient.from("site_settings").upsert([{ id: 1, title, description: desc, accent }]);
  loadData();
};

// New item
document.getElementById("new-item-btn").onclick = async () => {
  const title = prompt("Item title:");
  const desc = prompt("Item description:");
  if (title) {
    await supabaseClient.from("items").insert([{ title, description: desc }]);
    loadData();
  }
};

// Init
loadData();
 
