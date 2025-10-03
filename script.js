// === Supabase Config ===
// ⚠️ Replace these with your actual values from Supabase Settings → API
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";

// Initialize client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Track login state
let loggedIn = false;

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script loaded. Testing Supabase connection...");

  // Quick test to confirm config is valid
  supabaseClient.from("items").select("*").limit(1)
    .then(res => {
      if (res.error) {
        console.error("❌ Supabase connection error:", res.error.message);
        alert("Supabase error: " + res.error.message);
      } else {
        console.log("✅ Supabase connection success, items:", res.data);
      }
    })
    .catch(err => {
      console.error("❌ Fetch failed:", err);
      alert("Failed to fetch. Check CORS and Supabase URL/Key.");
    });

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

  // Update UI depending on login
  function updateAuthUI() {
    loginArea.style.display = loggedIn ? "none" : "block";
    controlsArea.classList.toggle("hidden", !loggedIn);
    statusPill.textContent = loggedIn ? "Admin" : "Public";
  }

  // Toggle admin panel
  adminToggle.onclick = () => { adminPanel.style.display = "block"; updateAuthUI(); };
  adminClose.onclick = () => { adminPanel.style.display = "none"; };

  // Login (Supabase Auth)
  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value.trim();
    const password = prompt("Enter your Supabase password:");
    if (!email || !password) return;

    console.log("🔑 Attempting login with:", email);
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("❌ Login failed:", error.message);
      alert("Error al iniciar sesión: " + error.message);
      return;
    }
    loggedIn = !!data.session;
    console.log("✅ Login success. Session:", data.session);
    updateAuthUI();
    loadData();
  };

  // Logout
  logoutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    console.log("👋 Logged out.");
    updateAuthUI();
    adminPanel.style.display = "none";
  };

  // Save site settings
  saveBtn.onclick = async () => {
    const title = document.getElementById("edit-title").value;
    const desc = document.getElementById("edit-desc").value;
    const accent = document.getElementById("edit-accent").value || "#16a34a";

    console.log("💾 Saving site settings...");
    const { error } = await supabaseClient.from("site_settings")
      .upsert([{ id: "00000000-0000-0000-0000-000000000001", title, description: desc, accent }]);
    if (error) {
      console.error("❌ Error saving site_settings:", error.message);
      alert("Error guardando: " + error.message);
    } else {
      console.log("✅ Site settings saved!");
      loadData();
    }
  };

  // Admin new post
  newItemBtn.onclick = async () => {
    const title = prompt("Post title:"); if (!title) return;
    const desc = prompt("Post description:");

    console.log("📝 Admin posting:", title);
    const { error } = await supabaseClient.from("items").insert([{ title, description: desc }]);
    if (error) {
      console.error("❌ Error creating post:", error.message);
      alert("Error creando post: " + error.message);
    } else {
      console.log("✅ Post created!");
      loadData();
    }
  };

  // Public post
  publicPostBtn.onclick = async () => {
    const title = prompt("Public post title:"); if (!title) return;
    const desc = prompt("Public post description:");

    console.log("🌍 Public posting:", title);
    const { error } = await supabaseClient.from("items").insert([{ title, description: desc }]);
    if (error) {
      console.error("❌ Public posting failed:", error.message);
      alert("No se pudo publicar: " + error.message);
    } else {
      console.log("✅ Public post created!");
      loadData();
    }
  };

  // Search
  searchBtn.onclick = async () => {
    const q = searchInput.value;
    let { data: items, error } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    if (error) {
      console.error("❌ Error searching items:", error.message);
      alert("Error buscando: " + error.message);
    } else {
      renderItems(items || []);
    }
  };

  // Load settings + posts
  async function loadData() {
    console.log("📥 Loading site settings...");
    let { data: settings, error: settingsErr } = await supabaseClient
      .from("site_settings").select("*").eq("id", "00000000-0000-0000-0000-000000000001").single();
    if (settingsErr) {
      console.error("❌ Error loading site_settings:", settingsErr.message);
      alert("Error cargando configuración: " + settingsErr.message);
    } else {
      console.log("✅ Settings loaded:", settings);
      document.getElementById("site-title").textContent = settings.title;
      document.getElementById("site-desc").textContent = settings.description;
      document.documentElement.style.setProperty("--accent", settings.accent || "#16a34a");
    }

    console.log("📥 Loading posts...");
    let { data: items, error: itemsErr } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    if (itemsErr) {
      console.error("❌ Error loading items:", itemsErr.message);
      alert("Error cargando publicaciones: " + itemsErr.message);
    } else {
      console.log("✅ Posts loaded:", items);
      renderItems(items || []);
    }
  }

  // Render posts
  function renderItems(items) {
    itemsGrid.innerHTML = "";
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
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
            console.log("🗑️ Deleting post:", id);
            await supabaseClient.from("items").delete().eq("id", id);
            loadData();
          }
        };
      });
    }
  }

  // Auto-load
  loadData();
});

