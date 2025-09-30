// 🔧 Replace with your Supabase project values
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;

// Load site data from Supabase
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

// Render cards
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

// Show Admin panel on click
document.getElementById("admin-toggle").onclick = () => {
  document.getElementById("admin-panel").classList.remove("hidden");

  if (!loggedIn) {
    document.getElementById("login-area").classList.remove("hidden");
    document.getElementById("controls-area").classList.add("hidden");
  } else {
    document.getElementById("login-area").classList.add("hidden");
    document.getElementById("controls-area").classList.remove("hidden");
  }
};

// Login with Supabase Auth
document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("pw-input").value; // enter email here
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

// Search
document.getElementById("search-btn").onclick = async () => {
  const q = document.getElementById("search-input").value;
  let { data: items } = await supabaseClient
    .from("items")
    .select("*")
    .ilike("title", `%${q}%`);
  renderItems(items || []);
};

// Init
loadData();
// Load site data
async function loadData() {
  let { data: settings } = await supabaseClient
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (settings) {
    document.getElementById("site-title").textContent = settings.title;
    document.getElementById("site-desc").textContent = settings.description;
    document.documentElement.style.setProperty("--accent", settings.accent || "#4f46e5");
    if (settings.background_url) {
      document.body.style.backgroundImage = `url(${settings.background_url})`;
      document.body.style.backgroundSize = "cover";
    }

    document.getElementById("edit-title").value = settings.title;
    document.getElementById("edit-desc").value = settings.description;
    document.getElementById("edit-accent").value = settings.accent;
    document.getElementById("edit-bg").value = settings.background_url || "";
  }

  let { data: items } = await supabaseClient
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  renderItems(items || []);
}

// Render items with images
function renderItems(items) {
  const grid = document.getElementById("items-grid");
  grid.innerHTML = "";
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      ${item.image_url ? `<img src="${item.image_url}" style="max-width:100%;border-radius:8px"/>` : ""}
      <h3>${item.title}</h3>
      <p>${item.description}</p>`;
    grid.appendChild(card);
  });
}

// Save settings
document.getElementById("save-changes").onclick = async () => {
  const title = document.getElementById("edit-title").value;
  const desc = document.getElementById("edit-desc").value;
  const accent = document.getElementById("edit-accent").value;
  const background_url = document.getElementById("edit-bg").value;

  await supabaseClient.from("site_settings").upsert([
    { id: 1, title, description: desc, accent, background_url }
  ]);
  loadData();
};

// Add new item with image
document.getElementById("new-item-btn").onclick = async () => {
  const title = prompt("Item title:");
  const desc = prompt("Item description:");
  const image = prompt("Image URL (or leave empty):");

  if (title) {
    await supabaseClient.from("items").insert([{ title, description: desc, image_url: image }]);
    loadData();
  }
};
// Make admin panel draggable
(function makeDraggable() {
  const panel = document.getElementById("admin-panel");
  let offsetX, offsetY, dragging = false;

  panel.addEventListener("mousedown", e => {
    if (e.target.closest("input,button")) return; // skip form fields
    dragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    panel.style.position = "absolute";
  });

  document.addEventListener("mousemove", e => {
    if (dragging) {
      panel.style.left = e.clientX - offsetX + "px";
      panel.style.top = e.clientY - offsetY + "px";
    }
  });

  document.addEventListener("mouseup", () => dragging = false);
})();
// Background image upload
document.getElementById("upload-bg").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const filePath = `backgrounds/${Date.now()}_${file.name}`;

  // Upload to Supabase Storage
  const { data, error } = await supabaseClient.storage
    .from("images")
    .upload(filePath, file, { upsert: true });

  if (error) {
    alert("Upload failed: " + error.message);
    return;
  }

  // Get public URL
  const { data: publicData } = supabaseClient.storage
    .from("images")
    .getPublicUrl(filePath);

  const publicUrl = publicData.publicUrl;

  // Save to input + apply background immediately
  document.getElementById("edit-bg").value = publicUrl;
  document.body.style.backgroundImage = `url(${publicUrl})`;
  document.body.style.backgroundSize = "cover";
});
document.getElementById("save-changes").onclick = async () => {
  const title = document.getElementById("edit-title").value;
  const desc = document.getElementById("edit-desc").value;
  const accent = document.getElementById("edit-accent").value;
  const background_url = document.getElementById("edit-bg").value;

  await supabaseClient.from("site_settings").upsert([
    { id: 1, title, description: desc, accent, background_url }
  ]);
  loadData();
};

