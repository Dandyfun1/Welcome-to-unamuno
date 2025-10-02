// 🔧 Replace with your Supabase project details
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;

document.addEventListener("DOMContentLoaded", () => {
  const adminPanel = document.getElementById("admin-panel");
  const loginArea = document.getElementById("login-area");
  const controlsArea = document.getElementById("controls-area");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const statusPill = document.getElementById("status-pill");
  const saveBtn = document.getElementById("save-changes");
  const newItemBtn = document.getElementById("new-item-btn");
  const publicPostBtn = document.getElementById("public-post-btn");
  const itemsGrid = document.getElementById("items-grid");

  // SESSION INIT
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) console.error("Session error:", error);
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
    loginArea.style.display = loggedIn ? "none" : "block";
    controlsArea.classList.toggle("hidden", !loggedIn);
    statusPill.textContent = loggedIn ? "Admin" : "Public";
  }

  // LOGIN
  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value.trim();
    const password = prompt("Enter your Supabase password:");
    if (!email || !password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      alert("❌ Login failed: " + error.message);
      return;
    }
    loggedIn = !!data.session;
    updateAuthUI();
    loadData();
  };

  // LOGOUT
  logoutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    loadData();
  };

  // SAVE SETTINGS
  saveBtn.onclick = async () => {
    const title = document.getElementById("edit-title").value;
    const desc = document.getElementById("edit-desc").value;
    const accent = document.getElementById("edit-accent").value || "#16a34a";
    const background_url = document.getElementById("edit-bg").value;
    const logo_url = document.getElementById("edit-logo").value;

    const { error } = await supabaseClient.from("site_settings").upsert([{
      id: '00000000-0000-0000-0000-000000000001',
      title, description: desc, accent, background_url, logo_url
    }]);
    if (error) alert("❌ Save failed: " + error.message);
    else loadData();
  };

  // ADMIN NEW ITEM
  newItemBtn.onclick = async () => {
    const title = prompt("Post title:");
    if (!title) return;
    const desc = prompt("Post description:");
    const image_url = prompt("Image URL (optional):");

    const { error } = await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    if (error) alert("❌ Failed to post: " + error.message);
    else loadData();
  };

  // PUBLIC POST
  publicPostBtn.onclick = async () => {
    const title = prompt("Post title:");
    if (!title) return;
    const desc = prompt("Post description:");
    const image_url = prompt("Image URL (optional):");

    const { error } = await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    if (error) alert("❌ Public post failed: " + error.message);
    else loadData();
  };

  // LOAD DATA
  async function loadData() {
    // Site settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from("site_settings")
      .select("*")
      .eq("id", '00000000-0000-0000-0000-000000000001')
      .single();
    if (settingsError) console.error("Settings error:", settingsError);

    if (settings) {
      document.getElementById("site-title").textContent = settings.title;
      document.getElementById("site-desc").textContent = settings.description;
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

    // Items
    const { data: items, error: itemsError } = await supabaseClient
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });
    if (itemsError) console.error("Items error:", itemsError);
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
            const { error } = await supabaseClient.from("items").delete().eq("id", id);
            if (error) alert("❌ Delete failed: " + error.message);
            else loadData();
          }
        };
      });
    }
  }
});
