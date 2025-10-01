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
  const itemsGrid = document.getElementById("items-grid");
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");

  const bgUploadBtn = document.getElementById("bg-upload-btn");
  const bgFileInput = document.getElementById("bg-file-input");
  const logoUploadBtn = document.getElementById("logo-upload-btn");
  const logoFileInput = document.getElementById("logo-file-input");

  // Floating add button (public posts)
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

  // UI updates
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

  // Admin panel open/close
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

  // New post (admin)
  newItemBtn.onclick = async () => {
    const title = prompt("Post title:");
    if (!title) return;
    const desc = prompt("Post description:");
    const image_url = prompt("Image URL (optional):");
    await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    loadData();
  };

  // Public add post
  publicAddBtn.onclick = async () => {
    const title = prompt("Your post title:");
    if (!title) return;
    const desc = prompt("Your description:");
    const image_url = prompt("Image URL (optional):");
    const { error } = await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    if (error) alert("Failed to post: " + error.message);
    else loadData();
  };

  // Search posts
  searchBtn.onclick = async () => {
    const q = searchInput.value;
    let { data: items } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    renderItems(items || []);
  };

  // Background upload
  bgUploadBtn.onclick = () => bgFileInput.click();
  bgFileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const path = `backgrounds/${Date.now()}_${file.name}`;
    const { error } = await supabaseClient.storage.from("images").upload(path, file, { upsert: true });
    if (error) return alert("Upload failed: " + error.message);
    const { data } = supabaseClient.storage.from("images").getPublicUrl(path);
    const url = data.publicUrl;
    document.getElementById("edit-bg").value = url;
    document.body.style.backgroundImage = `url(${url})`;
  };

  // Logo upload
  logoUploadBtn.onclick = () => logoFileInput.click();
  logoFileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const path = `logos/${Date.now()}_${file.name}`;
    const { error } = await supabaseClient.storage.from("images").upload(path, file, { upsert: true });
    if (error) return alert("Upload failed: " + error.message);
    const { data } = supabaseClient.storage.from("images").getPublicUrl(path);
    const url = data.publicUrl;
    document.getElementById("edit-logo").value = url;
    const logoEl = document.getElementById("site-logo");
    logoEl.src = url;
    logoEl.style.display = "block";
  };

  // Load data
  async function loadData() {
    let { data: settings } = await supabaseClient.from("site_settings").select("*").eq("id", "00000000-0000-0000-0000-000000000001").single();
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

  // Make admin panel draggable
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
