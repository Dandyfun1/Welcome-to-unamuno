// ----------------------------
// Configuration - set these
// ----------------------------
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";       // <- REPLACE
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";             // <- REPLACE

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase keys missing, set SUPABASE_URL and SUPABASE_ANON_KEY in script.js");
  alert("Error: Supabase keys are not set. Edit script.js and provide SUPABASE_URL and SUPABASE_ANON_KEY.");
}

const supabase = window.supabase && window.supabase.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabase) {
  console.error("Supabase client not available. Did you include the supabase JS script?");
}

// ----------------------------
// DOM helpers
// ----------------------------
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }
function toast(msg, t=3000) { const c = $('#notifications'); if (!c) return; const el = document.createElement('div'); el.className='toast'; el.textContent = msg; c.appendChild(el); setTimeout(()=>el.remove(), t); }

// ----------------------------
// App state
// ----------------------------
let loggedIn = false;
let eventsCache = [];
let calendarCursor = new Date();

// ----------------------------
// Startup
// ----------------------------
document.addEventListener('DOMContentLoaded', () => {
  // set year
  document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());

  // wire dragging (if elements exist)
  enableDrag('#admin-panel','#admin-drag');
  enableDrag('#calendar-panel','#calendar-drag');

  // wire UI controls safely (only if present)
  $('#login-btn')?.addEventListener('click', async () => {
    const email = ($('#pw-input')?.value || '').trim();
    if (!email) return alert('Introduce el email del admin.');
    const password = prompt('Introduce la contraseña:');
    if (!password) return;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      loggedIn = !!data?.session;
      updateAuthUI();
      await loadAll();
      toast('Sesión iniciada');
      console.log('Logged in:', data);
    } catch (err) {
      console.error('Login error', err);
      alert('Login error: ' + (err.message || err));
    }
  });

  $('#logout-btn')?.addEventListener('click', async () => {
    try {
      await supabase.auth.signOut();
      loggedIn = false;
      updateAuthUI();
      hidePanel('#admin-panel');
      toast('Sesión cerrada');
    } catch (e) { console.warn(e); }
  });

  $('#admin-toggle')?.addEventListener('click', async () => { showPanel('#admin-panel'); await populateAdmin(); });
  $('#admin-close')?.addEventListener('click', ()=> hidePanel('#admin-panel'));
  $('#calendar-toggle')?.addEventListener('click', async () => { showPanel('#calendar-panel'); await loadEvents(); renderCalendar(calendarCursor); });
  $('#calendar-close')?.addEventListener('click', ()=> hidePanel('#calendar-panel'));
  $('#cal-prev')?.addEventListener('click', ()=> { calendarCursor.setMonth(calendarCursor.getMonth()-1); renderCalendar(calendarCursor); });
  $('#cal-next')?.addEventListener('click', ()=> { calendarCursor.setMonth(calendarCursor.getMonth()+1); renderCalendar(calendarCursor); });

  $('#search-btn')?.addEventListener('click', async () => {
    const q = ($('#search-input')?.value || '').trim();
    if (!q) return loadItems();
    try {
      const { data, error } = await supabase.from('items').select('*')
        .or(`title.ilike.%${q}%,description.ilike.%${q}%,username.ilike.%${q}%`)
        .order('pinned', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      renderItems(data || []);
    } catch (e) { console.error('Search error', e); alert('Search error: ' + (e.message||e)); }
  });

  $('#public-post-btn')?.addEventListener('click', async () => {
    const username = prompt('Tu nombre (ej: Anon):') || 'Anon';
    const title = prompt('Título de la publicación:');
    if (!title) return;
    const description = prompt('Descripción (opcional):') || null;
    try {
      const { error } = await supabase.from('items').insert([{ title, description, username }]);
      if (error) throw error;
      toast('Publicación creada');
      await loadItems();
    } catch (e) { console.error('Create post error', e); alert('Error: ' + (e.message||e)); }
  });

  $('#new-item-btn')?.addEventListener('click', async () => {
    if (!loggedIn) return alert('Solo admin.');
    const title = prompt('Título del post:'); if (!title) return;
    const username = prompt('Autor (visible):') || 'Admin';
    const description = prompt('Descripción (opcional):') || null;
    try {
      const { error } = await supabase.from('items').insert([{ title, description, username }]);
      if (error) throw error;
      await loadItems();
    } catch (e) { console.error(e); alert('Error creating: ' + (e.message||e)); }
  });

  $('#save-changes')?.addEventListener('click', async () => {
    if (!loggedIn) return alert('Solo admin.');
    const title = $('#edit-title')?.value || 'Clear Blue Blog';
    const description = $('#edit-sub')?.value || '';
    const accent = $('#edit-accent')?.value || '#79c1d9';
    const logo = $('#edit-logo')?.value || null;
    const hero = $('#edit-hero')?.value || null;
    try {
      const { error } = await supabase.from('site_settings').upsert([{
        id: '00000000-0000-0000-0000-000000000001',
        title, description, accent, logo_url: logo, hero_url: hero
      }]);
      if (error) throw error;
      document.documentElement.style.setProperty('--accent', accent);
      await loadSiteSettings();
      toast('Configuración guardada');
    } catch (e) { console.error(e); alert('Save failed: ' + (e.message||e)); }
  });

  $('#export-btn')?.addEventListener('click', async () => {
    if (!loggedIn) return alert('Solo admin.');
    try {
      const { data: items } = await supabase.from('items').select('*');
      const { data: events } = await supabase.from('calendar_events').select('*');
      const payload = { exported_at: new Date().toISOString(), items, events };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'export_' + Date.now() + '.json'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error('Export error', e); alert('Export failed: ' + (e.message||e)); }
  });

  $('#dark-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });

  // Apply stored theme
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');

  // init app state and realtime
  (async () => {
    await init();
  })();
});

