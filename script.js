// ---------- POPUP HANDLING ----------
document.querySelectorAll(".feature-card").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const id = btn.id.replace("open-","")+"-popup";
    document.getElementById(id).style.display="block";
  });
});
document.querySelectorAll(".close").forEach(c=>c.onclick=()=>c.closest(".modal").style.display="none");
window.onclick=e=>{if(e.target.classList.contains("modal"))e.target.style.display="none";};

// ---------- PRESENTATIONS ----------
const linkInput=document.getElementById("slides-link");
const addBtn=document.getElementById("add-presentation");
const container=document.getElementById("presentations");
let presentations=JSON.parse(localStorage.getItem("presentations")||"[]");

function renderPresentations(){
  container.innerHTML="";
  presentations.forEach(url=>{
    const embed=url.replace(/\/edit.*$/,"/embed");
    const card=document.createElement("div");
    card.className="presentation-card";
    card.innerHTML=`<iframe src="${embed}" allowfullscreen></iframe>
      <a href="${url}" target="_blank"><i class="fas fa-external-link-alt"></i> Abrir</a>`;
    container.appendChild(card);
  });
}
addBtn.onclick=()=>{
  const link=linkInput.value.trim();
  if(!link.includes("docs.google.com/presentation")) return alert("Enlace inválido");
  presentations.push(link);
  localStorage.setItem("presentations",JSON.stringify(presentations));
  linkInput.value="";
  renderPresentations();
};
renderPresentations();

// ---------- CALENDAR ----------
const calEl=document.getElementById("calendar");
const monthYear=document.getElementById("month-year");
const prev=document.getElementById("prev-month");
const next=document.getElementById("next-month");
let date=new Date();
let events=JSON.parse(localStorage.getItem("events")||"{}");

function renderCalendar(){
  calEl.innerHTML="";
  const month=date.getMonth(), year=date.getFullYear();
  monthYear.textContent=date.toLocaleString("es",{month:"long",year:"numeric"});
  const first=new Date(year,month,1);
  const last=new Date(year,month+1,0);
  const offset=(first.getDay()+6)%7;
  const days=["L","M","X","J","V","S","D"];
  days.forEach(d=>{
    const el=document.createElement("div");el.textContent=d;
    el.style.fontWeight="bold";calEl.appendChild(el);
  });
  for(let i=0;i<offset;i++)calEl.appendChild(document.createElement("div"));
  for(let d=1;d<=last.getDate();d++){
    const cell=document.createElement("div");
    const ds=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cell.className="day"+(events[ds]?" event":"");
    cell.textContent=d;
    cell.onclick=()=>alert(events[ds]?events[ds].join("\n"):"Sin eventos");
    calEl.appendChild(cell);
  }
}
renderCalendar();
prev.onclick=()=>{date.setMonth(date.getMonth()-1);renderCalendar();}
next.onclick=()=>{date.setMonth(date.getMonth()+1);renderCalendar();}
document.getElementById("add-event").onclick=()=>{
  const d=document.getElementById("event-date").value;
  const t=document.getElementById("event-title").value.trim();
  if(!d||!t)return alert("Completa los campos");
  events[d]=events[d]||[];
  events[d].push(t);
  localStorage.setItem("events",JSON.stringify(events));
  renderCalendar();
  document.getElementById("event-date").value="";
  document.getElementById("event-title").value="";
};

// ---------- SETTINGS ----------
const light=document.getElementById("light-theme");
const dark=document.getElementById("dark-theme");
const bgInput=document.getElementById("background-url");
const setBg=document.getElementById("set-background");
const resetBg=document.getElementById("reset-background");

function applySettings(){
  const theme=localStorage.getItem("theme")||"light";
  document.body.classList.toggle("dark",theme==="dark");
  const bg=localStorage.getItem("background");
  document.body.style.backgroundImage=bg?`url('${bg}')`:"";
  document.body.style.backgroundSize="cover";
  document.body.style.backgroundPosition="center";
}
light.onclick=()=>{localStorage.setItem("theme","light");applySettings();}
dark.onclick=()=>{localStorage.setItem("theme","dark");applySettings();}
setBg.onclick=()=>{
  const url=bgInput.value.trim();
  if(url){localStorage.setItem("background",url);applySettings();}
};
resetBg.onclick=()=>{localStorage.removeItem("background");applySettings();}
applySettings();
