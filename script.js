// 🔧 Replace with your Supabase project values
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;

// Load site settings + items
async function loadData() {
  // Site settings
  let { data: settings } = await supabaseClient
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (settings) {
    document.getElementById("site-title").textContent = settings.title;
    document.getElementById("site-desc").textContent = settings.description;
    document.documentElement.style.setProperty("--accent", settings.accent || "#4f46e5");

    document.getElementById("edit-title").value = settings.title;
    document.getElementById("edit-desc").value = settings.description;
    document.getElementById("edit-accent").value = settings.accent;
  }

  // Items
  let { data: items } = await supabaseClient
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  renderItems(items || []);
}

// Render items into cards
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
document.getElementById("admin-toggle").onclick = () => {
  document.getElementById("admin-panel").classList.remove("hidden");

  if (!loggedIn) {
    // Show login form
    document.getElementById("login-area").classList.remove("hidden");
    document.getElementById("controls-area").classList.add("hidden");
  } else {
    // Show admin controls
    document.getElementById("login-area").classList.add("hidden");
    document.getElementById("controls-area").classList.remove("hidden");
  }
};

// Login with Supabase
document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("pw-input").value; // reuse input as email
  const password = prompt("Enter your Supabase password:");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

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
  document.getElementById("admin-panel").classList.add("hidden");
  document.getElementById("status-pill").textContent = "Public";
};

// Save site settings
document.getElementById("save-changes").onclick = async () => {
  const title = document.getElementById("edit-title").value;
  const desc = document.getElementById("edit-desc").value;
  const accent = document.getElementById("edit-accent").value;

  await supabaseClient.from("site_settings").upsert([
    { id: 1, title, description: desc, accent }
  ]);
  loadData();
};

// Add new item
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
