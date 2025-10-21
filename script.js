// app.js — UNAMUNO dashboard logic (Supabase)
// Make sure you saved style.css and index.html next to this file.

const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";

const supabase = supabaseJs.createClient ? supabaseJs : supabase; // compatibility if library name differs
const supabaseClient = supabase.createClient
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let loggedIn = false;
let eventsCache = [];
let calendarCursor = new Date();

document.addEventListener('DOMContentLoaded', () => {
  // UI elements
  const navBtns = $$('.nav-btn');
  navBtns.forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));

  $('#create-post-btn').addEventListener('click', openCreatePost);
  $('#post-cancel').addEventListener('click', closeModal);
  $('#post-submit').addEventListener('click', submitPost);
  $('#open-calendar-btn').addEventListener('click', () => switchView('calendar'));
  $('#open-settings-btn').addEventListener('click', () => switchView('settings'));

  $('#search-btn').addEventListener('click', async () => {
    const q = ($('#search-input').value || '').trim();
    if (!q) return loadItems();
    const { data, error } = await supabaseClient.from('items')
      .select('*')
      .or(`title.ilike.%${q}%,username.ilike.%${q}%`)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) return alert('Search error: ' + error.message);
    renderItems(data || []);
  });

  $('#login-btn').addEventListener('click', async () => {
    const email = ($('#email-input').value || '').trim();
    if (!email) return alert('Introduce el email del admin.');
    const password = prompt('Introduce la contraseña:');
    if (!password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert('Error al iniciar sesión: ' + (error.message || JSON.stringify(error)));
    loggedIn = !!data.session;
    updateAuthUI();
    await loadAll();
    toast('Sesión iniciada');
  });

  $('#logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    toast('Sesión cerrada');
  });

  $('#save-changes').addEventListener('click', saveSiteSettings);
  $('#revert-changes').addEventListener('click', loadSiteSettings);
  $('#export-btn').addEventListener('click', exportData);

  $$('#cal-prev').forEach(b => b.addEventListener('click', () => { calendarCursor.setMonth(calendarCursor.getMonth()-1); renderCalendar(calendarCursor); }));
  $$('#cal-next').forEach(b => b.addEventListener('click', () => { calendarCursor.setMonth(calendarCursor.getMonth()+1); renderCalendar(calendarCursor); }));

  // init
  init();
});

// ---------- Navigation / Views ----------
function switchView(view) {
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  if (view === 'calendar') {
    renderCalendar(calendarCursor);
  }
}

// ---------- Modal ----------
function openCreatePost(){
  $('#modal-backdrop').classList.remove('hidden');
  $('#post-title').value = '';
  $('#post-username').value = '';
  $('#post-thumbnail').value = '';
}
function closeModal(){ $('#modal-backdrop').classList.add('hidden'); }

// ---------- Initialization ----------
async function init(){
  const { data } = await supabaseClient.auth.getSession();
  loggedIn = !!data?.session;
  updateAuthUI();
  await loadAll();
  subscribeRealtime();
}

function updateAuthUI(){
  $('#login-area').classList.toggle('hidden', loggedIn);
  $('#user-area').classList.toggle('hidden', !loggedIn);
  if (loggedIn) {
    const user = supabaseClient.auth.getUser
      ? (async()=>{ const r = await supabaseClient.auth.getUser(); return r?.data?.user })()
      : null;
    // set email if possible
    (async ()=>{
      const r = await supabaseClient.auth.getSession();
      const email = r?.data?.session?.user?.email || '';
      $('#user-email').textContent = email;
    })();
  } else {
    $('#user-email').textContent = '';
  }
}

// ---------- Load everything ----------
async function loadAll(){
  await Promise.all([loadSiteSettings(), loadItems(), loadEvents()]);
}

