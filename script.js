/* script.js — full module
   Firebase v12.6.0 (Auth, Firestore, Storage)
   Features:
   - Shared presentations (links + file uploads)
   - Presentation preview modal
   - Delete presentation (FireStore doc)
   - Shared calendar (add/edit/delete events)
   - Settings modal: background via URL or upload (saved to Firestore)
   - Anonymous + Google sign-in
   - Export/Import JSON
*/

/* ========= Firebase imports (v12.6.0) ========= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  doc, deleteDoc, setDoc, serverTimestamp, getDoc, getDocs, where
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

/* ========= Firebase config (your project) =========
   Replace values if you want another project; these are from your earlier message.
*/
const firebaseConfig = {
  apiKey: "AIzaSyAPS7PPLTTGHFelB7ai4xfRhuQpK6_jRyY",
  authDomain: "namuno-website.firebaseapp.com",
  projectId: "namuno-website",
  storageBucket: "namuno-website.firebasestorage.app",
  messagingSenderId: "594989409142",
  appId: "1:594989409142:web:6de3c24fa279cccb005057",
  measurementId: "G-Y2LP9ZLQ21"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* ========= Auth (anonymous by default) ========= */
signInAnonymously(auth).catch(err => console.warn("Auth error:", err));
let currentUser = null;
onAuthStateChanged(auth, user => {
  currentUser = user;
  refreshUserUI();
});

/* ========= Helpers ========= */
function escapeHtml(s=""){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }
function extractSlidesId(url){ const m = url.match(/\/d\/([A-Za-z0-9_-]+)/); return m?m[1]:null; }
function toEmbedUrl(url){ const id = extractSlidesId(url); if(id) return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000`; if(url.includes("/embed")) return url; return null; }

/* ========= DOM elements ========= */
const presentationsEl = document.getElementById("presentations");
const addPresentationBtn = document.getElementById("add-presentation");
const slidesLinkInput = document.getElementById("slides-link");
const fileInput = document.getElementById("file-input");
const dragArea = document.getElementById("drag-area");

const openCalendarBtn = document.getElementById("open-calendar");
const calendarModal = document.getElementById("calendar-modal");
const calendarEl = document.getElementById("calendar");
const monthLabel = document.getElementById("month-label");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const todayBtn = document.getElementById("today-btn");

const presentationModal = document.getElementById("presentation-modal");
const presentationBody = document.getElementById("presentation-body");
const presentationOpen = document.getElementById("presentation-open");

const dayModal = document.getElementById("day-modal");
const dayDateEl = document.getElementById("day-date");
const dayEventsList = document.getElementById("day-events");
const saveEventBtn = document.getElementById("save-event");

const settingsModal = document.getElementById("settings-modal");
const themeDarkBtn = document.getElementById("theme-dark");
const themeLightBtn = document.getElementById("theme-light");
const bgPreviewBtn = document.getElementById("bg-preview-btn");
const bgApplyBtn = document.getElementById("bg-apply-btn");
const bgResetBtn = document.getElementById("bg-reset-btn");
const bgInput = document.getElementById("bg-url");
const bgFileInput = document.getElementById("bg-file");
const bgUploadBtn = document.getElementById("bg-upload-btn");
const bgPreview = document.getElementById("bg-preview");

const profileNameInput = document.getElementById("profile-name");
const profileAvatarUrlInput = document.getElementById("profile-avatar-url");
const saveProfileBtn = document.getElementById("save-profile");

const btnSignInGoogle = document.getElementById("btn-signin-google");
const btnSignInGoogle2 = document.getElementById("btn-signin-google-2");
const btnSignOut = document.getElementById("btn-signout");
const btnAnon = document.getElementById("btn-anon");

const exportBtn = document.getElementById("export-data");
const importFile = document.getElementById("import-file");

const userAvatarImg = document.getElementById("user-avatar");
const userNameSpan = document.getElementById("user-name");

/* ========= Modal helpers ========= */
function openModal(id){ document.getElementById(id).style.display = "flex"; }
function closeModal(id){ document.getElementById(id).style.display = "none"; }
document.querySelectorAll(".close-modal").forEach(btn => btn.addEventListener("click", ()=> {
  const id = btn.dataset.close; if(id) closeModal(id);
}));
window.onclick = e => { if(e.target.classList.contains("modal")) e.target.style.display = "none"; };

/* ========= Auth handlers ========= */
btnSignInGoogle?.addEventListener("click", async ()=> {
  const provider = new GoogleAuthProvider();
  try{ const res = await signInWithPopup(auth, provider); currentUser = res.user; refreshUserUI(); }catch(e){ console.error(e); alert("Error Google sign-in"); }
});
btnSignInGoogle2?.addEventListener("click", async ()=> {
  const provider = new GoogleAuthProvider();
  try{ const res = await signInWithPopup(auth, provider); currentUser = res.user; refreshUserUI(); }catch(e){ console.error(e); alert("Error Google sign-in"); }
});
btnAnon?.addEventListener("click", async ()=> { try{ await signInAnonymously(auth); alert("Sesión anónima iniciada"); }catch(e){ console.warn(e); } });
btnSignOut?.addEventListener("click", async ()=> { try{ await signOut(auth); await signInAnonymously(auth); }catch(e){ console.warn(e); } });

function refreshUserUI(){
  const local = JSON.parse(localStorage.getItem("local_profile")||"{}");
  const name = local.name || (currentUser && currentUser.displayName) || "Invitado";
  const avatar = local.avatar || (currentUser && currentUser.photoURL) || "";
  userNameSpan.textContent = name;
  userAvatarImg.src = avatar || "";
}

/* ========= Local profile ========= */
saveProfileBtn?.addEventListener("click", ()=> {
  const name = profileNameInput.value.trim();
  const avatar = profileAvatarUrlInput.value.trim();
  localStorage.setItem("local_profile", JSON.stringify({ name, avatar }));
  refreshUserUI();
  alert("Perfil guardado (local)");
});

/* ========= Presentations (Firestore + Storage) ========= */
const PRESENT_COLLECTION = "presentations";
const EVENTS_COLLECTION = "events_by_date";
const META_COLLECTION = "site_meta";
const SITE_SETTINGS_ID = "site_settings";

const presentationsRef = collection(db, PRESENT_COLLECTION);
const qPresent = query(presentationsRef, orderBy("createdAt","desc"));

onSnapshot(qPresent, snapshot => {
  const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderPresentations(list);
});

function renderPresentations(list){
  presentationsEl.innerHTML = "";
  if(list.length === 0){
    presentationsEl.innerHTML = `<div class="muted">No hay presentaciones compartidas aún.</div>`;
    return;
  }
  list.forEach(item => {
    const card = document.createElement("div"); card.className = "presentation-card";
    let previewHtml = "";
    if(item.type === "link") previewHtml = `<iframe class="frame" src="${toEmbedUrl(item.url)}" loading="lazy"></iframe>`;
    else if(item.type === "pdf") previewHtml = `<iframe class="frame" src="${item.storageUrl}" loading="lazy"></iframe>`;
    else if(item.type === "pptx") previewHtml = `<iframe class="frame" src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.storageUrl)}" loading="lazy"></iframe>`;
    else previewHtml = `<div style="padding:40px;text-align:center">Vista previa no disponible</div>`;

    const uploaderName = escapeHtml(item.uploaderName || "Usuario");
    const avatar = item.uploaderPhoto || "";
    const title = escapeHtml(item.title || item.fileName || "Presentación");

    card.innerHTML = `
      ${previewHtml}
      <div class="card-actions">
        <div class="card-meta">
          <img src="${avatar}" alt="u" onerror="this.style.display='none'"/>
          <div>
            <div class="title">${title}</div>
            <div style="font-size:12px;color:#666">${uploaderName}</div>
          </div>
        </div>

        <div class="right">
          <button class="btn" data-open="${item.id}" title="Vista"><i class="fas fa-eye"></i></button>
          <a class="btn primary" href="${item.url || item.storageUrl}" target="_blank" rel="noopener" title="Abrir"><i class="fas fa-external-link-alt"></i></a>
          <button class="btn ghost" data-delete="${item.id}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
    `;
    presentationsEl.appendChild(card);
  });

  presentationsEl.querySelectorAll("[data-open]").forEach(btn=>{
    btn.addEventListener("click", async ()=> {
      const id = btn.dataset.open;
      const snap = await getDoc(doc(db, PRESENT_COLLECTION, id));
      if(!snap.exists()) return alert("No encontrado");
      const item = snap.data();
      let embed = "";
      if(item.type === "link") embed = toEmbedUrl(item.url);
      else if(item.type === "pdf") embed = item.storageUrl;
      else if(item.type === "pptx") embed = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.storageUrl)}`;
      presentationBody.innerHTML = `<iframe src="${embed}" style="width:100%;height:70vh;border:0"></iframe>`;
      presentationOpen.href = item.url || item.storageUrl || "#";
      openModal("presentation-modal");
    });
  });

  presentationsEl.querySelectorAll("[data-delete]").forEach(btn=>{
    btn.addEventListener("click", async ()=> {
      const id = btn.dataset.delete;
      if(!confirm("Eliminar esta presentación públicamente?")) return;
      try{
        const snap = await getDoc(doc(db, PRESENT_COLLECTION, id));
        const item = snap.exists()? snap.data() : null;
        // delete Firestore doc
        await deleteDoc(doc(db, PRESENT_COLLECTION, id));
        // optionally delete storage file if existed (requires storage rules / permission)
        if(item && item.storagePath){
          try{ await deleteObject(storageRef(storage, item.storagePath)); } catch(e){ console.warn("Storage delete failed:", e); }
        }
      }catch(e){ console.error(e); alert("Error eliminando"); }
    });
  });
}

/* Add presentation by link */
addPresentationBtn.addEventListener("click", async ()=> {
  const raw = slidesLinkInput.value.trim();
  if(!raw) return alert("Pega la URL de Google Slides");
  const id = extractSlidesId(raw);
  if(!id) return alert("Enlace inválido");
  const titleCandidate = (raw.match(/\/d\/[A-Za-z0-9_-]+\/([^?\/]+)/) || [null,''])[1] || "";
  const local = JSON.parse(localStorage.getItem("local_profile")||"{}");
  await addDoc(collection(db, PRESENT_COLLECTION), {
    type: "link",
    url: raw,
    title: titleCandidate || "",
    createdAt: serverTimestamp(),
    uploader: currentUser?.uid || null,
    uploaderName: local.name || currentUser?.displayName || null,
    uploaderPhoto: local.avatar || currentUser?.photoURL || null
  });
  slidesLinkInput.value = "";
});

/* File upload for presentations */
function uploadPresentationFile(file){
  const allowed = ["application/pdf","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/vnd.ms-powerpoint"];
  if(!allowed.includes(file.type)) return alert("Formato no soportado (usa PDF o PPTX)");
  const path = `presentations/${Date.now()}_${file.name}`;
  const r = storageRef(storage, path);
  uploadBytes(r, file).then(async ()=> {
    const url = await getDownloadURL(r);
    const local = JSON.parse(localStorage.getItem("local_profile")||"{}");
    const type = file.type === "application/pdf" ? "pdf" : "pptx";
    await addDoc(collection(db, PRESENT_COLLECTION), {
      type,
      storagePath: path,
      storageUrl: url,
      fileName: file.name,
      createdAt: serverTimestamp(),
      uploader: currentUser?.uid || null,
      uploaderName: local.name || currentUser?.displayName || null,
      uploaderPhoto: local.avatar || currentUser?.photoURL || null
    });
    alert("Subida completa y publicada.");
  }).catch(e => { console.error(e); alert("Error al subir"); });
}

fileInput.addEventListener("change", e => { const f = e.target.files[0]; if(f) uploadPresentationFile(f); });
dragArea.addEventListener("dragover", e => { e.preventDefault(); dragArea.classList.add("dragover"); });
dragArea.addEventListener("dragleave", e => { e.preventDefault(); dragArea.classList.remove("dragover"); });
dragArea.addEventListener("drop", e => { e.preventDefault(); dragArea.classList.remove("dragover"); const f = e.dataTransfer.files[0]; if(f) uploadPresentationFile(f); });

/* ========= Calendar (shared) ========= */
const eventsRef = collection(db, EVENTS_COLLECTION);
onSnapshot(eventsRef, snap => {
  window._sharedEvents = {};
  snap.forEach(s => window._sharedEvents[s.id] = s.data().items || []);
  renderCalendarView();
});

let view = { year: new Date().getFullYear(), month: new Date().getMonth() };
function ymd(y,m,d){ return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

function renderCalendarView(){
  calendarEl.innerHTML = "";
  const monthName = new Date(view.year, view.month).toLocaleString('es-ES',{month:'long',year:'numeric'});
  monthLabel.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const days = ['L','M','X','J','V','S','D'];
  days.forEach(d => { const el = document.createElement('div'); el.textContent = d; el.style.fontWeight='700'; el.style.textAlign='center'; calendarEl.appendChild(el); });

  const first = new Date(view.year, view.month, 1);
  const offset = (first.getDay() + 6) % 7;
  for(let i=0;i<offset;i++) calendarEl.appendChild(document.createElement('div'));

  const total = new Date(view.year, view.month+1, 0).getDate();
  for(let d=1; d<=total; d++){
    const dateStr = ymd(view.year, view.month+1, d);
    const cell = document.createElement('div'); cell.className='day-cell'; cell.innerHTML = `<div class="day-num">${d}</div>`;
    const items = window._sharedEvents?.[dateStr] || [];
    if(items.length){ const dot = document.createElement('div'); dot.className='events-dot'; dot.textContent = items.length + (items.length>1?' eventos':' evento'); cell.appendChild(dot); }
    cell.addEventListener('click', ()=> openDayModal(dateStr));
    calendarEl.appendChild(cell);
  }
}

document.getElementById('open-calendar').addEventListener('click', ()=> { openModal('calendar-modal'); renderCalendarView(); });
prevMonthBtn.addEventListener('click', ()=> { view.month--; if(view.month<0){ view.month=11; view.year--; } renderCalendarView(); });
nextMonthBtn.addEventListener('click', ()=> { view.month++; if(view.month>11){ view.month=0; view.year++; } renderCalendarView(); });
todayBtn.addEventListener('click', ()=> { const n=new Date(); view.year=n.getFullYear(); view.month=n.getMonth(); renderCalendarView(); });

/* Day modal: view/add/edit events for a date */
let currentDay = null;
function openDayModal(dateStr){ currentDay = dateStr; dayDateEl.textContent = dateStr; loadDayEvents(); openModal('day-modal'); }

async function loadDayEvents(){
  dayEventsList.innerHTML = "";
  const ref = doc(db, EVENTS_COLLECTION, currentDay);
  const snap = await getDoc(ref);
  const items = snap.exists()? (snap.data().items || []) : [];
  if(items.length === 0){ dayEventsList.innerHTML = `<li class="muted">Sin eventos para este día.</li>`; return; }

  items.forEach((ev, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<div><div class="title">${escapeHtml(ev.title)}</div><div class="muted" style="font-size:13px">${escapeHtml(ev.notes||'')}</div></div>
                    <div class="actions"><button class="btn small" data-edit="${idx}">Editar</button><button class="btn ghost small" data-del="${idx}">Eliminar</button></div>`;
    dayEventsList.appendChild(li);
  });

  dayEventsList.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async ()=> {
      const idx = parseInt(btn.dataset.del,10);
      const ref = doc(db, EVENTS_COLLECTION, currentDay);
      const snap = await getDoc(ref);
      if(!snap.exists()) return;
      const items = snap.data().items || [];
      items.splice(idx,1);
      await setDoc(ref, { items }, { merge: true });
      loadDayEvents();
    });
  });

  dayEventsList.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', async ()=> {
      const idx = parseInt(btn.dataset.edit,10);
      const ref = doc(db, EVENTS_COLLECTION, currentDay);
      const snap = await getDoc(ref);
      const items = snap.exists()? (snap.data().items || []) : [];
      const ev = items[idx];
      document.getElementById('event-title').value = ev.title || '';
      document.getElementById('event-notes').value = ev.notes || '';
      document.getElementById('event-color').value = ev.color || '#1e6ed8';
      saveEventBtn._editingIndex = idx;
    });
  });
}

