// ----- CONFIG: replace these with your Supabase project values -----
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
// ------------------------------------------------------------------
const supabase = supabaseJs.createClient ? supabaseJs : window.supabase; // compat if library on window
const supabaseClient = (typeof supabase !== "undefined" && supabase.createClient)
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : (console.error("Supabase client not found"), null);

let loggedIn = false; // UI-level flag

// Wrap everything in DOMContentLoaded to avoid element-not-found errors
document.addEventListener("DOMContentLoaded", () => {
  if (!supabaseClient) return;

  // element refs (safe)
  const adminPanel = document.getElementById("admin-panel");
  const adminHeader = document.getElementById("admin-header");
  const adminToggle = document.getElementById("admin-toggle");
  const adminClose = document.getElementById("admin-close");
  const loginArea = document.getElementById("login-area");
  const controlsArea = document.getElementById("controls-area");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const pwInput = document.getElementById("pw-input");
  const statusPill = document.getElementById("status-pill");
  const saveBtn = document.getElementById("save-changes");
  const uploadBg = document.getElementById("upload-bg");
  const editBg = document.getElementById("edit-bg");
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  const itemsGrid = document.getElementById("items-grid");
  const newItemBtn = document.getElementById("new-item-btn");

  // Initialize auth state on load
  (async function initAuthAndData() {
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const session = sessionData?.session ?? null;
      loggedIn = !!session;
      updateAuthUI();
    } catch (err) {
      console.error("auth init error", err);
    }
    await loadData();
  })();

  // Subscribe to auth changes (keeps UI in sync)
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    loggedIn = !!session;
    updateAuthUI();
    loadData().catch(e => console.error(e));
  });

  // Helper: update admin UI based on loggedIn
  function updateAuthUI() {
    if (!adminPanel) return;
    if (loggedIn) {
      loginArea.style.display = "none";
      controlsArea.classList.remove("hidden");
      controlsArea.style.display = "block";
      statusPill.textContent = "Admin";
    } else {
      loginArea.style.display = "block";
      controlsArea.classList.add("hidden");
      controlsArea.style.display = "none";
      statusPill.textContent = "Public";
    }
  }

  // Open admin panel
  adminToggle.addEventListener("click", () => {
    adminPanel.style.display = "block";
    adminPanel.setAttribute("aria-hidden", "false");
    updateAuthUI();
  });

  // Close admin panel
  adminClose.addEventListener("click", () => {
    adminPanel.style.display = "none";
    adminPanel.setAttribute("aria-hidden", "true");
  });

  // Login handler
  loginBtn.addEventListener("click", async () => {
    const email = pwInput.value?.trim();
    if (!email) { alert("Enter your admin email first."); return; }
    // keep simple UI: ask for password via prompt (or implement a password field)
    const password = prompt("Enter your Supabase password:");
    if (!password) { alert("Password required."); return; }

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        alert("Login failed: " + error.message);
        console.error(error);
        return;
      }
      loggedIn = !!data?.session;
      updateAuthUI();
      await loadData();
    } catch (err) {
      console.error("login error", err);
      alert("Login error (see console).");
    }
  });

  // Logout handler
  logoutBtn.addEventListener("click", async () => {
    try {
      await supabaseClient.auth.signOut();
      loggedIn = false;
      updateAuthUI();
      await loadData();
      adminPanel.style.display = "none";
    } catch (err) {
      console.error("logout error", err);
      alert("Logout error (see console).");
    }
  });

  // Save settings
  saveBtn.addEventListener("click", async () => {
    try {
      const title = document.getElementById("edit-title").value || "UNAMUNO";
      const desc = document.getElementById("edit-desc").value || "";
      const accent = document.getElementById("edit-accent").value || "#4f46e5";
      const background_url = editBg.value || null;
      const { error } = await supabaseClient.from("site_settings").upsert([{ id: 1, title, description: desc, accent, background_url }]);
      if (error) throw error;
      await loadData();
      alert("Settings saved.");
    } catch (err) {
      console.error("save settings error", err);
      alert("Could not save settings: " + (err.message || err));
    }
  });

  // New post
  newItemBtn.addEventListener("click", async () => {
    const title = prompt("Post title:");
    if (!title) return;
    const description = prompt("Post description (optional):") || "";
    const image_url = prompt("Image URL (optional):") || null;
    try {
      const { error } = await supabaseClient.from("items").insert([{ title, description, image_url }]);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error("create post error", err);
      alert("Could not create post: " + (err.message || err));
    }
  });

  // Search
  searchBtn.addEventListener("click", async () => {
    const q = (searchInput.value || "").trim();
    if (!q) { await loadData(); return; }
    try {
      const { data, error } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
      if (error) throw error;
      renderItems(data || []);
    } catch (err) {
      console.error("search error", err);
      alert("Search error (see console).");
    }
  });

  // Background upload
  uploadBg.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const path = `backgrounds/${Date.now()}_${file.name}`;
    try {
      const { data: upData, error: upErr } = await supabaseClient.storage.from("images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabaseClient.storage.from("images").getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("No public URL returned");
      editBg.value = publicUrl;
      document.body.style.backgroundImage = `url(${publicUrl})`;
      document.body.style.backgroundSize = "cover";
    } catch (err) {
      console.error("upload error", err);
      alert("Upload failed: " + (err.message || err));
    }
  });

  // Make admin panel draggable by header
  (function makeDraggable() {
    const panel = adminPanel;
    const handle = adminHeader;
    if (!panel || !handle) return;
    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

    handle.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      panel.style.position = "fixed";
      panel.style.right = "auto";
      panel.style.left = `${startLeft}px`;
      panel.style.top = `${startTop}px`;
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = `${startLeft + dx}px`;
      panel.style.top = `${startTop + dy}px`;
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
      document.body.style.userSelect = "";
    });
  })();

  // -------------------------
  // Data load + render functions
  // -------------------------
  async function loadData() {
    try {
      // load settings
      const { data: settings, error: settingErr } = await supabaseClient.from("site_settings").select("*").eq("id", 1).single();
      if (settingErr && settingErr.code !== "PGRST116") { console.warn("site_settings load error", settingErr); }
      if (settings) {
        document.getElementById("site-title").textContent = settings.title || "UNAMUNO";
        document.getElementById("site-desc").textContent = settings.description || "";
        document.getElementById("edit-title").value = settings.title || "";
        document.getElementById("edit-desc").value = settings.description || "";
        document.getElementById("edit-accent").value = settings.accent || "#4f46e5";
        document.getElementById("edit-bg").value = settings.background_url || "";
        if (settings.background_url) {
          document.body.style.backgroundImage = `url(${settings.background_url})`;
          document.body.style.backgroundSize = "cover";
        }
      }

      // load items
      const { data: items, error: itemsErr } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
      if (itemsErr) throw itemsErr;
      renderItems(items || []);
    } catch (err) {
      console.error("loadData error", err);
    }
  }

  function renderItems(items) {
    itemsGrid.innerHTML = "";
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        ${item.image_url ? `<img src="${item.image_url}" alt="">` : ""}
        <h3 style="margin:0 0 8px 0">${escapeHtml(item.title || "")}</h3>
        <div style="color:#374151">${escapeHtml(item.description || "")}</div>
        ${loggedIn ? `<div style="margin-top:10px"><button class="danger" data-id="${item.id}">Delete</button></div>` : ""}
      `;
      itemsGrid.appendChild(div);
    });

    // attach delete handlers only if logged in
    if (loggedIn) {
      itemsGrid.querySelectorAll(".danger").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.getAttribute("data-id");
          if (!id) return;
          if (!confirm("Delete this post?")) return;
          try {
            const { error } = await supabaseClient.from("items").delete().eq("id", id);
            if (error) throw error;
            await loadData();
          } catch (err) {
            console.error("delete error", err);
            alert("Could not delete post: " + (err.message || err));
          }
        });
      });
    }
  }

  // tiny helper to avoid XSS when rendering plain strings
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

}); // DOMContentLoaded end
