const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;

// Load site + posts
async function loadData() {
  let { data: settings } = await supabaseClient.from("site_settings").select("*").eq("id", 1).single();
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
  let { data: items } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
  renderItems(items || []);
}

// Render posts
function renderItems(items) {
  const grid = document.getElementById("items-grid");
  grid.innerHTML = "";
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      ${item.image_url ? `<img src="${item.image_url}" style="width:100%;border-radius:8px;margin-bottom:8px"/>` : ""}
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      ${loggedIn ? `<button class="danger" data-id="${item.id}">Delete</button>` : ""}
    `;
    grid.appendChild(card);
  });

  // Attach delete if admin
  if (loggedIn) {
    document.querySelectorAll(".danger").forEach(btn => {
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

// Admin toggle
document.getElementById("admin-toggle").onclick = () => {
  document.getElementById("admin-panel").style.display = "block";
  if (!loggedIn) {
    document.getElementById("login-area").style.display = "block";
    document.getElementById("controls-area").style.display = "none";
  } else {
    document.getElementById("login-area").style.display = "none";
    document.getElementById("controls-area").style.display = "block";
  }
};

// Login
document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("pw-input").value;
  const password = prompt("Enter your Supabase password:");
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    alert("Login failed: " + error.message);
  } else {
    loggedIn = true;
    document.getElementById("login-area").style.display = "none";
    document.getElementById("controls-area").style.display = "block";
    document.getElementById("status-pill").textContent = "Admin";
    loadData();
  }
};

// Logout
document.getElementById("logout-btn").onclick = async () => {
  await supabaseClient.auth.signOut();
  loggedIn = false;
  document.getElementById("admin-panel").style.display = "none";
  document.getElementById("status-pill").textContent = "Public";
  loadData();
};

// Save site settings
document.getElementById("save-changes").onclick = async () => {
  const title = document.getElementById("edit-title").value;
  const desc = document.getElementById("edit-desc").value;
  const accent = document.getElementById("edit-accent").value;
  const background_url = document.getElementById("edit-bg").value;
  await supabaseClient.from("site_settings").upsert([{ id: 1, title, description: desc, accent, background_url }]);
  loadData();
};

// New post
document.getElementById("new-item-btn").onclick = async () => {
  const title = prompt("Post title:");
  const desc = prompt("Post description:");
  const image = prompt("Image URL (optional):");
  if (title) {
    await supabaseClient.from("items").insert([{ title, description: desc, image_url: image }]);
    loadData();
  }
};

// Search
document.getElementById("search-btn").onclick = async () => {
  const q = document.getElementById("search-input").value;
  let { data: items } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
  renderItems(items || []);
};

// Upload background
document.getElementById("upload-bg").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  const filePath = `backgrounds/${Date.now()}_${file.name}`;
  await supabaseClient.storage.from("images").upload(filePath, file, { upsert: true });
  const { data } = supabaseClient.storage.from("images").getPublicUrl(filePath);
  document.getElementById("edit-bg").value = data.publicUrl;
  document.body.style.backgroundImage = `url(${data.publicUrl})`;
});

// Draggable admin panel
(function() {
  const panel = document.getElementById("admin-panel");
  const header = document.querySelector(".admin-header");
  let offsetX, offsetY, dragging = false;

  header.addEventListener("mousedown", e => {
    dragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", e => {
    if (dragging) {
      panel.style.left = e.clientX - offsetX + "px";
      panel.style.top = e.clientY - offsetY + "px";
    }
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.userSelect = "";
  });
})();

// Init
loadData();

