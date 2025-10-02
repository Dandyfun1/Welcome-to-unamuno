// 🔧 Replace with your Supabase project credentials
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co"; 
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY"; 

// Initialize client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Page loaded, initializing Supabase...");

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
  const fab = document.getElementById("public-fab");
  const popup = document.getElementById("public-popup");
  const publicPostBtn = document.getElementById("public-post-btn");
  const publicCancel = document.getElementById("public-cancel");

  // 🔎 Debug: show Supabase URL + key presence
  console.log("Using Supabase URL:", SUPABASE_URL);
  console.log("Anon Key present:", !!SUPABASE_ANON_KEY);

  // Init session
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) console.error("❌ Error fetching session:", error);
    loggedIn = !!data.session;
    updateAuthUI();
    loadData();
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    loggedIn = !!session;
    console.log("🔐 Auth state changed. Logged in?", loggedIn);
    updateAuthUI();
    loadData();
  });

  function updateAuthUI() {
    if (loggedIn) {
      loginArea.style.display = "none";
      controlsArea.classList.remove("hidden");
      statusPill.textContent = "Admin";
    } else {
      loginArea.style.display = "block";
      controlsArea.classList.add("hidden");
      statusPill.textContent = "Public";
    }
  }

  // Admin panel
  adminToggle.onclick = () => { adminPanel.style.display = "block"; updateAuthUI(); };
  adminClose.onclick = () => { adminPanel.style.display = "none"; };

  // Login
  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value.trim();
    const password = prompt("Enter your Supabase password:");
    console.log("🔑 Attempting login with:", email);

    if (!email || !password) return;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("❌ Login failed:", error);
      alert("Login failed: " + error.message);
      return;
    }
    console.log("✅ Login success:", data);
    loggedIn = !!data.session;
    updateAuthUI();
    loadData();
  };

  // Logout
  logoutBtn.onclick = async () => {
    console.log("🔓 Logging out...");
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    loadData();
    adminPanel.style.display = "none";
  };

  // New Post (Admin)
  newItemBtn.onclick = async () => {
    const title = prompt("Post title:");
    if (!title) return;
    const desc = prompt("Post description:");
    const image_url = prompt("Image URL (optional):");

    console.log("📝 Admin creating new post:", { title, desc, image_url });

    const { data, error } = await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    if (error) {
      console.error("❌ Insert failed:", error);
      alert("Insert failed: " + error.message);
    } else {
      console.log("✅ Insert success:", data);
      loadData();
    }
  };

  // Public Post
  fab.onclick = () => { popup.style.display = "block"; };
  publicCancel.onclick = () => { popup.style.display = "none"; };

  publicPostBtn.onclick = async () => {
    const title = document.getElementById("public-title").value.trim();
    const description = document.getElementById("public-desc").value.trim();
    const image_url = document.getElementById("public-img").value.trim();

    console.log("🌍 Public user submitting post:", { title, description, image_url });

    const { data, error } = await supabaseClient.from("items").insert([{ title, description, image_url }]);

    if (error) {
      console.error("❌ Public post failed:", error);
      alert("Failed to post: " + error.message);
    } else {
      console.log("✅ Public post success:", data);
      alert("Post submitted!");
      document.getElementById("public-title").value = "";
      document.getElementById("public-desc").value = "";
      document.getElementById("public-img").value = "";
      popup.style.display = "none";
      loadData();
    }
  };

  // Search
  searchBtn.onclick = async () => {
    const q = searchInput.value;
    console.log("🔍 Searching for:", q);
    let { data: items, error } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    if (error) {
      console.error("❌ Search error:", error);
    } else {
      console.log("✅ Search results:", items);
      renderItems(items || []);
    }
  };

  // Load settings + posts
  async function loadData() {
    console.log("📥 Loading site settings + items...");
    let { data: settings, error: settingsError } = await supabaseClient.from("site_settings").select("*").limit(1).single();
    if (settingsError) {
      console.error("❌ Error loading site_settings:", settingsError);
    } else {
      console.log("✅ Loaded site_settings:", settings);
      if (settings) {
        document.getElementById("site-title").textContent = settings.title;
        document.getElementById("site-desc").textContent = settings.description;
        document.documentElement.style.setProperty("--accent", settings.accent || "#16a34a");
      }
    }

    let { data: items, error: itemsError } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    if (itemsError) {
      console.error("❌ Error loading items:", itemsError);
    } else {
      console.log("✅ Loaded items:", items);
      renderItems(items || []);
    }
  }

  function renderItems(items) {
    itemsGrid.innerHTML = "";
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        ${item.image_url ? `<img src="${item.image_url}" alt="">` : ""}
        <h3 style="margin:0 0 6px 0">${item.title}</h3>
        <p>${item.description || ""}</p>
        ${loggedIn ? `<button class="danger" data-id="${item.id}">Delete</button>` : ""}
      `;
      itemsGrid.appendChild(div);
    });

    if (loggedIn) {
      itemsGrid.querySelectorAll(".danger").forEach(btn => {
        btn.onclick = async e => {
          const id = e.target.getAttribute("data-id");
          console.log("🗑️ Deleting post:", id);
          const { error } = await supabaseClient.from("items").delete().eq("id", id);
          if (error) {
            console.error("❌ Delete failed:", error);
            alert("Delete failed: " + error.message);
          } else {
            console.log("✅ Post deleted:", id);
            loadData();
          }
        };
      });
    }
  }
});
