// 🔧 Replace these with your Supabase project details
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;

// ========================
// Load Site + Posts
// ========================
async function loadData() {
  // Get site settings (always row id=1)
  let { data: settings, error: settingsError } = await supabaseClient
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (settingsError) {
    console.error("Error loading site settings:", settingsError);
  }

  if (settings) {
    document.getElementById("site-title").textContent = settings.title || "UNAMUNO";
    document.getElementById("site-desc").textContent = settings.description || "";
    document.documentElement.style.setProperty("--accent", settings.accent || "#4f46e5");

    if (settings.background_url) {
      document.body.style.backgroundImage = `url(${settings.background_url})`;
      document.body.style.backgroundSize = "cover";
    }

    // Fill admin inputs
    document.getElementById("edit-title").value = settings.title || "";
    document.getElementById("edit-desc").value = settings.description || "";
    document.getElementById("edit-accent").value = settings.accent || "#4f46e5";
    document.getElementById("edit-bg").value = settings.background_url || "";
  }

  // Load posts
  let { data: items, error: itemsError } = await supabaseClient
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (itemsError) {
    console.error("Error loading items:", itemsError);
  }

  renderItems(items || []);
}

// ========================
// Render Posts
// ========================
function renderItems(items) {
  const grid = document.getElementById("items-grid");
  grid.innerHTML = "";
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      ${item.image_url ? `<img src="${item.image_url}" style="max-width:100%;border-radius:8px;margin-bottom:8px"/>` : ""}
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      ${loggedIn ? `<button class="danger" data-id="${item.id}">Delete</button>` : ""}
    `;
    grid.appendChild(card);
  });

  // Add delete functionality if admin
  if (loggedIn) {
    document.querySelectorAll(".danger").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        if (confirm("Delete this post?")) {
          let { error } = await supabaseClient.from("items").delete().eq("id", id);
          if (error) alert("Error deleting post: " + error.message);
          loadData();
        }
      });
    });
  }
}

// ========================
// Admin Panel Toggle
// ========================
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

// ========================
// Login
// ========================
document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("pw-input").value;
  const password = prompt("Enter your Supabase password:");

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    alert("Login failed: " + error.message);
  } else {
    loggedIn = true;
    document.getElementById("login-area").classList.add("hidden");
    document.getElementById("controls-area").classList.remove("hidden");
    document.getElementById("status-pill").textContent = "Admin";
    loadData();
  }
};

// ========================
// Logout
// ========================
document.getElementById("logout-btn").onclick = async () => {
  await supabaseClient.auth.signOut();
  loggedIn = false;
  document.getElementById("admin-panel").classList.add("hidden");
  document.getElementById("status-pill").textContent = "Public";
  loadData();
};

// ========================
// Save Site Settings
// ========================
document.getElementById("save-changes").onclick = async () => {
  const title = document.getElementById("edit-title").value;
  const desc = document.getElementById("edit-desc").value;
  const accent = document.getElementById("edit-accent").value;
  const background_url = document.getElementById("edit-bg").value;

  let { error } = await supabaseClient.from("site_settings").upsert([
    { id: 1, title, description: desc, accent, background_url }
  ]);

  if (error) {
    alert("Error saving settings: " + error.message);
  } else {
    loadData();
  }
};

// ========================
// New Post
// ========================
document.getElementById("new-item-btn").onclick = async () => {
  const title = prompt("Post title:");
  const desc = prompt("Post description:");
  const image = prompt("Image URL (optional):");

  if (title) {
    let { error } = await supabaseClient.from("items").insert([{ title, description: desc, image_url: image }]);
    if (error) {
      alert("Error creating post: " + error.message);
    }
    loadData();
  }
};

// ========================
// Search
// ========================
document.getElementById("search-btn").onclick = async () => {
  const q = document.getElementById("search-input").value;
  let { data: items, error } = await supabaseClient
    .from("items")
    .select("*")
    .ilike("title", `%${q}%`);

  if (error) {
    console.error("Search error:", error);
  }
  renderItems(items || []);
};

// ========================
// Upload Background Image
// ========================
document.getElementById("upload-bg").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const filePath = `backgrounds/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabaseClient.storage
    .from("images")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    alert("Upload failed: " + uploadError.message);
    return;
  }

  const { data: publicData } = supabaseClient.storage.from("images").getPublicUrl(filePath);
  const publicUrl = publicData.publicUrl;

  document.getElementById("edit-bg").value = publicUrl;
  document.body.style.backgroundImage = `url(${publicUrl})`;
  document.body.style.backgroundSize = "cover";
});

// ========================
// Init
// ========================
loadData();
