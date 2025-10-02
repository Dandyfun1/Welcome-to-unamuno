// 🔧 Replace with your Supabase project details
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

  // Auth session check
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

  // UI updates
  function updateAuthUI() {
    loginArea.style.display = loggedIn ? "none" : "block";
    controlsArea.classList.toggle("hidden", !loggedIn);
    statusPill.textContent = loggedIn ? "Admin" : "Public";
  }

  // Admin Panel
  adminToggle.onclick = () => {
    adminPanel.style.display = "block";
    updateAuthUI();
  };
  adminClose.onclick = () => {
    adminPanel.style.display = "none";
  };

  // Login
  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value.trim();
    const password = prompt("Enter your Supabase password:");
    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert("Login failed: " + error.message);
      return;
    }
    alert("Login successful!");
    loggedIn = !!data.session;
    updateAuthUI();
    loadData();
  };

  // Logout
  logoutBtn.onclick = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      alert("Logout failed: " + error.message);
      return;
    }
    loggedIn = false;
    updateAuthUI();
    loadData();
    adminPanel.style.display = "none";
    alert("Logged out successfully.");
  };

  // Save site settings
  saveBtn.onclick = async () => {
    const title = document.getElementById("edit-title").value;
    const desc = document.getElementById("edit-desc").value;
    const accent = document.getElementById("edit-accent").value || "#16a34a";
    const background_url = document.getElementById("edit-bg").value;
    const logo_url = document.getElementById("edit-logo").value;

    const { error } = await supabaseClient.from("site_settings").upsert([
      {
        id: "00000000-0000-0000-0000-000000000001",
        title,
        description: desc,
        accent,
        background_url,
        logo_url,
      },
    ]);

    if (error) {
      alert("Failed to save site settings: " + error.message);
      return;
    }
    alert("Settings saved successfully.");
    document.documentElement.style.setProperty("--accent", accent);
    loadData();
  };

  // Admin-only new post
  newItemBtn.onclick = async () => {
    const title = prompt("Post title:");
    if (!title) return;
    const desc = prompt("Post description:");
    const image_url = prompt("Image URL (optional):");

    const { error } = await supabaseClient
      .from("items")
      .insert([{ title, description: desc, image_url }]);

    if (error) {
      alert("Failed to create post: " + error.message);
      return;
    }
    alert("Post created successfully.");
    loadData();
  };

  // Public posting
  publicPostBtn.onclick = async () => {
    const title = prompt("Post title:");
    if (!title) return;
    const desc = prompt("Post description:");
    const image_url = prompt("Image URL (optional):");

    const { error } = await supabaseClient
      .from("items")
      .insert([{ title, description: desc, image_url }]);

    if (error) {
      alert("Failed to post: " + error.message);
      return;
    }
    alert("Post published successfully.");
    loadData();
  };

  // Search
  searchBtn.onclick = async () => {
    const q = searchInput.value;
    let { data: items, error } = await supabaseClient
      .from("items")
      .select("*")
      .ilike("title", `%${q}%`);

    if (error) {
      alert("Search failed: " + error.message);
      return;
    }
    renderItems(items || []);
  };

  // Load settings + posts
  async function loadData() {
    let { data: settings, error: settingsError } = await supabaseClient
      .from("site_settings")
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    if (settingsError) {
      console.error("Settings load error:", settingsError.message);
    }

    if (settings) {
      document.getElementById("site-title").textContent = settings.title;
      document.getElementById("site-desc").textContent = settings.description;
      document.getElementById("edit-title").value = settings.title;
      document.getElementById("edit-desc").value = settings.description;
      document.getElementById("edit-accent").value = settings.accent;
      document.getElementById("edit-bg").value = settings.background_url || "";
      document.getElementById("edit-logo").value = settings.logo_url || "";
      document.documentElement.style.setProperty(
        "--accent",
        settings.accent || "#16a34a"
      );

      if (settings.background_url) {
        document.body.style.backgroundImage = `url(${settings.background_url})`;
        document.body.style.backgroundSize = "cover";
      }

      if (settings.logo_url) {
        const logoEl = document.getElementById("site-logo");
        logoEl.src = settings.logo_url;
        logoEl.style.display = "block";
      }
    }

    let { data: items, error: itemsError } = await supabaseClient
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (itemsError) {
      console.error("Items load error:", itemsError.message);
    }

    renderItems(items || []);
  }

  // Render items
  function renderItems(items) {
    itemsGrid.innerHTML = "";
    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        ${item.image_url ? `<img src="${item.image_url}" alt="">` : ""}
        <h3 style="margin:0 0 6px 0">${item.title}</h3>
        <p>${item.description || ""}</p>
        ${
          loggedIn
            ? `<button class="danger" data-id="${item.id}">Delete</button>`
            : ""
        }
      `;
      itemsGrid.appendChild(div);
    });

    if (loggedIn) {
      itemsGrid.querySelectorAll(".danger").forEach((btn) => {
        btn.onclick = async (e) => {
          const id = e.target.getAttribute("data-id");
          if (confirm("Delete this post?")) {
            const { error } = await supabaseClient
              .from("items")
              .delete()
              .eq("id", id);

            if (error) {
              alert("Delete failed: " + error.message);
              return;
            }
            alert("Post deleted successfully.");
            loadData();
          }
        };
      });
    }
  }
});
