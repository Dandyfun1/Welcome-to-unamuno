// main.js — Public site JS (UNAMUNO)
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project values if different
const SUPABASE_URL = 'https://ddpqzpexcktjtzaqradg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ';

if (!window.supabase) {
  console.error('Supabase client not loaded. Add <script src="https://unpkg.com/@supabase/supabase-js"></script>');
}

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const el = id => document.getElementById(id);

// small toast helper
function notify(msg, timeout = 3500) {
  const container = el('notifications');
  if (!container) return alert(msg);
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), timeout);
}

// escape HTML to avoid injection
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// -------------------- SITE SETTINGS --------------------
async function loadSiteSettings() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (error) {
      console.warn('Could not load site settings:', error.message || error);
      return;
    }
    const s = data || {};
    if (el('site-title')) el('site-title').textContent = s.title || 'UNAMUNO';
    if (el('site-description')) el('site-description').textContent = s.description || '';
    if (s.logo_url && el('site-logo')) el('site-logo').src = s.logo_url;
    if (s.accent) document.documentElement.style.setProperty('--accent', s.accent);
  } catch (err) {
    console.error('loadSiteSettings error', err);
  }
}

// -------------------- POSTS --------------------
async function loadPosts() {
  const container = el('posts');
  if (!container) return;
  container.innerHTML = 'Loading posts...';

  if (!supabase) {
    container.innerHTML = '<p>Supabase not configured.</p>';
    return;
  }

  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('loadPosts error', error);
      container.innerHTML = '<p>Failed to load posts.</p>';
      return;
    }

    container.innerHTML = '';
    if (!data || data.length === 0) {
      container.innerHTML = '<p>No posts yet.</p>';
      return;
    }

    data.forEach(post => {
      const card = document.createElement('div');
      card.className = 'card';

      const thumb = post.thumbnail_url ? `<img class="thumb" src="${escapeHtml(post.thumbnail_url)}" alt="thumbnail" onerror="this.style.display='none'">` : '';
      const linkHtml = post.link ? `<p><a href="${escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(post.link)}</a></p>` : '';
      const pinned = post.pinned ? ' 📌' : '';
      const created = post.created_at ? new Date(post.created_at).toLocaleString() : '';

      card.innerHTML = `
        ${thumb}
        <h3>${escapeHtml(post.title)}</h3>
        ${linkHtml}
        <div class="meta">${created}${pinned}</div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Unexpected error loading posts.</p>';
  }
}

// create post (from panel)
async function createPost() {
  const title = el('post-title')?.value?.trim() || '';
  const link = el('post-link')?.value?.trim() || null;
  const thumbnail = el('post-thumbnail')?.value?.trim() || null;
  const pinned = !!el('post-pinned')?.checked;

  if (!title) { notify('Please enter a title.'); return; }
  if (thumbnail && !isValidHttpUrl(thumbnail)) { notify('Thumbnail must be a full URL (https://...).'); return; }

  try {
    const { error } = await supabase.from('items').insert([{ title, link, thumbnail_url: thumbnail, pinned }]);
    if (error) { console.error('createPost error', error); notify('Failed to create post.'); return; }
    notify('Post created!');
    clearPanelInputs();
    togglePanel(false);
    setTimeout(loadPosts, 250);
  } catch (err) {
    console.error('createPost exception', err);
    notify('Unexpected error creating post.');
  }
}

// -------------------- CALENDAR --------------------
async function loadCalendar() {
  const container = el('calendar');
  if (!container) return;
  container.innerHTML = 'Loading events...';
  if (!supabase) { container.innerHTML = '<p>Supabase not configured.</p>'; return; }

  try {
    const { data, error } = await supabase.from('calendar_events').select('*').order('event_date', { ascending: true });
    if (error) { console.error('loadCalendar error', error); container.innerHTML = '<p>Failed to load events.</p>'; return; }
    container.innerHTML = '';
    if (!data || data.length === 0) { container.innerHTML = '<p>No events yet.</p>'; return; }
    data.forEach(ev => {
      const div = document.createElement('div');
      div.className = 'calendar-event';
      div.innerHTML = `<b>${escapeHtml(ev.title)}</b> — ${escapeHtml(ev.event_date)}<br><small>${escapeHtml(ev.note || '')}</small>`;
      container.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Unexpected error loading events.</p>';
  }
}

async function createEvent() {
  const date = el('event-date')?.value;
  const title = el('event-title')?.value?.trim();
  const note = el('event-note')?.value?.trim();

  if (!date || !title) { notify('Please set event date and title.'); return; }
  try {
    const { error } = await supabase.from('calendar_events').insert([{ event_date: date, title, note }]);
    if (error) { console.error('createEvent error', error); notify('Failed to add event.'); return; }
    notify('Event added!');
    el('event-date').value = '';
    el('event-title').value = '';
    el('event-note').value = '';
    loadCalendar();
  } catch (err) {
    console.error(err);
    notify('Unexpected error creating event.');
  }
}

// -------------------- PANEL UI & DRAG --------------------
function togglePanel(show = true) {
  const panel = el('post-panel');
  if (!panel) return;
  panel.classList.toggle('hidden', !show);
  if (show) setTimeout(() => el('post-title')?.focus(), 120);
}

function clearPanelInputs() {
  if (el('post-title')) el('post-title').value = '';
  if (el('post-link')) el('post-link').value = '';
  if (el('post-thumbnail')) el('post-thumbnail').value = '';
  if (el('post-pinned')) el('post-pinned').checked = false;
  if (el('thumb-preview')) el('thumb-preview').innerHTML = '';
}

// drag behavior (mouse + touch)
(function makeDraggable(){
  const panel = el('post-panel');
  const header = el('panel-header');
  if (!panel || !header) return;

  let dragging = false, offsetX = 0, offsetY = 0;
  header.addEventListener('mousedown', e => {
    dragging = true; offsetX = e.clientX - panel.offsetLeft; offsetY = e.clientY - panel.offsetTop;
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  });
  function move(e) { if (!dragging) return; panel.style.left = Math.max(8, e.clientX - offsetX) + 'px'; panel.style.top = Math.max(8, e.clientY - offsetY) + 'px'; }
  function up() { dragging = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }

  header.addEventListener('touchstart', e => {
    const t = e.touches[0]; dragging = true; offsetX = t.clientX - panel.offsetLeft; offsetY = t.clientY - panel.offsetTop;
    document.addEventListener('touchmove', touchMove, { passive:false}); document.addEventListener('touchend', touchEnd);
  });
  function touchMove(e) { if (!dragging) return; e.preventDefault(); const t = e.touches[0]; panel.style.left = Math.max(8, t.clientX - offsetX) + 'px'; panel.style.top = Math.max(8, t.clientY - offsetY) + 'px'; }
  function touchEnd() { dragging = false; document.removeEventListener('touchmove', touchMove); document.removeEventListener('touchend', touchEnd); }
})();

// thumbnail preview
function setupThumbnailPreview() {
  const input = el('post-thumbnail'), preview = el('thumb-preview');
  if (!input || !preview) return;
  input.addEventListener('input', () => {
    const url = input.value.trim();
    preview.innerHTML = '';
    if (!url) return;
    if (!isValidHttpUrl(url)) { preview.textContent = 'Thumbnail must be a full URL (https://...)'; return; }
    const img = document.createElement('img'); img.src = url; img.className = 'thumb';
    img.onerror = () => { preview.textContent = 'Failed to load image preview.'; };
    img.onload = () => preview.appendChild(img);
  });
}

// -------------------- UTIL --------------------
function isValidHttpUrl(str) {
  try { const u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:'; } catch (e) { return false; }
}

// -------------------- INIT --------------------
document.addEventListener('DOMContentLoaded', () => {
  loadSiteSettings();
  loadPosts();
  loadCalendar();

  el('open-panel-btn')?.addEventListener('click', () => togglePanel(true));
  el('close-panel-btn')?.addEventListener('click', () => togglePanel(false));
  el('create-post-btn')?.addEventListener('click', createPost);
  el('clear-panel-btn')?.addEventListener('click', clearPanelInputs);

  el('create-event-btn')?.addEventListener('click', createEvent);
  setupThumbnailPreview();
});
