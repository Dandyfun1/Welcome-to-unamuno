// Supabase setup (replace with your project keys)
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;
let selectedDate = null;

const postsGrid = document.getElementById("items-grid");
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
const refreshPostsBtn = document.getElementById("refresh-posts");
const searchBtn = document.getElementById("search-btn");
const searchInput = document.getElementById("search-input");
const publicPostBtn = document.getElementById("public-post-btn");
const postModal = document.getElementById("post-modal");
const postSubmit = document.getElementById("post-submit");
const postCancel = document.getElementById("post-cancel");
const noteModal = document.getElementById("note-modal");
const noteDate = document.getElementById("note-date");
const noteText = document.getElementById("note-text");
const noteSave = document.getElementById("note-save");
const noteDelete = document.getElementById("note-delete");
const noteCancel = document.getElementById("note-cancel");
const calendarContainer = document.getElementById("calendar-container");
const miniCalendar = document.getElementById("mini-calendar");
const calMonth = document.getElementById("cal-month");
const calPrev = document.getElementById("cal-prev");
const calNext = document.getElementById("cal-next");

let currentMonth = new Date();

// Init session
supabaseClient.auth.getSession().then(({ data }) => {
  loggedIn = !!data.session;
  updateAuthUI();
  loadPosts();
  loadCalendar(currentMonth);
  loadMiniCalendar(new Date());
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  loggedIn = !!session;
  updateAuthUI();
});

function updateAuthUI() {
  loginArea.style.display = loggedIn ? "none" : "block";
  controlsArea.classList.toggle("hidden", !loggedIn);
  statusPill.textContent = loggedIn ? "Admin" : "Public";
}

// Admin toggle
adminToggle.onclick = () => { adminPanel.style.display = "block"; };
adminClose.onclick = () => { adminPanel.style.display = "none"; };

// Login
loginBtn.onclick = async () => {
  const email = document.getElementById("pw-input").value.trim();
  const password = prompt("Password:");
  if (!email || !password) return;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) { alert("Login failed:\n" + error.message); return; }
  loggedIn = true;
  updateAuthUI();
};

// Logout
logoutBtn.onclick = async () => {
  await supabaseClient.auth.signOut();
  loggedIn = false;
  updateAuthUI();
  adminPanel.style.display = "none";
};

// Save site settings
saveBtn.onclick = async () => {
  const title = document.getElementById("edit-title").value;
  const desc = document.getElementById("edit-desc").value;
  const accent = document.getElementById("edit-accent").value || "#16a34a";
  const logo = document.getElementById("edit-logo").value;
  await supabaseClient.from("site_settings").upsert([{ id:'00000000-0000-0000-0000-000000000001', title, description: desc, accent, logo_url: logo }]);
  document.getElementById("site-title").textContent = title;
  document.getElementById("site-desc").textContent = desc;
  document.documentElement.style.setProperty("--accent", accent);
  if (logo) { let l=document.getElementById("site-logo"); l.src=logo; l.style.display="block"; }
};

// Public posting modal
publicPostBtn.onclick = () => { postModal.classList.remove("hidden"); };
postCancel.onclick = () => { postModal.classList.add("hidden"); };
postSubmit.onclick = async () => {
  const title = document.getElementById("post-title").value;
  const desc = document.getElementById("post-desc").value;
  await supabaseClient.from("items").insert([{ title, description: desc }]);
  postModal.classList.add("hidden");
  loadPosts();
};

// Load posts
async function loadPosts() {
  let { data } = await supabaseClient.from("items").select("*").order("created_at",{ascending:false});
  postsGrid.innerHTML="";
  (data||[]).forEach(post=>{
    const div=document.createElement("div"); div.className="card";
    div.innerHTML=`<h3>${post.title}</h3><p>${post.description||""}</p>${loggedIn?`<button class='btn danger' data-id='${post.id}'>Borrar</button>`:""}`;
    postsGrid.appendChild(div);
  });
  if(loggedIn){ document.querySelectorAll(".danger").forEach(btn=>{
    btn.onclick=async e=>{ const id=e.target.getAttribute("data-id"); if(confirm("¿Borrar este post?")){await supabaseClient.from("items").delete().eq("id",id); loadPosts();} };
  });}
}
refreshPostsBtn.onclick=loadPosts;

