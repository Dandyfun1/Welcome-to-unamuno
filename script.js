// 🔧 Replace with your Supabase project details
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
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
  const itemsGrid = document.getElementById("items-grid");

  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");

  // Floating add button
  const publicAddBtn = document.createElement("button");
  publicAddBtn.textContent = "+";
  Object.assign(publicAddBtn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "var(--accent)",
    color: "#fff",
    fontSize: "28px",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    zIndex: "1500"
  });
  document.body.appendChild(publicAddBtn);

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

  // Admin UI
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

  // Panel open/close
  adminToggle.onclick = () => { adminPanel.style.display = "block"; updateAuthUI(); };
  adminClose.onclick = () => { adminPanel.style.display = "none"; };

  // Login
  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value.trim();
    const password = prompt("Enter your Supabase password:");
    if (!email || !password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { alert("Login failed: " + error.message); return; }
    loggedIn = !!data.session;
    updateAuthUI();
    loadData();
  };

  // Logout
  logoutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    adminPanel.style.display = "none";
    loadData();
  };

  // Save site settings
  saveBtn.onclick = async () => {
    const title = document.getElementById("edit-title").value;
    const desc = document.getElementById("edit-desc").value;
    const accent = document.getElementById("edit-accent").value || "#16a34a";
    const background_url = document.getElementById("edit-bg").value;
    const logo_url = document.getElementById("edit-logo").value;

    await supabaseClient.from("site_settings").upsert([{ 
      id: "00000000-0000-0000-0000-000000000001", 
      title, description: desc, accent, background_url, logo_url 
    }]);

    document.documentElement.style.setProperty("--accent", accent);
    loadData();
  };

  // Add new post (Admin button inside panel)
  newItemBtn.onclick = async () => {
    const title = prompt("Post title:");
    if (!title) return;
    const desc = prompt("Post description:");
    const image_url = prompt("Image URL (optional):");
    await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    loadData();
  };

  // Public floating button
  publicAddBtn.onclick = async () => {
    const title = prompt("Your post title:");
    if (!title) return;
    const desc = prompt("Your description:");
    const image_url = prompt("Image URL (optional):");
    const { error } = await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    if (error) alert("Failed to post: " + error.message);
    else loadData();
  };

  // Search
  searchBtn.onclick = async () => {
    const q = searchInput.value;
    let { data: items } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    renderItems(items || []);
  };

  // Load data
  async function loadData() {
    let { data: settings } = await supabaseClient.from("site_settings").select("*").limit(1).single();
    if (settings) {
      document.getElementById("site-title").textContent = settings.title;
      document.getElementById("site-desc").textContent = settings.description;
      document.getElementById("edit-title").value = settings.title;
      document.getElementById("edit-desc").value = settings.description;
      document.getElementById("edit-accent").value = settings.accent;
      document.getElementById("edit-bg").value = settings.background_url || "";
      document.getElementById("edit-logo").value = settings.logo_url || "";

      document.documentElement.style.setProperty("--accent", settings.accent || "#16a34a");

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

    let { data: items } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    renderItems(items || []);
  }

  // Render posts
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
          if (confirm("Delete this post?")) {
            await supabaseClient.from("items").delete().eq("id", id);
            loadData();
          }
        };
      });
    }
  }

  // Draggable admin panel
  (function makeDraggable() {
    let dragging = false, offsetX = 0, offsetY = 0;
    adminHeader.addEventListener("mousedown", e => {
      dragging = true;
      offsetX = e.clientX - adminPanel.offsetLeft;
      offsetY = e.clientY - adminPanel.offsetTop;
      document.body.style.userSelect = "none";
    });
    window.addEventListener("mousemove", e => {
      if (dragging) {
        adminPanel.style.left = (e.clientX - offsetX) + "px";
        adminPanel.style.top = (e.clientY - offsetY) + "px";
        adminPanel.style.right = "auto";
      }
    });
    window.addEventListener("mouseup", () => { dragging = false; document.body.style.userSelect = ""; });
  })();
});
