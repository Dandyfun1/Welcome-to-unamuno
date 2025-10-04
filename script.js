// UNAMUNO polished final
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co"; // <-- REPLACE
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";              // <-- REPLACE
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let loggedIn = false;
let eventsCache = [];
let calendarCursor = new Date();

document.addEventListener('DOMContentLoaded', () => {
  // Panels
  enableDrag('#admin-panel','#admin-drag');
  enableDrag('#calendar-panel','#calendar-drag');
  init();

  // Admin panel
  $('#admin-toggle')?.addEventListener('click', async () => { showPanel('#admin-panel'); await populateAdmin(); });
  $('#admin-close')?.addEventListener('click', ()=> hidePanel('#admin-panel'));

  // Calendar panel
  $('#calendar-toggle')?.addEventListener('click', async () => { showPanel('#calendar-panel'); await loadEvents(); renderCalendar(calendarCursor); });
  $('#calendar-close')?.addEventListener('click', ()=> hidePanel('#calendar-panel'));
  $('#cal-prev')?.addEventListener('click', ()=> { calendarCursor.setMonth(calendarCursor.getMonth()-1); renderCalendar(calendarCursor); });
  $('#cal-next')?.addEventListener('click', ()=> { calendarCursor.setMonth(calendarCursor.getMonth()+1); renderCalendar(calendarCursor); });

  // Auth
  $('#login-btn')?.addEventListener('click', async () => {
    const email = ($('#pw-input')?.value || '').trim();
    if (!email) return alert('Introduce el email del admin.');
    const password = prompt('Introduce la contraseña:');
    if (!password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert('Error al iniciar sesión: ' + error.message);
    loggedIn = !!data.session;
    updateAuthUI();
    await loadAll();
    toast('Sesión iniciada');
  });

  $('#logout-btn')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    hidePanel('#admin-panel');
    toast('Sesión cerrada');
  });

  // Settings
  $('#save-changes')?.addEventListener('click', async () => {
    if (!loggedIn) return alert('Solo admin.');
    const title = $('#edit-title').value || 'UNAMUNO';
    const sub = $('#edit-sub').value || '';
    const accent = $('#edit-accent').value || '#16a34a';
    const logo = $('#edit-logo').value || null;
    const hero = $('#edit-hero').value || null;
    const { error } = await supabaseClient.from('site_settings').upsert([{
      id: '00000000-0000-0000-0000-000000000001',
      title, description: sub, accent, logo_url: logo, hero_url: hero
    }]);
    if (error) return alert('Save failed: ' + error.message);
    document.documentElement.style.setProperty('--accent', accent);
    await loadSiteSettings();
    toast('Configuración guardada');
  });

  $('#export-btn')?.addEventListener('click', async () => {
    if (!loggedIn) return alert('Solo admin.');
    const { data: items } = await supabaseClient.from('items').select('*');
    const { data: events } = await supabaseClient.from('calendar_events').select('*');
    const payload = { exported_at: new Date().toISOString(), items, events };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'unamuno_export_' + new Date().toISOString().slice(0,10) + '.json'; a.click();
    URL.revokeObjectURL(url);
  });

  // Items
  $('#new-item-btn')?.addEventListener('click', async () => {
    if (!loggedIn) return alert('Solo admin.');
    const title = prompt('Título del post:'); if (!title) return;
    const username = prompt('Nombre visible:') || 'Admin';
    const category = prompt('Categoría:') || null;
    const description = prompt('Descripción:') || null;
    await supabaseClient.from('items').insert([{ title, description, username, category }]);
    await loadItems();
  });

  $('#public-post-btn')?.addEventListener('click', async () => {
    const username = prompt('Nombre visible:') || 'Anon';
    const title = prompt('Título de la publicación:'); if (!title) return;
    const category = prompt('Categoría:') || null;
    const description = prompt('Descripción:') || null;
    await supabaseClient.from('items').insert([{ title, description, username, category }]);
    toast('Publicación creada');
    await loadItems();
  });

  // Search
  $('#search-btn')?.addEventListener('click', async () => {
    const q = ($('#search-input').value || '').trim();
    if (!q) return loadItems();
    const { data } = await supabaseClient.from('items').select('*')
      .or(`title.ilike.%${q}%,description.ilike.%${q}%,username.ilike.%${q}%`)
      .order('pinned',{ascending:false})
      .order('created_at',{ascending:false});
    renderItems(data || []);
  });

  // initial load
  loadAll();
});