saveEventBtn.addEventListener('click', async ()=> {
  const title = document.getElementById('event-title').value.trim();
  if(!title) return alert('Pon un título al evento');
  const notes = document.getElementById('event-notes').value.trim();
  const color = document.getElementById('event-color').value || '#1e6ed8';
  const ref = doc(db, EVENTS_COLLECTION, currentDay);
  const snap = await getDoc(ref);
  const items = snap.exists()? (snap.data().items || []) : [];
  if(typeof saveEventBtn._editingIndex === 'number'){
    items[saveEventBtn._editingIndex] = { title, notes, color, updatedAt: serverTimestamp() };
    delete saveEventBtn._editingIndex;
  } else {
    items.push({ title, notes, color, createdAt: serverTimestamp(), uid: currentUser?.uid || null });
  }
  await setDoc(ref, { items }, { merge: true });
  document.getElementById('event-title').value = '';
  document.getElementById('event-notes').value = '';
  document.getElementById('event-color').value = '#1e6ed8';
  loadDayEvents();
});

/* ========= Site settings: shared background & theme ========= */
const metaRef = doc(db, META_COLLECTION, SITE_SETTINGS_ID);

async function loadSiteSettings(){
  try{
    const snap = await getDoc(metaRef);
    if(snap.exists()){
      const data = snap.data();
      if(data.theme) document.body.classList.toggle('light', data.theme === 'light');
      if(data.background) { document.body.style.backgroundImage = `url("${data.background}")`; document.body.style.backgroundSize = 'cover'; }
    } else {
      const local = JSON.parse(localStorage.getItem('site_settings') || '{}');
      if(local.theme) document.body.classList.toggle('light', local.theme === 'light');
      if(local.background) document.body.style.backgroundImage = `url("${local.background}")`;
    }
  }catch(e){ console.warn("meta load", e); }
}
loadSiteSettings();

