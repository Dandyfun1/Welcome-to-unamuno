```javascript
// Replace with your Supabase project details
const SUPABASE_URL = "https://YOURPROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedIn = false;
let currentYear = 2025;
let eventsCache = {};

document.addEventListener("DOMContentLoaded", () => {
  const itemsGrid = document.getElementById("items-grid");
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  const newPostBtn = document.getElementById("new-post-btn");
  const adminToggle = document.getElementById("admin-toggle");

  const calendarContainer = document.getElementById("calendar-container");
  const year2025Btn = document.getElementById("year-2025");
  const year2026Btn = document.getElementById("year-2026");
  const prevYearBtn = document.getElementById("prev-year");
  const nextYearBtn = document.getElementById("next-year");

  const modal = document.getElementById("day-modal");
  const modalDayTitle = document.getElementById("modal-day-title");
  const modalEventTitle = document.getElementById("modal-event-title");
  const modalEventNote = document.getElementById("modal-event-note");
  const modalSave = document.getElementById("modal-save");
  const modalDelete = document.getElementById("modal-delete");
  const modalClose = document.getElementById("modal-close");
  let selectedDateISO = null;
  let selectedEventId = null;

  // AUTH
  supabaseClient.auth.getSession().then(({ data }) => { loggedIn = !!data.session; loadAll(); });
  supabaseClient.auth.onAuthStateChange((_e, session) => { loggedIn = !!session; loadAll(); });

  adminToggle.onclick = async () => {
    if (!loggedIn) {
      const email = prompt("Admin email:");
      const password = prompt("Password:");
      if (!email || !password) return;
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    } else {
      if (confirm("Logout?")) await supabaseClient.auth.signOut();
    }
  };

  // POSTS
  async function loadPosts() {
    const { data } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    renderPosts(data || []);
  }
  function renderPosts(items) {
    itemsGrid.innerHTML = "";
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        ${item.image_url ? `<img src="${item.image_url}">` : ""}
        <h3>${item.title}</h3>
        <p>${item.description || ""}</p>
        ${loggedIn ? `<button class="danger" data-id="${item.id}">Delete</button>` : ""}
      `;
      itemsGrid.appendChild(div);
    });
    if (loggedIn) {
      itemsGrid.querySelectorAll(".danger").forEach(btn => {
        btn.onclick = async e => {
          const id = e.target.getAttribute("data-id");
          if (confirm("Delete post?")) await supabaseClient.from("items").delete().eq("id", id);
          loadPosts();
        };
      });
    }
  }
  searchBtn.onclick = async () => {
    const q = searchInput.value;
    const { data } = await supabaseClient.from("items").select("*").ilike("title", `%${q}%`);
    renderPosts(data || []);
  };
  newPostBtn.onclick = async () => {
    const title = prompt("Post title:");
    if (!title) return;
    const desc = prompt("Description:");
    const image_url = prompt("Image URL:");
    await supabaseClient.from("items").insert([{ title, description: desc, image_url }]);
    loadPosts();
  };

  // CALENDAR
  year2025Btn.onclick = () => { currentYear=2025; renderCalendar(); loadEvents(); };
  year2026Btn.onclick = () => { currentYear=2026; renderCalendar(); loadEvents(); };
  prevYearBtn.onclick = () => { currentYear--; renderCalendar(); loadEvents(); };
  nextYearBtn.onclick = () => { currentYear++; renderCalendar(); loadEvents(); };

  function renderCalendar() {
    calendarContainer.innerHTML = "";
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    for (let m=0;m<12;m++) {
      const title = document.createElement("div"); title.className="month-title"; title.textContent=`${months[m]} ${currentYear}`;
      calendarContainer.appendChild(title);
      const grid = document.createElement("div"); grid.className="calendar";
      const first=new Date(currentYear,m,1), daysIn=new Date(currentYear,m+1,0).getDate();
      for(let i=0;i<first.getDay();i++){grid.appendChild(document.createElement("div"));}
      for(let d=1;d<=daysIn;d++){
        const date=new Date(currentYear,m,d), iso=date.toISOString().slice(0,10);
        const el=document.createElement("div"); el.className="day"; el.dataset.iso=iso;
        el.innerHTML=`<div class="day-number">${d}</div><div class="event-dot" style="display:none"></div>`;
        el.onclick=()=>{ if(!loggedIn) return alert("Admin only"); openModal(iso); };
        grid.appendChild(el);
      }
      calendarContainer.appendChild(grid);
    }
    decorateEvents();
  }

  async function loadEvents() {
    const start=`${currentYear}-01-01`, end=`${currentYear}-12-31`;
    const { data } = await supabaseClient.from("events").select("*").gte("event_date",start).lte("event_date",end);
    eventsCache={};
    (data||[]).forEach(e=>{if(!eventsCache[e.event_date]) eventsCache[e.event_date]=[]; eventsCache[e.event_date].push(e);});
    decorateEvents();
  }
  function decorateEvents() {
    calendarContainer.querySelectorAll(".day").forEach(el=>{
      const iso=el.dataset.iso, dot=el.querySelector(".event-dot");
      if(loggedIn && eventsCache[iso]) dot.style.display="block"; else dot.style.display="none";
    });
  }
  function openModal(iso){
    selectedDateISO=iso; modalDayTitle.textContent=new Date(iso).toDateString();
    const evs=eventsCache[iso]||[]; if(evs.length>0){selectedEventId=evs[0].id; modalEventTitle.value=evs[0].title; modalEventNote.value=evs[0].note||""; modalDelete.style.display="inline-block";} else {selectedEventId=null; modalEventTitle.value=""; modalEventNote.value=""; modalDelete.style.display="none";}
    modal.classList.add("show");
  }
  modalClose.onclick=()=>modal.classList.remove("show");
  modalSave.onclick=async()=>{if(!modalEventTitle.value)return;
    if(selectedEventId) await supabaseClient.from("events").update({title:modalEventTitle.value,note:modalEventNote.value}).eq("id",selectedEventId);
    else await supabaseClient.from("events").insert([{event_date:selectedDateISO,title:modalEventTitle.value,note:modalEventNote.value}]);
    modal.classList.remove("show"); loadEvents();
  };
  modalDelete.onclick=async()=>{if(!selectedEventId)return;await supabaseClient.from("events").delete().eq("id",selectedEventId);modal.classList.remove("show");loadEvents();};

  // INIT
  function loadAll(){ loadPosts(); renderCalendar(); loadEvents(); }
});
```

