// Supabase config
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;
let currentCalendarDate = new Date();
let selectedNoteDate = null;

const $ = (s)=>document.querySelector(s);

document.addEventListener('DOMContentLoaded', () => {
  const adminPanel = $('#admin-panel');
  const adminToggle = $('#admin-toggle');
  const adminClose = $('#admin-close');
  const loginBtn = $('#login-btn');
  const logoutBtn = $('#logout-btn');
  const loginArea = $('#login-area');
  const controlsArea = $('#controls-area');
  const saveBtn = $('#save-changes');
  const newItemBtn = $('#new-item-btn');
  const publicPostBtn = $('#public-post-btn');
  const postModal = $('#post-modal');
  const postSubmit = $('#post-submit');
  const postCancel = $('#post-cancel');
  const itemsGrid = $('#items-grid');
  const searchBtn = $('#search-btn');
  const searchInput = $('#search-input');
  const miniCalendar = $('#mini-calendar');
  const openFullCalendar = $('#open-full-calendar');
  const fullCalendarModal = $('#calendar-modal');
  const calendarClose = $('#calendar-close');
  const fullCalendarGrid = $('#full-calendar-grid');
  const fullPrev = $('#full-cal-prev');
  const fullNext = $('#full-cal-next');
  const noteModal = $('#note-modal');
  const noteDate = $('#note-date');
  const noteText = $('#note-text');
  const noteSave = $('#note-save');
  const noteDelete = $('#note-delete');
  const noteCancel = $('#note-cancel');

  // session init
  supabaseClient.auth.getSession().then(({data})=>{
    loggedIn = !!data.session;
    updateAuthUI();
    loadPosts();
    renderMiniCalendar(new Date());
  });

  supabaseClient.auth.onAuthStateChange((_e, session)=>{
    loggedIn = !!session;
    updateAuthUI();
    loadPosts();
  });

  function updateAuthUI(){
    loginArea.style.display = loggedIn? "none":"block";
    controlsArea?.classList.toggle("hidden", !loggedIn);
    document.getElementById("status-pill").textContent = loggedIn? "Admin":"Public";
  }

  // Admin Panel
  adminToggle.onclick = ()=>{ adminPanel.style.display="block"; };
  adminClose.onclick = ()=>{ adminPanel.style.display="none"; };
  loginBtn.onclick = async ()=>{
    const email = document.getElementById("pw-input").value.trim();
    const password = prompt("Password:");
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if(error) return alert(error.message);
    loggedIn = !!data.session; updateAuthUI(); loadPosts();
  };
  logoutBtn.onclick = async ()=>{
    await supabaseClient.auth.signOut(); loggedIn=false; updateAuthUI(); adminPanel.style.display="none";
  };

  // Save site settings
  saveBtn.onclick = async ()=>{
    const title = document.getElementById("edit-title").value;
    const desc = document.getElementById("edit-desc").value;
    const accent = document.getElementById("edit-accent").value || "#16a34a";
    const logo = document.getElementById("edit-logo").value;
    await supabaseClient.from("site_settings").upsert([{id:'00000000-0000-0000-0000-000000000001',title,description:desc,accent,logo_url:logo}]);
    document.documentElement.style.setProperty("--accent", accent);
  };

  // Public Post
  publicPostBtn.onclick = ()=> postModal.classList.remove("hidden");
  postCancel.onclick = ()=> postModal.classList.add("hidden");
  postSubmit.onclick = async ()=>{
    const title = document.getElementById("post-title").value;
    const desc = document.getElementById("post-desc").value;
    const { error } = await supabaseClient.from("items").insert([{title, description:desc}]);
    if(error) return alert(error.message);
    postModal.classList.add("hidden"); loadPosts();
  };

  // Admin new post
  newItemBtn.onclick = async ()=>{
    const title = prompt("Post title:"); if(!title) return;
    const desc = prompt("Description:");
    await supabaseClient.from("items").insert([{title, description:desc}]);
    loadPosts();
  };

  // Search
  searchBtn.onclick = async ()=>{
    const q = searchInput.value;
    let {data} = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    renderItems(data);
  };

  async function loadPosts(){
    let {data} = await supabaseClient.from("items").select("*").order("created_at",{ascending:false});
    renderItems(data||[]);
  }

  function renderItems(items){
    itemsGrid.innerHTML="";
    (items||[]).forEach(it=>{
      const el=document.createElement("div"); el.className="card";
      el.innerHTML=`<h3>${it.title}</h3><p>${it.description||""}</p>`;
      if(loggedIn){
        const btn=document.createElement("button"); btn.textContent="Eliminar"; btn.className="danger";
        btn.onclick=async()=>{ await supabaseClient.from("items").delete().eq("id", it.id); loadPosts(); };
        el.appendChild(btn);
      }
      itemsGrid.appendChild(el);
    });
  }

  // Calendar
  openFullCalendar.onclick = ()=>{ renderFullCalendar(currentCalendarDate); fullCalendarModal.classList.remove("hidden"); };
  calendarClose.onclick = ()=> fullCalendarModal.classList.add("hidden");
  fullPrev.onclick = ()=>{ currentCalendarDate=new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth()-1,1); renderFullCalendar(currentCalendarDate); };
  fullNext.onclick = ()=>{ currentCalendarDate=new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth()+1,1); renderFullCalendar(currentCalendarDate); };

  noteCancel.onclick = ()=> noteModal.classList.add("hidden");
  noteSave.onclick = async ()=>{
    if(!selectedNoteDate) return;
    await supabaseClient.from("events").upsert([{event_date:selectedNoteDate, note:noteText.value}]);
    noteModal.classList.add("hidden"); renderFullCalendar(currentCalendarDate); renderMiniCalendar(new Date());
  };
  noteDelete.onclick = async ()=>{
    await supabaseClient.from("events").delete().eq("event_date", selectedNoteDate);
    noteModal.classList.add("hidden"); renderFullCalendar(currentCalendarDate); renderMiniCalendar(new Date());
  };

  async function renderFullCalendar(date){
    fullCalendarGrid.innerHTML="";
    const y=date.getFullYear(), m=date.getMonth();
    document.getElementById("full-cal-month").textContent=date.toLocaleString("es-ES",{month:"long",year:"numeric"});
    const days=new Date(y,m+1,0).getDate();
    const offset=(new Date(y,m,1).getDay()+6)%7;
    const {data} = await supabaseClient.from("events").select("*").gte("event_date",`${y}-${m+1}-01`).lte("event_date",`${y}-${m+1}-${days}`);
    const set=new Set((data||[]).map(e=>e.event_date));
    for(let i=0;i<offset;i++){ fullCalendarGrid.appendChild(document.createElement("div")); }
    for(let d=1;d<=days;d++){
      const iso=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const cell=document.createElement("div"); cell.className="day"; cell.textContent=d;
      if(set.has(iso)) cell.classList.add("red");
      cell.onclick=()=>{ selectedNoteDate=iso; noteDate.textContent="Nota: "+iso; noteText.value=(data||[]).find(e=>e.event_date===iso)?.note||""; noteModal.classList.remove("hidden"); };
      fullCalendarGrid.appendChild(cell);
    }
  }

  async function renderMiniCalendar(date){
    miniCalendar.innerHTML="";
    const y=date.getFullYear(), m=date.getMonth();
    const days=new Date(y,m+1,0).getDate();
    const offset=(new Date(y,m,1).getDay()+6)%7;
    const {data}=await supabaseClient.from("events").select("*").gte("event_date",`${y}-${m+1}-01`).lte("event_date",`${y}-${m+1}-${days}`);
    const set=new Set((data||[]).map(e=>e.event_date));
    for(let i=0;i<offset;i++) miniCalendar.appendChild(document.createElement("div"));
    for(let d=1;d<=days;d++){
      const iso=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const el=document.createElement("div"); el.className="mday"; el.textContent=d;
      if(set.has(iso)) el.classList.add("red");
      if(d===new Date().getDate()&&m===new Date().getMonth()&&y===new Date().getFullYear()) el.classList.add("today");
      miniCalendar.appendChild(el);
    }
  }
});