themeLightBtn.addEventListener('click', async ()=> { document.body.classList.add('light'); await setDoc(metaRef, { theme: 'light' }, { merge: true }); });
themeDarkBtn.addEventListener('click', async ()=> { document.body.classList.remove('light'); await setDoc(metaRef, { theme: 'dark' }, { merge: true }); });

bgPreviewBtn.addEventListener('click', ()=> {
  const url = bgInput.value.trim();
  if(!url) return alert('Pega una URL válida');
  bgPreview.style.backgroundImage = `url("${url}")`; bgPreview.style.backgroundSize = 'cover';
});
bgApplyBtn.addEventListener('click', async ()=> {
  const url = bgInput.value.trim(); if(!url) return alert('Pega una URL válida');
  await setDoc(metaRef, { background: url }, { merge: true }); document.body.style.backgroundImage = `url("${url}")`; alert('Fondo compartido aplicado');
});
bgResetBtn.addEventListener('click', async ()=> { await setDoc(metaRef, { background: "" }, { merge: true }); document.body.style.backgroundImage = ""; bgPreview.style.backgroundImage = ""; bgPreview.textContent = 'Vista previa'; });

bgUploadBtn.addEventListener('click', async ()=> {
  const file = bgFileInput.files[0];
  if(!file) return alert('Selecciona un archivo');
  const path = `backgrounds/${Date.now()}_${file.name}`;
  const r = storageRef(storage, path);
  try{
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    await setDoc(metaRef, { background: url }, { merge: true });
    document.body.style.backgroundImage = `url("${url}")`;
    alert('Fondo subido y aplicado');
  }catch(e){ console.error(e); alert('Error subiendo fondo'); }
});