// ----------------------------
// Core functions
// ----------------------------
async function init() {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getSession();
    loggedIn = !!data?.session;
    updateAuthUI();
    await loadAll();
  } catch (e) { console.warn('init', e); }

  // Realtime subscriptions (if supported)
  try {
    supabase.channel('cb_blog')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => loadItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => { loadEvents(); toast('Calendario actualizado'); })
      .subscribe();
  } catch (e) { console.warn('realtime', e); }
}

function updateAuthUI() {
  $('#controls-area')?.classList.toggle('hidden', !loggedIn);
  $('#login-area') && ($('#login-area').style.display = loggedIn ? 'none' : 'block');
}

// load everything
async function loadAll() { await Promise.all([loadSiteSettings(), loadItems(), loadEvents()]); }

// site settings
async function loadSiteSettings() {
  try {
    const { data, error } = await supabase.from('site_settings').select('*').eq('id','00000000-0000-0000-0000-000000000001').maybeSingle();
    if (error) throw error;
    if (!data) return;
    $('#site-title') && ($('#site-title').textContent = data.title || 'Clear Blue Blog');
    $('#site-sub') && ($('#site-sub').textContent = data.description || '');
    $('#edit-title') && ($('#edit-title').value = data.title || '');
    $('#edit-sub') && ($('#edit-sub').value = data.description || '');
    $('#edit-accent') && ($('#edit-accent').value = data.accent || '#79c1d9');
    if (data.logo_url) $('#site-logo').src = data.logo_url;
    if (data.hero_url) document.body.style.backgroundImage = `url(${data.hero_url})`;
    document.documentElement.style.setProperty('--accent', data.accent || '#79c1d9');
  } catch (e) { console.error('loadSiteSettings', e); }
}

// items
async function loadItems() {
  try {
    const { data, error } = await supabase.from('items').select('*').order('pinned',{ascending:false}).order('created_at',{ascending:false});
    if (error) throw error;
    const pinned = (data||[]).filter(i => i.pinned);
    const normal = (data||[]).filter(i => !i.pinned);
    renderPinned(pinned);
    renderItems(normal);
  } catch (e) { console.error('loadItems', e); toast('Error cargando publicaciones'); }
}

function renderPinned(items = []) {
  const area = $('#pinned-area');
  if (!area) return;
  area.innerHTML = '';
  items.forEach(item => {
    const el = document.createElement('div'); el.className = 'card';
    el.innerHTML = `<h3>📌 ${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description||'')}</p><div class="meta">${escapeHtml(item.username||'Anon')} • ${new Date(item.created_at).toLocaleString()}</div>`;
    area.appendChild(el);
  });
}

function renderItems(items = []) {
  const grid = $('#items-grid');
  if (!grid) return;
  grid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('article'); card.className = 'card';
    card.innerHTML = `<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description||'')}</p><div class="meta">${escapeHtml(item.username||'Anon')} • ${new Date(item.created_at).toLocaleString()}</div>`;
    if (loggedIn) {
      const controls = document.createElement('div'); controls.style.marginTop = '8px';
      const pinBtn = document.createElement('button'); pinBtn.className = 'pin'; pinBtn.textContent = item.pinned ? 'Despinear' : 'Pin';
      pinBtn.onclick = async () => { await supabase.from('items').update({ pinned: !item.pinned }).eq('id', item.id); await loadItems(); };
      const del = document.createElement('button'); del.className = 'danger'; del.textContent = 'Eliminar'; del.style.marginLeft = '8px';
      del.onclick = async () => { if (!confirm('Eliminar publicación?')) return; await supabase.from('items').delete().eq('id', item.id); await loadItems(); };
      controls.appendChild(pinBtn); controls.appendChild(del); card.appendChild(controls);
    }
    grid.appendChild(card);
  });
}

