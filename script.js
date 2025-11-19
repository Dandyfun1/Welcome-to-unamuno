/* --------------------------
   script.js (module)
   Firebase v12.6.0 (Auth, Firestore, Storage)
   All features: uploads, links, calendar, settings, auth
   -------------------------- */

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
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

/* ==============
   Replace with your firebase config (kept from earlier)
   ============== */
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

/* Anonymous sign-in by default */
signInAnonymously(auth).catch(err => console.warn("Auth error:", err));

let currentUser = null;
onAuthStateChanged(auth, user => {
  currentUser = user;
  refreshUserUI(user);
});

/* Utility helpers */
function extractSlidesId(url){
  const m = url.match(/\/d\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
function toEmbedUrl(url){
  const id = extractSlidesId(url);
  if(id) return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000`;
  if(url.includes("/embed")) return url;
  return null;
}
function escapeHtml(s=""){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

/* DOM elements */
const presentationsEl = document.getElementById("presentations");
const addPresentationBtn = document.getElementById("add-presentation");
const slidesLinkInput = document.getElementById("slides-link");
const fileInput = document.getElementById("file-input");
const uploadArea = document.getElementById("upload-area");

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

/* Modal helpers */
function openModal(id){ document.getElementById(id).style.display = "flex"; }
function closeModal(id){ document.getElementById(id).style.display = "none"; }
document.querySelectorAll(".close-modal").forEach(btn => btn.addEventListener("click", ()=> {
  const id = btn.dataset.close;
  if(id) closeModal(id);
}));
window.onclick = e => { if(e.target.classList.contains("modal")) e.target.style.display = "none"; };

/* Authentication helpers */
btnSignInGoogle?.addEventListener("click", async ()=>{
  const provider = new GoogleAuthProvider();
  try{
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    refreshUserUI(currentUser);
  }catch(err){ console.error(err); alert("Error Google sign-in"); }
});
btnSignInGoogle2?.addEventListener("click", async ()=>{
  const provider = new GoogleAuthProvider();
  try{
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    refreshUserUI(currentUser);
  }catch(err){ console.error(err); alert("Error Google sign-in"); }
});
btnAnon?.addEventListener("click", async ()=>{
  try{
    await signInAnonymously(auth);
    alert("Sesión anónima iniciada");
  }catch(err){ console.error(err); alert("No se pudo iniciar anónimo"); }
});
btnSignOut?.addEventListener("click", async ()=>{
  try{
    await signOut(auth);
    // re-sign anonymously for continued usage
    await signInAnonymously(auth);
  }catch(err){ console.warn(err); }
});

function refreshUserUI(user){
  if(!user) {
    userAvatarImg.src = "";
    userNameSpan.textContent = "Invitado";
    return;
  }
  // prefer local profile if set
  const localProfile = JSON.parse(localStorage.getItem("local_profile")||"{}");
  const name = localProfile.name || user.displayName || "Usuario";
  const avatar = localProfile.avatar || user.photoURL || "";
  userAvatarImg.src = avatar || "";
  userNameSpan.textContent = name;
}

/* Presentations: Firestore + Storage
   Collection: presentations
   Doc structure: { url, storagePath?, title, createdAt, uploader, type: 'link'|'file', fileMime }
*/
const PRESENT_COLLECTION = "presentations";
const EVENTS_COLLECTION = "events_by_date";

const presentationsRef = collection(db, PRESENT_COLLECTION);
const qPresent = query(presentationsRef, orderBy("createdAt", "desc"));

onSnapshot(qPresent, snapshot => {
  const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderPresentations(docs);
});

function renderPresentations(list){
  presentationsEl.innerHTML = "";
  if(list.length === 0){
    presentationsEl.innerHTML = `<div class="muted">No hay presentaciones compartidas aún.</div>`;
    return;
  }

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "presentation-card";

    // preview area
    let frameHtml = "";
    if(item.type === "link"){
      const embed = toEmbedUrl(item.url) || "";
      frameHtml = `<iframe class="frame" src="${embed}" loading="lazy" allowfullscreen></iframe>`;
    } else if(item.type === "pdf"){
      // display PDF using storage URL
      frameHtml = `<iframe class="frame" src="${item.storageUrl}" loading="lazy"></iframe>`;
    } else if(item.type === "pptx"){
      // Office viewer link
      frameHtml = `<iframe class="frame" src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.storageUrl)}" loading="lazy"></iframe>`;
    } else {
      frameHtml = `<div style="padding:40px;text-align:center">Vista previa no disponible</div>`;
    }

    // meta: uploader avatar + title
    const avatar = item.uploaderPhoto || "";
    const title = escapeHtml(item.title || item.url || (item.fileName || "Archivo"));
    const uploaderName = escapeHtml(item.uploaderName || "Usuario");

    card.innerHTML = `
      ${frameHtml}
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

  // handlers
  presentationsEl.querySelectorAll("[data-open]").forEach(btn=>{
    btn.addEventListener("click", async () => {
      const id = btn.dataset.open;
      const docRef = doc(db, PRESENT_COLLECTION, id);
      const snap = await getDoc(docRef);
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
    btn.addEventListener("click", async () => {
      const id = btn.dataset.delete;
      if(!confirm("Eliminar esta presentación públicamente?")) return;
      try{
        // optional: only uploader can delete in UI; Firestore rules should enforce it server-side
        const snap = await getDoc(doc(db, PRESENT_COLLECTION, id));
        const item = snap.data();
        // remove storage file if present
        if(item && item.storagePath){
          try{
            // Storage deletion requires admin or direct Storage reference with delete; client SDK v12 doesn't provide delete via browser without setting up proper permissions.
            // For simplicity here we just delete the Firestore doc; storage cleanup can be done separately if required.
          }catch(e){ console.warn("storage delete issue", e); }
        }
        await deleteDoc(doc(db, PRESENT_COLLECTION, id));
      }catch(err){ console.error(err); alert("Error eliminando"); }
    });
  });
}

/* Add presentation by link */
addPresentationBtn.addEventListener("click", async ()=>{
  const raw = slidesLinkInput.value.trim();
  if(!raw) return alert("Pega la URL de Google Slides");
  const id = extractSlidesId(raw);
  if(!id) return alert("Enlace inválido");
  // title attempt
  const titleCandidate = (raw.match(/\/d\/[A-Za-z0-9_-]+\/([^?\/]+)/) || [null,''])[1] || '';
  const profile = JSON.parse(localStorage.getItem("local_profile")||"{}");
  await addDoc(collection(db, PRESENT_COLLECTION), {
    type: "link",
    url: raw,
    title: titleCandidate || "",
    createdAt: serverTimestamp(),
    uploader: currentUser?.uid || null,
    uploaderName: profile.name || currentUser?.displayName || null,
    uploaderPhoto: profile.avatar || currentUser?.photoURL || null
  });
  slidesLinkInput.value = "";
});

/* Drag & drop / file upload handling */
function handleFileUpload(file){
  // Accept only pdf, pptx, ppt
  const allowed = ["application/pdf","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/vnd.ms-powerpoint"];
  const mime = file.type;
  if(!allowed.includes(mime)) return alert("Formato no soportado (usa PDF o PPTX)");
  // upload to storage
  const path = `presentations/${Date.now()}_${file.name}`;
  const r = storageRef(storage, path);
  uploadBytes(r, file).then(async (snapshot) => {
    const url = await getDownloadURL(r);
    const profile = JSON.parse(localStorage.getItem("local_profile")||"{}");
    const type = mime === "application/pdf" ? "pdf" : "pptx";
    await addDoc(collection(db, PRESENT_COLLECTION), {
      type,
      storagePath: path,
      storageUrl: url,
      fileName: file.name,
      createdAt: serverTimestamp(),
      uploader: currentUser?.uid || null,
      uploaderName: profile.name || currentUser?.displayName || null,
      uploaderPhoto: profile.avatar || currentUser?.photoURL || null
    });
    alert("Subida completa y publicada.");
  }).catch(err => { console.error(err); alert("Error al subir"); });
}

/* file input */
fileInput.addEventListener("change", e=>{
  const f = e.target.files[0];
  if(f) handleFileUpload(f);
});

/* drag/drop area */
uploadArea.addEventListener("dragover", e=>{ e.preventDefault(); uploadArea.classList.add("dragover"); });
uploadArea.addEventListener("dragleave", e=>{ e.preventDefault(); uploadArea.classList.remove("dragover"); });
uploadArea.addEventListener("drop", e=>{
  e.preventDefault(); uploadArea.classList.remove("dragover");
  const f = e.dataTransfer.files[0];
  if(f) handleFileUpload(f);
});

/* =========================
   Calendar realtime
   ========================= */
const eventsCollectionRef = collection(db, EVENTS_COLLECTION);
onSnapshot(eventsCollectionRef, snapshot => {
  window._sharedEvents = {};
  snapshot.forEach(snap => {
    window._sharedEvents[snap.id] = snap.data().items || [];
  });
  renderCalendarView();
});

let view = { year: new Date().getFullYear(), month: new Date().getMonth() };

function ymd(y,m,d){ return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

function renderCalendarView(){
  calendarEl.innerHTML = "";
  const monthName = new Date(view.year, view.month).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  monthLabel.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const days = ['L','M','X','J','V','S','D'];
  days.forEach(d => {
    const el = document.createElement('div'); el.textContent = d; el.style.fontWeight = '700'; el.style.textAlign = 'center'; calendarEl.appendChild(el);
  });

  const first = new Date(view.year, view.month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  for(let i=0;i<startOffset;i++) calendarEl.appendChild(document.createElement('div'));

  const daysInMonth = new Date(view.year, view.month+1, 0).getDate();
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = ymd(view.year, view.month+1, d);
    const cell = document.createElement('div'); cell.className = 'day-cell'; cell.innerHTML = `<div class="day-num">${d}</div>`;
    const items = window._sharedEvents?.[dateStr] || [];
    if(items.length){
      const dot = document.createElement('div'); dot.className='events-dot'; dot.textContent = items.length + (items.length>1?' eventos':' evento'); cell.appendChild(dot);
    }
    cell.addEventListener('click', ()=> openDayModal(dateStr));
    calendarEl.appendChild(cell);
  }
}

/* calendar controls */
document.getElementById('open-calendar').addEventListener('click', ()=> { openModal('calendar-modal'); renderCalendarView(); });
prevMonthBtn.addEventListener('click', ()=> { view.month--; if(view.month<0){ view.month=11; view.year--; } renderCalendarView(); });
nextMonthBtn.addEventListener('click', ()=> { view.month++; if(view.month>11){ view.month=0; view.year++; } renderCalendarView(); });
todayBtn.addEventListener('click', ()=> { const n=new Date(); view.year=n.getFullYear(); view.month=n.getMonth(); renderCalendarView(); });

/* day modal */
let currentDay = null;
function openDayModal(dateStr){
  currentDay = dateStr; document.getElementById('day-date').textContent = dateStr; loadDayEvents(); openModal('day-modal');
}
async function loadDayEvents(){
  dayEventsList.innerHTML = '';
  const docRef = doc(db, EVENTS_COLLECTION, currentDay);
  const snap = await getDoc(docRef);
  const items = snap.exists() ? (snap.data().items || []) : [];
  if(items.length===0){ dayEventsList.innerHTML = `<li class="muted">Sin eventos para este día.</li>`; return; }
  items.forEach((ev, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<div><div class="title">${escapeHtml(ev.title)}</div><div class="muted" style="font-size:13px">${escapeHtml(ev.notes||'')}</div></div>
                    <div class="actions"><button class="btn small" data-edit="${idx}">Editar</button><button class="btn ghost small" data-del="${idx}">Eliminar</button></div>`;
    dayEventsList.appendChild(li);
  });
  dayEventsList.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', async ()=> {
      const idx = parseInt(btn.dataset.del,10);
      const ref = doc(db, EVENTS_COLLECTION, currentDay);
      const snap = await getDoc(ref);
      if(!snap.exists()) return;
      const items = snap.data().items || [];
      items.splice(idx,1);
      await setDoc(ref, { items }, { merge: true });
    });
  });
  dayEventsList.querySelectorAll('[data-edit]').forEach(btn=>{
    btn.addEventListener('click', async ()=> {
      const idx = parseInt(btn.dataset.edit,10);
      const ref = doc(db, EVENTS_COLLECTION, currentDay);
      const snap = await getDoc(ref);
      const items = snap.exists() ? (snap.data().items||[]) : [];
      const ev = items[idx];
      document.getElementById('event-title').value = ev.title;
      document.getElementById('event-notes').value = ev.notes || '';
      document.getElementById('event-color').value = ev.color || '#1e6ed8';
      saveEventBtn._editingIndex = idx;
    });
  });
}