/* ========= Export / Import ========= */
exportBtn?.addEventListener('click', async ()=> {
  const presSnap = await getDocs(collection(db, PRESENT_COLLECTION));
  const evSnap = await getDocs(collection(db, EVENTS_COLLECTION));
  const metaSnap = await getDoc(metaRef);
  const data = {
    presentations: presSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    events: evSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    meta: metaSnap.exists()? metaSnap.data() : {}
  };
  const blob = new Blob([JSON.stringify(data,null,2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'site-export.json'; a.click();
});

importFile?.addEventListener('change', async (e)=> {
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = async ()=> {
    try{
      const json = JSON.parse(reader.result);
      if(Array.isArray(json.presentations)){
        for(const p of json.presentations){
          const q = query(collection(db, PRESENT_COLLECTION), where("url","==",p.url || p.storageUrl));
          const existing = await getDocs(q);
          if(existing.empty) await addDoc(collection(db, PRESENT_COLLECTION), { ...p, createdAt: serverTimestamp() });
        }
      }
      if(Array.isArray(json.events)){
        for(const ed of json.events) await setDoc(doc(db, EVENTS_COLLECTION, ed.id), { items: ed.items || [] }, { merge: true });
      }
      if(json.meta) await setDoc(metaRef, json.meta, { merge: true });
      alert('Importación completada');
    }catch(err){ console.error(err); alert('Error importando'); }
  };
  reader.readAsText(f);
});

/* ========= Initial UI refresh ========= */
refreshUserUI();

/* End of script.js */
