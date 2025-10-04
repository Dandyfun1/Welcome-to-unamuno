// Replace with your Supabase keys
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let loggedIn = false;
let eventsCache = [];
let calendarCursor = new Date();

document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = $("#search-btn");
  const searchInput = $("#search-input");
  const itemsGrid = $("#items-grid");
  const pinnedArea = $("#pinned-area");
  const notifications = $("#notifications");

  enableDrag("#admin-panel","#admin-drag");
  enableDrag("#calendar-panel","#calendar-drag");

  init();

  $("#login-btn")?.addEventListener("click", async () => {
    const email = ($("#pw-input")?.value || "").trim();
    if (!email) return alert("Introduce el email del admin.");
    const password = prompt("Introduce la contraseña:");
    if (!password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Error: " + error.message);
    loggedIn = !!data.session;
    updateAuthUI();
    await loadAll();
    toast("Sesión iniciada");
  });

  $("#logout-btn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    hidePanel("#admin-panel");
    toast("Sesión cerrada");
  });

  $("#search-btn")?.addEventListener("click", async () => {
    const q = (searchInput.value || "").trim();
    if (!q) return loadItems();
    const { data, error } = await supabaseClient
      .from("items")
      .select("*")
      .or(`title.ilike.%${q}%,description.ilike.%${q}%,username.ilike.%${q}%`)
      .order("pinned",{ascending:false})
      .order("created_at",{ascending:false});
    if (error) return alert("Error: " + error.message);
    renderItems(data || []);
  });

  $("#public-post-btn")?.addEventListener("click", async () => {
    const username = prompt("Tu nombre:") || "Anon";
    const title = prompt("Título:"); if (!title) return;
    const description = prompt("Descripción:") || null;
    const { error } = await supabaseClient.from("items").insert([{ title, description, username }]);
    if (error) return alert("Error: " + error.message);
    await loadItems();
    toast("Publicado");
  });

  $("#new-item-btn")?.addEventListener("click", async () => {
    if (!loggedIn) return alert("Solo admin.");
    const title = prompt("Título:"); if (!title) return;
    const username = prompt("Autor:") || "Admin";
    const description = prompt("Descripción:") || null;
    const { error } = await supabaseClient.from("items").insert([{ title, description, username }]);
    if (error) return alert("Error: " + error.message);
    await loadItems();
  });

  $("#save-changes")?.addEventListener("click", async () => {
    if (!loggedIn) return alert("Solo admin.");
    const title = $("#edit-title").value || "Clear Blue Blog";
    const sub = $("#edit-sub").value || "";
    const accent = $("#edit-accent").value || "#79c1d9";
    const logo = $("#edit-logo").value || null;
    const hero = $("#edit-hero").value || null;
    const { error } = await supabaseClient.from("site_settings").upsert([{
      id: "00000000-0000-0000-0000-000000000001",
      title, description: sub, accent, logo_url: logo, hero_url: hero
    }]);
    if (error) return alert("Error: " + error.message);
    document.documentElement.style.setProperty("--accent", accent);
    await loadSiteSettings();
    toast("Configuración guardada");
  });

  $("#dark-toggle")?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });

  async function init() {
    try {
      const { data } = await supabaseClient.auth.getSession();
      loggedIn = !!data?.session;
      updateAuthUI();
      await loadAll();
    } catch (e) { console.warn("init", e); }
  }

  function updateAuthUI() {
    $("#controls-area")?.classList.toggle("hidden", !loggedIn);
    $("#login-area").style.display = loggedIn ? "none" : "block";
  }

  async function loadAll() {
    await Promise.all([loadSiteSettings(), loadItems(), loadEvents()]);
  }

  async function loadSiteSettings() {
    const { data } = await supabaseClient.from("site_settings").select("*").eq("id","00000000-0000-0000-0000-000000000001").maybeSingle();
    if (!data) return;
    $("#site-title").textContent = data.title || "Clear Blue Blog";
    $("#site-sub").textContent = data.description || "";
    if (data.logo_url) $("#site-logo").src = data.logo_url;
    if (data.hero_url) document.body.style.backgroundImage = `url(${data.hero_url})`;
    document.documentElement.style.setProperty("--accent", data.accent || "#79c1d9");
  }

  async function loadItems() {
    const { data, error } = await supabaseClient.from("items").select("*").order("pinned",{ascending:false}).order("created_at",{ascending:false});
    if (error) return alert("Error cargando publicaciones: " + error.message);
    const pinned = (data||[]).filter(i=>i.pinned);
    const normal = (data||[]).filter(i=>!i.pinned);
    renderPinned(pinned); renderItems(normal);
  }

  function renderPinned(items=[]) {
    pinnedArea.innerHTML = "";
    items.forEach(item => {
      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = `<h3>📌 ${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description||"")}</p><div class="meta">${escapeHtml(item.username||"Anon")} • ${new Date(item.created_at).toLocaleString()}</div>`;
      pinnedArea.appendChild(el);
    });
  }

  function renderItems(items=[]) {
    itemsGrid.innerHTML = "";
    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description||"")}</p><div class="meta">${escapeHtml(item.username||"Anon")} • ${new Date(item.created_at).toLocaleString()}</div>`;
      itemsGrid.appendChild(card);
    });
  }

  async function loadEvents() {
    const { data } = await supabaseClient.from("calendar_events").select("*");
    eventsCache = data||[];
    renderCalendar(calendarCursor);
  }

  function renderCalendar(baseDate) {
    const calGrid = $("#calendar-grid");
    calGrid.innerHTML = "";
    $("#cal-title").textContent = baseDate.toLocaleString("es-ES",{month:"long",year:"numeric"});
    const year=baseDate.getFullYear(), month=baseDate.getMonth();
    const firstDay=new Date(year,month,1).getDay();
    const daysInMonth=new Date(year,month+1,0).getDate();
    for(let i=0;i<firstDay;i++) calGrid.appendChild(document.createElement("div"));
    for(let d=1;d<=daysInMonth;d++){
      const dateStr=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const ev=eventsCache.find(e=>e.event_date===dateStr);
      const dayEl=document.createElement("div");
      dayEl.className="day"; dayEl.textContent=d;
      if(ev) dayEl.classList.add("has-event");
      if(new Date(year,month,d).toDateString()===new Date().toDateString()) dayEl.classList.add("today");
      dayEl.onclick=()=>openEventPopup(dateStr,ev);
      calGrid.appendChild(dayEl);
    }
  }

  function openEventPopup(dateStr,ev){
    $("#event-popup").classList.remove("hidden");
    $("#event-date-title").textContent=new Date(dateStr).toLocaleDateString("es-ES");
    $("#event-details").innerHTML=ev?`<strong>${escapeHtml(ev.title||"")}</strong><p>${escapeHtml(ev.note||"")}</p>`:"<em>No hay evento</em>";
  }

  function toast(msg,t=3000){
    const el=document.createElement("div");
    el.className="toast"; el.textContent=msg;
    notifications.appendChild(el);
    setTimeout(()=>el.remove(),t);
  }

  function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function enableDrag(panelSel,handleSel){const p=$(panelSel),h=$(handleSel);if(!p||!h)return;let d=false,x=0,y=0;h.onmousedown=e=>{d=true;x=e.clientX-p.offsetLeft;y=e.clientY-p.offsetTop;};window.onmousemove=e=>{if(!d)return;p.style.left=e.clientX-x+"px";p.style.top=e.clientY-y+"px";};window.onmouseup=()=>d=false;}
});