/* save event */
saveEventBtn.addEventListener('click', async ()=> {
  const title = document.getElementById('event-title').value.trim();
  if(!title) return alert('Pon un título al evento');
  const notes = document.getElementById('event-notes').value.trim();
  const color = document.getElementById('event-color').value || '#1e6ed8';
  const ref = doc(db, EVENTS_COLLECTION, currentDay);
  const snap = await getDoc(ref);
  const items = snap.exists() ? (snap.data().items||[]) : [];
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

/* Settings: theme & background (shared background saved in Firestore document 'site_settings/bg') */
const SETTINGS_DOC_ID = "site_settings"; // single doc id in collection 'site_meta'
const META_COLLECTION = "site_meta";
const metaRef = doc(db, META_COLLECTION, SETTINGS_DOC_ID);

async function loadSiteSettings(){
  const snap = await getDoc(metaRef);
  if(snap.exists()){
    const data = snap.data();
    if(data.theme) { document.body.classList.toggle('light', data.theme === 'light'); }
    if(data.background) {
      document.body.style.backgroundImage = `url("${data.background}")`;
      document.body.style.backgroundSize = 'cover';
    }
  } else {
    // fallback: local settings
    const local = JSON.parse(localStorage.getItem('site_settings')||'{}');
    if(local.theme) document.body.classList.toggle('light', local.theme === 'light');
    if(local.background) document.body.style.backgroundImage = `url("${local.background}")`;
  }
}
loadSiteSettings();

/* theme buttons apply locally and push to Firestore */
themeLightBtn.addEventListener('click', async ()=> {
  document.body.classList.add('light');
  await setDoc(metaRef, { theme: 'light' }, { merge: true });
});
themeDarkBtn.addEventListener('click', async ()=> {
  document.body.classList.remove('light');
  await setDoc(metaRef, { theme: 'dark' }, { merge: true });
});

/* bg preview and apply (URL) */
bgPreviewBtn.addEventListener('click', ()=> {
  const url = bgInput.value.trim();
  if(!url) return alert('Pega una URL válida');
  bgPreview.style.backgroundImage = `url("${url}")`; bgPreview.style.backgroundSize = 'cover';
});
bgApplyBtn.addEventListener('click', async ()=> {
  const url = bgInput.value.trim();
  if(!url) return alert('Pega una URL válida');
  await setDoc(metaRef, { background: url }, { merge: true });
  document.body.style.backgroundImage = `url("${url}")`;
  alert('Fondo compartido aplicado');
});
bgResetBtn.addEventListener('click', async ()=> {
  await setDoc(metaRef, { background: "" }, { merge: true });
  document.body.style.backgroundImage = "";
  bgPreview.style.backgroundImage = ''; bgPreview.textContent = 'Vista previa';
});

/* Background upload to Storage and save URL to Firestore */
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
    alert('Fondo subido y aplicado (compartido)');
  }catch(e){ console.error(e); alert('Error subiendo fondo'); }
});