// ---------- Site settings ----------
async function loadSiteSettings(){
  const { data } = await supabaseClient.from('site_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle();
  if (data) {
    $('#site-title').textContent = data.title || 'UNAMUNO';
    $('#site-sub').textContent = data.description || '';
    $('#edit-title').value = data.title || '';
    $('#edit-sub').value = data.description || '';
    $('#edit-accent').value = data.accent || '#16a34a';
    $('#edit-logo').value = data.logo_url || '';
    $('#edit-hero').value = data.hero_url || '';
    if (data.logo_url) $('#site-logo').src = data.logo_url; else $('#site-logo').src = '';
    if (data.hero_url) document.body.style.backgroundImage = `url(${data.hero_url})`;
    document.documentElement.style.setProperty('--accent', data.accent || '#16a34a');
  }
}

async function saveSiteSettings(){
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
}

// ---------- Items (posts) ----------
async function loadItems(){
  const { data } = await supabaseClient.from('items')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  const pinned = (data || []).filter(i => i.pinned);
  const normal = (data || []).filter(i => !i.pinned);
  renderPinned(pinned);
  renderItems(normal);
  if (loggedIn) populateAdmin();
}

function renderPinned(items = []) {
  const pinnedArea = $('#pinned-area'); pinnedArea.innerHTML = '';
  items.forEach(it => {
    const el = document.createElement('div'); el.className = 'card pinned';
    el.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center">
        <div class="thumb">${it.thumbnail_url ? `<img src="${it.thumbnail_url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px"/>` : '📌'}</div>
        <div>
          <div style="font-weight:800">${escapeHtml(it.title)}</div>
          <div class="post-meta small">${escapeHtml(it.username || 'Anon')} · ${new Date(it.created_at).toLocaleString()}</div>
        </div>
      </div>
    `;
    pinnedArea.appendChild(el);
  });
}

function renderItems(items = []) {
  const list = $('#items-list'); list.innerHTML = '';
  items.forEach(it => {
    const row = document.createElement('div'); row.className = 'post';
    row.innerHTML = `
      <div class="thumb">${it.thumbnail_url ? `<img src="${it.thumbnail_url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px"/>` : '📰'}</div>
      <div style="flex:1">
        <div class="post-title">${escapeHtml(it.title)}</div>
        <div class="post-meta">${escapeHtml(it.username || 'Anon')} · ${new Date(it.created_at).toLocaleString()}</div>
      </div>
    `;
    list.appendChild(row);
  });
}

async function submitPost(){
  const title = ($('#post-title').value || '').trim();
  const username = ($('#post-username').value || '').trim() || 'Anon';
  const thumbnail = ($('#post-thumbnail').value || '').trim() || null;
  if (!title) return alert('Título requerido.');
  const { error } = await supabaseClient.from('items').insert([{ title, username, thumbnail_url: thumbnail }]);
  if (error) return alert('Error al publicar: ' + error.message);
  toast('Publicación creada');
  closeModal();
  await loadItems();
}

// ---------- Admin list actions ----------
async function populateAdmin(){
  const adminList = $('#admin-items'); adminList.innerHTML = '';
  const { data } = await supabaseClient.from('items').select('*').order('created_at', { ascending: false });
  (data || []).forEach(it => {
    const el = document.createElement('div'); el.className = 'card small';
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div>${escapeHtml(it.title)}</div>
      <div style="display:flex;gap:6px">
        <button data-id="${it.id}" class="btn pin-btn">${it.pinned ? 'Unpin' : 'Pin'}</button>
        <button data-id="${it.id}" class="btn ghost del-btn">Borrar</button>
      </div></div>`;
    adminList.appendChild(el);
  });

  $$('.pin-btn').forEach(b => b.addEventListener('click', async (ev) => {
    const id = ev.target.dataset.id;
    const current = (await supabaseClient.from('items').select('pinned').eq('id', id).maybeSingle()).data;
    await supabaseClient.from('items').update({ pinned: !current.pinned }).eq('id', id);
    toast('Estado actualizado');
    loadItems();
  }));

  $$('.del-btn').forEach(b => b.addEventListener('click', async (ev) => {
    if (!confirm('Borrar publicación?')) return;
    const id = ev.target.dataset.id;
    await supabaseClient.from('items').delete().eq('id', id);
    toast('Borrado');
    loadItems();
  }));
}

// ---------- Export ----------
async function exportData(){
  if (!loggedIn) return alert('Solo admin.');
  const { data: items } = await supabaseClient.from('items').select('*');
  const { data: events } = await supabaseClient.from('calendar_events').select('*');
  const payload = { exported_at: new Date().toISOString(), items, events };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = 'unamuno_export_' + new Date().toISOString().slice(0,10) + '.json';
  a.click(); URL.revokeObjectURL(url);
}

// ---------- Calendar ----------
async function loadEvents(){
  const { data } = await supabaseClient.from('calendar_events').select('*').order('start_time', { ascending: true });
  eventsCache = data || [];
  renderUpcoming();
}

function renderUpcoming(){
  const out = $('#upcoming-events'); out.innerHTML = '';
  const now = new Date();
  eventsCache.filter(e => new Date(e.start_time) >= now).slice(0,6).forEach(ev => {
    const d = new Date(ev.start_time);
    const el = document.createElement('div'); el.className = 'card small';
    el.innerHTML = `<div style="font-weight:700">${escapeHtml(ev.title)}</div><div class="post-meta">${d.toLocaleString()}</div>`;
    out.appendChild(el);
  });
}

function renderCalendar(cursor){
  const grid = $('#calendar-grid'); grid.innerHTML = '';
  const monthLabel = $('#cal-month-label'); monthLabel.textContent = '';
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const first = new Date(year, month, 1); const last = new Date(year, month+1, 0);
  $('#calendar-month').textContent = first.toLocaleString(undefined,{month:'long', year:'numeric'});
  monthLabel.textContent = first.toLocaleString(undefined,{month:'long', year:'numeric'});
  const startDay = first.getDay();
  for (let i=0;i<startDay;i++){ const c = document.createElement('div'); c.className='cal-cell'; grid.appendChild(c); }
  for (let d=1; d<=last.getDate(); d++){
    const date = new Date(year, month, d);
    const cell = document.createElement('div'); cell.className='cal-cell';
    const daynum = document.createElement('div'); daynum.className='daynum'; daynum.textContent = d;
    cell.appendChild(daynum);
    const evs = eventsCache.filter(e => new Date(e.start_time).toDateString() === date.toDateString());
    evs.slice(0,3).forEach(ev => {
      const t = document.createElement('div'); t.style.fontSize='12px'; t.textContent = ev.title; cell.appendChild(t);
    });
    cell.addEventListener('click', () => showDayEvents(date));
    grid.appendChild(cell);
  }
}

function showDayEvents(date){
  const target = $('#day-events'); target.innerHTML = `<h4 class="small">Eventos — ${date.toLocaleDateString()}</h4>`;
  const evs = eventsCache.filter(e => new Date(e.start_time).toDateString() === date.toDateString());
  if (!evs.length) target.innerHTML += '<div class="small">No hay eventos.</div>';
  evs.forEach(ev => {
    const el = document.createElement('div'); el.className='card small';
    el.innerHTML = `<div style="font-weight:800">${escapeHtml(ev.title)}</div><div class="post-meta">${new Date(ev.start_time).toLocaleString()}${ev.end_time ? ' - ' + new Date(ev.end_time).toLocaleString() : ''}</div><div style="margin-top:6px">${escapeHtml(ev.description || '')}</div>`;
    target.appendChild(el);
  });
}

// ---------- Realtime ----------
function subscribeRealtime(){
  try {
    supabaseClient.channel('unamuno_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => loadItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => { loadEvents(); toast('Calendario actualizado'); })
      .subscribe();
  } catch (err) {
    // older supabase library versions may use from('...').on(...).subscribe(); ignore silently
    console.warn('Realtime subscribe error', err);
  }
}

// ---------- Utilities ----------
function toast(msg, t=2200){ const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden'); setTimeout(()=> el.classList.add('hidden'), t); }
function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>\"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;' }[s])); }