// Search
searchBtn.onclick = async () => {
  const q=searchInput.value;
  let { data } = await supabaseClient.from("items").select("*").ilike("title",`%${q}%`);
  postsGrid.innerHTML=""; (data||[]).forEach(post=>{
    const div=document.createElement("div"); div.className="card"; div.innerHTML=`<h3>${post.title}</h3><p>${post.description||""}</p>`;
    postsGrid.appendChild(div);
  });
};

// Calendar functions
function renderCalendar(container,date,events) {
  container.innerHTML="";
  const year=date.getFullYear(); const month=date.getMonth();
  const firstDay=new Date(year,month,1).getDay(); const daysInMonth=new Date(year,month+1,0).getDate();
  const weekdays=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  weekdays.forEach(d=>{let el=document.createElement("div");el.textContent=d;el.style.fontWeight="600";container.appendChild(el);});
  for(let i=0;i<firstDay;i++){container.appendChild(document.createElement("div"));}
  for(let d=1;d<=daysInMonth;d++){ const fullDate=new Date(year,month,d).toISOString().split("T")[0];
    const div=document.createElement("div"); div.className="day"; div.textContent=d;
    const today=new Date(); if(d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear())div.classList.add("today");
    if(events.some(ev=>ev.date===fullDate))div.classList.add("has-note");
    div.onclick=()=>openNoteModal(fullDate,events.find(ev=>ev.date===fullDate));
    container.appendChild(div);
  }
}
async function loadCalendar(date){ let { data:events }=await supabaseClient.from("calendar_events").select("*"); renderCalendar(calendarContainer,date,events||[]); calMonth.textContent=date.toLocaleString("es-ES",{month:"long",year:"numeric"}); }
async function loadMiniCalendar(date){ let { data:events }=await supabaseClient.from("calendar_events").select("*"); renderCalendar(miniCalendar,date,events||[]); }

calPrev.onclick=()=>{ currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1); loadCalendar(currentMonth); };
calNext.onclick=()=>{ currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1); loadCalendar(currentMonth); };

function openNoteModal(dateStr,event){ selectedDate=dateStr; noteDate.textContent="Nota para "+dateStr; noteText.value=event?event.note:""; noteModal.classList.remove("hidden"); }
noteCancel.onclick=()=>{ noteModal.classList.add("hidden"); };
noteSave.onclick=async()=>{ if(!loggedIn){alert("Solo admin puede guardar notas");return;} await supabaseClient.from("calendar_events").upsert([{date:selectedDate,note:noteText.value}]); noteModal.classList.add("hidden"); loadCalendar(currentMonth); loadMiniCalendar(new Date()); };
noteDelete.onclick=async()=>{ if(!loggedIn)return; await supabaseClient.from("calendar_events").delete().eq("date",selectedDate); noteModal.classList.add("hidden"); loadCalendar(currentMonth); loadMiniCalendar(new Date()); };

// Tabs switching
document.querySelectorAll(".tab").forEach(tab=>{ tab.onclick=()=>{ document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active")); document.querySelectorAll(".tab-body").forEach(b=>b.classList.add("hidden")); tab.classList.add("active"); document.getElementById(tab.dataset.tab).classList.remove("hidden"); }; });

// Draggable admin panel
(function makeDraggable(){let dragging=false,offsetX=0,offsetY=0;adminHeader.addEventListener("mousedown",e=>{dragging=true;offsetX=e.clientX-adminPanel.offsetLeft;offsetY=e.clientY-adminPanel.offsetTop;document.body.style.userSelect="none";});window.addEventListener("mousemove",e=>{if(dragging){let x=e.clientX-offsetX;let y=e.clientY-offsetY;x=Math.max(0,Math.min(window.innerWidth-adminPanel.offsetWidth,x));y=Math.max(0,Math.min(window.innerHeight-adminPanel.offsetHeight,y));adminPanel.style.left=x+"px";adminPanel.style.top=y+"px";adminPanel.style.right="auto";}});window.addEventListener("mouseup",()=>{dragging=false;document.body.style.userSelect="";});})();
