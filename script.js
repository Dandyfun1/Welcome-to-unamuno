const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let loggedIn = false;
let currentDate = new Date();

document.addEventListener("DOMContentLoaded", () => {
  const adminPanel = document.getElementById("admin-panel");
  const adminToggle = document.getElementById("admin-toggle");
  const adminClose = document.getElementById("admin-close");
  const loginArea = document.getElementById("login-area");
  const controlsArea = document.getElementById("controls-area");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const saveBtn = document.getElementById("save-changes");
  const newItemBtn = document.getElementById("new-item-btn");
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  const itemsGrid = document.getElementById("items-grid");
  const statusPill = document.getElementById("status-pill");
  const publicPostBtn = document.getElementById("public-post-btn");

  const calendarPanel = document.getElementById("calendar-panel");
  const calendarToggle = document.getElementById("calendar-toggle");
  const calendarClose = document.getElementById("calendar-close");
  const calendarEl = document.getElementById("calendar");
  const eventForm = document.getElementById("event-form");
  const eventDateEl = document.getElementById("event-date");
  const eventNote = document.getElementById("event-note");
  const saveEventBtn = document.getElementById("save-event");

  supabaseClient.auth.getSession().then(({ data }) => { loggedIn = !!data.session; updateAuthUI(); loadData(); });
  supabaseClient.auth.onAuthStateChange((_event, session) => { loggedIn = !!session; updateAuthUI(); loadData(); });

  function updateAuthUI() {
    loginArea.style.display = loggedIn ? "none" : "block";
    controlsArea.classList.toggle("hidden", !loggedIn);
    statusPill.textContent = loggedIn ? "Admin" : "Public";
  }

  adminToggle.onclick = () => { adminPanel.style.display = "block"; };
  adminClose.onclick = () => { adminPanel.style.display = "none"; };
  calendarToggle.onclick = () => { calendarPanel.style.display = "block"; renderCalendar(); };
  calendarClose.onclick = () => { calendarPanel.style.display = "none"; };

  loginBtn.onclick = async () => {
    const email = document.getElementById("pw-input").value.trim();
    const password = prompt("Password:");
    if (!email || !password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Login failed: " + error.message);
    loggedIn = true; updateAuthUI(); loadData();
  };

  logoutBtn.onclick = async () => { await supabaseClient.auth.signOut(); loggedIn = false; updateAuthUI(); adminPanel.style.display = "none"; };

  saveBtn.onclick = async () => {
    const title = document.getElementById("edit-title").value;
    const desc = document.getElementById("edit-desc").value;
    const accent = document.getElementById("edit-accent").value || "#1d4ed8";
    await supabaseClient.from("site_settings").upsert([{ id: "00000000-0000-0000-0000-000000000001", title, description: desc, accent }]);
    document.documentElement.style.setProperty("--accent", accent);
    loadData();
  };

  newItemBtn.onclick = async () => {
    const title = prompt("Post title:"); if (!title) return;
    const desc = prompt("Post description:");
    await supabaseClient.from("items").insert([{ title, description: desc }]);
    loadData();
  };

  publicPostBtn.onclick = async () => {
    const name = prompt("Your name:") || "Anonymous";
    const title = prompt("Post title:"); if (!title) return;
    const desc = prompt("Post description:");
    await supabaseClient.from("items").insert([{ title, description: desc, author: name }]);
    loadData();
  };

  searchBtn.onclick = async () => {
    const q = searchInput.value;
    let { data: items } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    renderItems(items || []);
  };

  async function loadData() {
    let { data: settings } = await supabaseClient.from("site_settings").select("*").eq("id","00000000-0000-0000-0000-000000000001").single();
    if (settings) {
      document.getElementById("site-title").textContent = settings.title;
      document.getElementById("site-desc").textContent = settings.description;
      document.getElementById("edit-title").value = settings.title;
      document.getElementById("edit-desc").value = settings.description;
      document.getElementById("edit-accent").value = settings.accent;
      document.documentElement.style.setProperty("--accent", settings.accent);
    }
    let { data: items } = await supabaseClient.from("items").select("*").order("created_at",{ascending:false});
    renderItems(items||[]);
    renderCalendar();
  }

  function renderItems(items) {
    itemsGrid.innerHTML = "";
    items.forEach(item=>{
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `<h3>${item.title}</h3><p>${item.description||""}</p><small>By: ${item.author||"Unknown"}</small>`+(loggedIn?`<button class="danger" data-id="${item.id}">Delete</button>`:"");
      itemsGrid.appendChild(div);
    });
    if (loggedIn) {
      itemsGrid.querySelectorAll(".danger").forEach(btn=>{ btn.onclick=async e=>{const id=e.target.getAttribute("data-id");await supabaseClient.from("items").delete().eq("id",id);loadData();}; });
    }
  }

  function renderCalendar() {
    calendarEl.innerHTML="";
    const year=currentDate.getFullYear();const month=currentDate.getMonth();
    const firstDay=new Date(year,month,1).getDay();const daysInMonth=new Date(year,month+1,0).getDate();
    for(let i=0;i<firstDay;i++){calendarEl.appendChild(document.createElement("div"));}
    for(let d=1;d<=daysInMonth;d++){const dayEl=document.createElement("div");dayEl.className="day";dayEl.textContent=d;if(d===new Date().getDate()&&month===new Date().getMonth())dayEl.classList.add("today");
      dayEl.onclick=()=>{eventForm.classList.remove("hidden");eventDateEl.textContent=`${d}/${month+1}/${year}`;saveEventBtn.onclick=async()=>{await supabaseClient.from("events").insert([{date:`${year}-${month+1}-${d}`,note:eventNote.value}]);renderCalendar();};};
      calendarEl.appendChild(dayEl);}
  }
});