// === helpers ===
async function init() {
  const { data } = await supabaseClient.auth.getSession();
  loggedIn = !!data?.session;
  updateAuthUI();
  await loadAll();
  supabaseClient.channel('unamuno_ch')
    .on('postgres_changes',{event:'*',schema:'public',table:'items'},()=>loadItems())
    .on('postgres_changes',{event:'*',schema:'public',table:'calendar_events'},()=>{loadEvents();toast('Calendario actualizado');})
    .subscribe();
}

function updateAuthUI() {
  $('#controls-area')?.classList.toggle('hidden', !loggedIn);
  $('#login-area') && ($('#login-area').style.display = loggedIn ? 'none' : 'block');
}

async function loadAll(){ await Promise.all([loadSiteSettings(),loadItems(),loadEvents()]); }

async function loadSiteSettings() {
  const { data } = await supabaseClient.from('site_settings').select('*')
    .eq('id','00000000-0000-0000-0000-000000000001').maybeSingle();
  if (data) {
    $('#site-title').textContent = data.title || 'UNAMUNO';
    $('#site-sub').textContent = data.description || '';
    $('#edit-title') && ($('#edit-title').value = data.title || '');
    $('#edit-sub') && ($('#edit-sub').value = data.description || '');
    $('#edit-accent') && ($('#edit-accent').value = data.accent || '#16a34a');
    if (data.logo_url) $('#site-logo').src = data.logo_url;
    if (data.hero_url) document.querySelector('.hero').style.backgroundImage = `url(${data.hero_url})`;
    document.documentElement.style.setProperty('--accent', data.accent || '#16a34a');
  }
}

async function loadItems() {
  const { data } = await supabaseClient.from('items').select('*')
    .order('pinned',{ascending:false}).order('created_at',{ascending:false});
  renderPinned((data||[]).filter(i=>i.pinned));
  renderItems((data||[]).filter(i=>!i.pinned));
}

function renderPinned(items){
  const pinnedArea = $('#pinned-area'); pinnedArea.innerHTML='';
  items.forEach(item=>{
    const el=document.createElement('div'); el.className='card';
    el.innerHTML=`<h3>📌 ${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description||'')}</p>`;
    pinnedArea.appendChild(el);
  });
}

function renderItems(items){
  const grid=$('#items-grid'); grid.innerHTML='';
  items.forEach(it=>{
    const card=document.createElement('article'); card.className='card';
    card.innerHTML=`<h3>${escapeHtml(it.title)}</h3><p>${escapeHtml(it.description||'')}</p>`;
    grid.appendChild(card);
  });
}

async function loadEvents(){
  const { data } = await supabaseClient.from('calendar_events').select('*');
  eventsCache=data||[];
  if (!$('#calendar-panel').classList.contains('hidden')) renderCalendar(calendarCursor);
}

function renderCalendar(date){
  const grid=$('#calendar-grid'); grid.innerHTML='';
  const year=date.getFullYear(),month=date.getMonth();
  const days=new Date(year,month+1,0).getDate();
  for(let d=1;d<=days;d++){
    const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const ev=eventsCache.find(e=>e.event_date===dateStr);
    const dayEl=document.createElement('div'); dayEl.className='day'; dayEl.textContent=d;
    if(ev) dayEl.classList.add('has-event');
    grid.appendChild(dayEl);
  }
}

function enableDrag(panelSel,handleSel){
  const panel=$(panelSel),handle=$(handleSel); if(!panel||!handle)return;
  let drag=false,ox=0,oy=0; handle.style.cursor='grab';
  handle.addEventListener('mousedown',e=>{drag=true;ox=e.clientX-panel.offsetLeft;oy=e.clientY-panel.offsetTop;});
  window.addEventListener('mousemove',e=>{if(!drag)return;panel.style.left=(e.clientX-ox)+'px';panel.style.top=(e.clientY-oy)+'px';});
  window.addEventListener('mouseup',()=>{drag=false;});
}

function toast(msg,t=3000){const c=$('#notifications');const el=document.createElement('div');el.className='toast';el.textContent=msg;c.appendChild(el);setTimeout(()=>el.remove(),t);}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));}