// calendar
async function loadEvents() {
  try {
    const { data, error } = await supabase.from('calendar_events').select('*');
    if (error) throw error;
    eventsCache = data || [];
    if (!$('#calendar-panel').classList.contains('hidden')) renderCalendar(calendarCursor);
  } catch (e) { console.error('loadEvents', e); }
}

function renderCalendar(baseDate) {
  const calGrid = $('#calendar-grid'); if (!calGrid) return;
  calGrid.innerHTML = '';
  $('#cal-title') && ($('#cal-title').textContent = `${baseDate.toLocaleString('es-ES',{month:'long', year:'numeric'})}`);
  const year = baseDate.getFullYear(), month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i=0;i<firstDay;i++) calGrid.appendChild(document.createElement('div'));
  for (let d=1; d<=daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const ev = eventsCache.find(e => e.event_date === dateStr);
    const dayEl = document.createElement('div'); dayEl.className = 'day'; dayEl.textContent = d;
    if (ev) dayEl.classList.add('has-event');
    const dayDate = new Date(year, month, d);
    if (dayDate.toDateString() === new Date().toDateString()) dayEl.classList.add('today');
    dayEl.onclick = () => openEventPopup(dateStr, ev);
    calGrid.appendChild(dayEl);
  }
}

function openEventPopup(dateStr, ev) {
  $('#event-popup').classList.remove('hidden');
  $('#event-date-title').textContent = new Date(dateStr).toLocaleDateString('es-ES');
  $('#event-details').innerHTML = ev ? `<strong>${escapeHtml(ev.title||'')}</strong><p>${escapeHtml(ev.note||'')}</p>` : '<em>No hay evento</em>';
  if (loggedIn) {
    $('#event-admin-controls').classList.remove('hidden');
    $('#edit-event-btn').onclick = async () => {
      const title = prompt('Título del evento:', ev ? ev.title : '') || '';
      const note = prompt('Detalles:', ev ? ev.note : '') || '';
      if (!title && !note) {
        if (ev) { await supabase.from('calendar_events').delete().eq('event_date', dateStr); await loadEvents(); $('#event-popup').classList.add('hidden'); }
        return;
      }
      await supabase.from('calendar_events').upsert([{ event_date: dateStr, title, note }], { onConflict: 'event_date' });
      await loadEvents(); $('#event-popup').classList.add('hidden');
    };
    $('#delete-event-btn').onclick = async () => {
      if (!confirm('Eliminar evento?')) return;
      await supabase.from('calendar_events').delete().eq('event_date', dateStr);
      await loadEvents(); $('#event-popup').classList.add('hidden');
    };
  } else {
    $('#event-admin-controls').classList.add('hidden');
  }
}

// admin helper
async function populateAdmin() { await loadSiteSettings(); await loadItems(); await loadEvents(); }

// utils
function enableDrag(panelSel, handleSel) {
  const panel = document.querySelector(panelSel), handle = document.querySelector(handleSel);
  if (!panel || !handle) return;
  let dragging = false, offsetX = 0, offsetY = 0;
  handle.style.cursor = 'grab';
  handle.addEventListener('mousedown', e => { dragging = true; offsetX = e.clientX - panel.offsetLeft; offsetY = e.clientY - panel.offsetTop; document.body.style.userSelect = 'none'; });
  window.addEventListener('mousemove', e => { if (!dragging) return; let left = e.clientX - offsetX; let top = e.clientY - offsetY; left = Math.max(6, Math.min(left, window.innerWidth - panel.offsetWidth - 6)); top = Math.max(6, Math.min(top, window.innerHeight - panel.offsetHeight - 6)); panel.style.left = left + 'px'; panel.style.top = top + 'px'; panel.style.right = 'auto'; });
  window.addEventListener('mouseup', () => { dragging = false; document.body.style.userSelect = ''; });
}

function showPanel(sel) { const el = $(sel); if (!el) return; el.classList.remove('hidden'); el.style.display = 'block'; el.setAttribute('aria-hidden','false'); }
function hidePanel(sel) { const el = $(sel); if (!el) return; el.classList.add('hidden'); el.style.display = 'none'; el.setAttribute('aria-hidden','true'); }
