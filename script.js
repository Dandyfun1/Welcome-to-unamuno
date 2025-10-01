// 🔧 Replace with your Supabase project credentials
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
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
  const bgUploadBtn = document.getElementById("bg-upload-btn");
  const bgFileInput = document.getElementById("bg-file-input");
  const logoEl = document.getElementById("site-logo");
  const logoInput = document.getElementById("edit-logo");
  const logoUploadBtn = document.getElementById("logo-upload-btn");
  const logoFileInput = document.getElementById("logo-file-input");
  const newItemBtn = document.getElementById("new-item-btn");
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  const itemsGrid = document.getElementById("items-grid");
  const fab = document.getElementById("public-fab");
  const popup = document.getElementById("public-popup");
  const publicPostBtn = document.getElementById("public-post-btn");
  const publicCancel = document.getElementById("public-cancel");

  // Init
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
    loadData();
    adminPanel.style.display = "none";
  };

  // Save settings
  saveBtn.onclick = async () => {
    const title = document.getElementById("edit-title").value;
    const desc = document.getElementById("edit-desc").value;
    const accent = document.getElementById("edit-accent").value || "#16a34a";
    const background_url = document.getElementById("edit-bg").value;
    const logo_url = logoInput.value;

    await supabaseClient.from("site_settings").upsert([
      { id: 1, title, description: desc, accent, background_url, logo_url }
    ]);

    document.documentElement.style.setProperty("--accent", accent);
    loadData();
  };

  // Logo upload
  logoUploadBtn.onclick = () => logoFileInput.click();
  logoFileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const path = `logos/${Date.now()}_${file.name}`;
    const { error } = await supabaseClient.storage.from("images").upload(path, file, { upsert: true });
    if (error) { alert("Upload failed: " + error.message); return; }
    const { data } = supabaseClient.storage.from("images").getPublicUrl(path);
    const url = data.publicUrl;
    await supabaseClient.from("site_settings").upsert([{ id: 1, logo_url: url }]);
    logoEl.src = url;
    logoEl.style.display = "block";
    logoInput.value = url;
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

  // Public post popup
  fab.onclick = () => { popup.style.display = "block"; };
  publicCancel.onclick = () => { popup.style.display = "none"; };

  publicPostBtn.onclick = async () => {
    const title = document.getElementById("public-title").value.trim();
    const description = document.getElementById("public-desc").value.trim();
    const image_url = document.getElementById("public-img").value.trim();

    if (!title) {
      alert("Title is required");
      return;
    }

    const { error } = await supabaseClient.from("items").insert([{ title, description, image_url }]);
    if (error) {
      alert("Failed to post: " + error.message);
    } else {
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
    let { data: items } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    renderItems(items || []);
  };

  // Upload background
  bgUploadBtn.onclick = () => bgFileInput.click();
  bgFileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const path = `backgrounds/${Date.now()}_${file.name}`;
    await supabaseClient.storage.from("images").upload(path, file, { upsert: true });
    const { data } = supabaseClient.storage.from("images").getPublicUrl(path);
    const url = data.publicUrl;
    await supabaseClient.from("site_settings").upsert([{ id: 1, background_url: url }]);
    document.body.style.backgroundImage = `url(${url})`;
    document.body.style.backgroundSize = "cover";
    document.getElementById("edit-bg").value = url;
  };

  // Drag admin panel
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

  // Load settings + posts
  async function loadData() {
    let { data: settings } = await supabaseClient.from("site_settings").select("*").eq("id", 1).single();
    if (settings) {
      document.getElementById("site-title").textContent = settings.title;
      document.getElementById("site-desc").textContent = settings.description;
      document.getElementById("edit-title").value = settings.title;
      document.getElementById("edit-desc").value = settings.description;
      document.getElementById("edit-accent").value = settings.accent;
      document.getElementById("edit-bg").value = settings.background_url || "";
      logoInput.value = settings.logo_url || "";

      document.documentElement.style.setProperty("--accent", settings.accent || "#16a34a");

      if (settings.background_url) {
        document.body.style.backgroundImage = `url(${settings.background_url})`;
      }
      if (settings.logo_url) {
        logoEl.src = settings.logo_url;
        logoEl.style.display = "block";
      } else {
        logoEl.style.display = "none";
      }
    }

    let { data: items } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    renderItems(items || []);
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
          if (confirm("Delete this post?")) {
            await supabaseClient.from("items").delete().eq("id", id);
            loadData();
          }
        };
      });
    }
  }
});