/* Profile save (local only) */
saveProfileBtn.addEventListener('click', ()=> {
  const name = profileNameInput.value.trim();
  const avatar = profileAvatarUrlInput.value.trim();
  const local = { name, avatar };
  localStorage.setItem('local_profile', JSON.stringify(local));
  refreshUserUI(currentUser);
  alert('Perfil guardado localmente');
});

/* Export / Import features */
exportBtn.addEventListener('click', async ()=> {
  const presSnap = await getDocs(collection(db, PRESENT_COLLECTION));
  const eventsSnap = await getDocs(collection(db, EVENTS_COLLECTION));
  const metaSnap = await getDoc(metaRef);
  const data = {
    presentations: presSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    events: eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    meta: metaSnap.exists()? metaSnap.data() : {}
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'site-export.json'; document.body.appendChild(a); a.click(); a.remove();
});

importFile.addEventListener('change', async (e)=> {
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = async ()=> {
    try{
      const json = JSON.parse(reader.result);
      if(Array.isArray(json.presentations)){
        for(const p of json.presentations){
          // naive duplicate check by URL
          const q = query(collection(db, PRESENT_COLLECTION), where("url","==",p.url || p.storageUrl));
          const existing = await getDocs(q);
          if(existing.empty){
            await addDoc(collection(db, PRESENT_COLLECTION), {
              ...p,
              createdAt: serverTimestamp()
            });
          }
        }
      }
      if(Array.isArray(json.events)){
        for(const eDoc of json.events){
          await setDoc(doc(db, EVENTS_COLLECTION, eDoc.id), { items: eDoc.items || [] }, { merge: true });
        }
      }
      if(json.meta){
        await setDoc(metaRef, json.meta, { merge: true });
      }
      alert('Importación completada');
    }catch(err){ console.error(err); alert('Error importando: ' + err.message); }
  };
  reader.readAsText(f);
});

/* Utility: render presentations initially will be driven by onSnapshot */
/* Also refresh user UI from local profile */
refreshUserUI(currentUser);

/* End of file */
