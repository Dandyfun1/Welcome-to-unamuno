// 🔧 Replace with your Supabase project details
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;
let eventsCache = {};
let selectedDate = null;

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
  const bgFileInput = document.getElementById("bg-file-input");
  const logoFileInput = document.getElementById("logo-file-input");
  const bgDropzone = document.getElementById("bg-dropzone");
  const logoDropzone = document.getElementById("logo-dropzone");
  const publicPostBtn = document.getElementById("public-post-btn");

  // Calendar elements
  const calendarPanel = document.getElementById("calendar-panel");
  const calendarHeader = document.getElementById("calendar-header");
  const calendarToggle = document.getElementById("calendar-toggle");
  const calendarClose = document.getElementById("calendar-close");
  const calendarContainer = document.getElementById("calendar-container");
  const dayModal = document.getElementById("day-modal");
  const modalDayTitle = document.getElementById("modal-day-title");
  const modalNote = document.getElementById("modal-note");
  const modalSave = document.getElementById("modal-save");
  const modalClose = document.getElementById("modal-close");

  // ------------------ AUTH ------------------
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
    loginArea.style.display = loggedIn ? "none" : "block";
    controlsArea.classList.toggle("hidden", !loggedIn);
    statusPill.textContent = loggedIn ? "Admin" : "Public";
  }

  adminToggle.onclick = () => { adminPanel.style.display = "block"; updateAuthUI(); };
  adminClose.onclick = () => { adminPanel.style.display = "none"; };

  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value.trim();
    const password = prompt("Enter your Supabase password:");
    if (!email || !password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Login failed: " + error.message);
    loggedIn = !!data.session;
    updateAuthUI();
    loadData();
  };

  logoutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    loadData();
    adminPanel.style.display = "none";
  };

  // ------------------ SITE SETTINGS ------------------
  saveBtn.onclick = async () => {
    const title = document.getElementById("edit-title").value;
    const desc = document.getElementById("edit-desc").value;
    const accent = document.getElementById("edit-accent").value || "#16a34a";
    const background_url = document.getElementById("edit-bg").value;
    const logo_url = document.getElementById("edit-logo").value;
    await supabaseClient.from("site_settings").upsert([{
      id: '00000000-0000-0000-0000-000000000001',
      title, description: desc, accent, background_url, logo_url
    }]);
    loadData();
  };

  // ------------------ POSTS ------------------
  newItemBtn.onclick = async () => {
    const title = prompt("Post title:"); if (!title) return;
    const desc = prompt("Post description:");
    const image_url = prompt("Image URL (optional):");
    await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    loadData();
  };

  publicPostBtn.onclick = async () => {
    const title = prompt("Post title:"); if (!title) return;
    const desc = prompt("Post description:");
    const image_url = prompt("Image URL (optional):");
    const { error } = await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    if (error) alert("Failed to post: " + error.message);
  };

  searchBtn.onclick = async () => {
    const q = searchInput.value;
    let { data: items } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    renderItems(items || []);
  };

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

  // ------------------ UPLOAD HELPERS ------------------
  async function uploadFileToStorage(file, folder) {
    const path = `${folder}/${Date.now()}_${file.name}`;
    const { error } = await supabaseClient.storage.from("images").upload(path, file, { upsert: true });
    if (error) { alert("Upload failed: " + error.message); return null; }
    const { data } = supabaseClient.storage.from("images").getPublicUrl(path);
    return data.publicUrl;
  }

  function setupDropzone(dropzone, fileInput, type) {
    dropzone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async e => {
      const file = e.target.files[0]; if (!file) return;
      const url = await uploadFileToStorage(file, type);
      if (url) applyImage(type, url);
    });
    ["dragenter","dragover"].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.style.background="rgba(22,163,74,0.1)"; }));
    ["dragleave","drop"].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.style.background=""; }));
    dropzone.addEventListener("drop", async e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0]; if (!file) return;
      const url = await uploadFileToStorage(file, type);
      if (url) applyImage(type, url);
    });
  }

  function applyImage(type, url) {
    if (type === "backgrounds") {
      document.getElementById("edit-bg").value = url;
      document.body.style.backgroundImage = `url(${url})`;
      document.body.style.backgroundSize = "cover";
    } else if (type === "logos") {
      document.getElementById("edit-logo").value = url;
      const logoEl = document.getElementById("site-logo");
      logoEl.src = url; logoEl.style.display = "block";
    }
  }

  setupDropzone(bgDropzone, bgFileInput, "backgrounds");
  setupDropzone(logoDropzone, logoFileInput, "logos");

  // ------------------ DRAG ADMIN PANEL ------------------
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

  // ------------------ CALENDAR ------------------
  calendarToggle.onclick = () => { calendarPanel.style.display = "block"; renderCalendar(); loadEvents(); };
  calendarClose.onclick = () => { calendarPanel.style.display = "none"; };
  modalClose.onclick = () => { dayModal.style.display = "none"; };

  function renderCalendar(year = new Date().getFullYear(), month = new Date().getMonth()) {
    calendarContainer.innerHTML = "";
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    for (let d = 1; d <= daysInMonth; d++) {
      const dateISO = new Date(year, month, d).toISOString().slice(0, 10);
      const dayEl = document.createElement("div");
      dayEl.className = "day";
      if (eventsCache[dateISO]) dayEl.classList.add("red");
      dayEl.textContent = d;
      dayEl.onclick = () => openDayModal(dateISO);
      grid.appendChild(dayEl);
    }
    calendarContainer.appendChild(grid);
  }

  async function loadEvents() {
    const { data, error } = await supabaseClient.from("events").select("*");
    if (error) return console.error(error);
    eventsCache = {};
    data.forEach(e => { eventsCache[e.event_date] = e; });
    renderCalendar();
  }

  function openDayModal(dateISO) {
    selectedDate = dateISO;
    modalDayTitle.textContent = dateISO;
    modalNote.value = eventsCache[dateISO]?.note || "";
    dayModal.style.display = "block";
  }

  modalSave.onclick = async () => {
    if (!selectedDate) return;
    const note = modalNote.value.trim();
    const existing = eventsCache[selectedDate];
    if (existing) {
      await supabaseClient.from("events").update({ note }).eq("id", existing.id);
    } else if (note) {
      await supabaseClient.from("events").insert([{ event_date: selectedDate, note }]);
    }
    dayModal.style.display = "none";
    loadEvents();
  };

  supabaseClient.channel("events-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => loadEvents())
    .subscribe();

  // ------------------ LOAD ALL DATA ------------------
  async function loadData() {
    let { data: settings } = await supabaseClient.from("site_settings").select("*").eq("id", '00000000-0000-0000-0000-000000000001').single();
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
        logoEl.src = settings.logo_url; logoEl.style.display = "block";
      }
    }
    let { data: items } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    renderItems(items || []);
    loadEvents();
  }
});

