// ===============================
// UNAMUNO SITE JS (Supabase-ready)
// ===============================

// 💾 Connect to Supabase
const SUPABASE_URL = 'https://ddpqzpexcktjtzaqradg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// UTILITIES
// ===============================
function el(id) { return document.getElementById(id); }
function toast(msg) {
  const n = document.createElement('div');
  n.className = 'toast';
  n.textContent = msg;
  el('notifications').appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

// ===============================
// SITE SETTINGS
// ===============================
async function loadSiteSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  if (error) {
    console.error('Failed to load site settings:', error.message);
    return;
  }

  const s = data || {};
  el('site-title').textContent = s.title || 'UNAMUNO';
  el('site-description').textContent = s.description || '';
  document.documentElement.style.setProperty('--accent', s.accent || '#16a34a');
  if (s.logo_url) el('site-logo').src = s.logo_url;
  if (s.hero_url) el('site-hero').src = s.hero_url;
}
loadSiteSettings();

// ===============================
// POSTS (items table)
// ===============================
async function loadPosts() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading posts:', error.message);
    return;
  }

  const container = el('posts');
  container.innerHTML = '';

  data.forEach(post => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      ${post.thumbnail_url ? `<img src="${post.thumbnail_url}" class="thumb" alt="thumbnail">` : ''}
      <h3>${post.title}</h3>
      ${post.link ? `<p><a href="${post.link}" target="_blank">${post.link}</a></p>` : ''}
      <div class="meta">${new Date(post.created_at).toLocaleString()}</div>
    `;
    container.appendChild(div);
  });
}

// Create a new post
async function createPost() {
  const title = el('post-title').value.trim();
  const link = el('post-link').value.trim();
  const thumbnail = el('post-thumbnail').value.trim();
  const pinned = el('post-pinned').checked;

  if (!title) return toast('Please enter a title.');

  const { error } = await supabase
    .from('items')
    .insert([{ title, link, thumbnail_url: thumbnail, pinned }]);

  if (error) {
    console.error('Create failed:', error.message);
    return toast(`Create failed: ${error.message}`);
  }

  toast('✅ Post created successfully!');
  el('post-title').value = '';
  el('post-link').value = '';
  el('post-thumbnail').value = '';
  el('post-pinned').checked = false;

  togglePanel(false);
  loadPosts();
}

// ===============================
// POPUP PANEL LOGIC
// ===============================
function togglePanel(show = true) {
  const panel = el('post-panel');
  if (show) panel.classList.remove('hidden');
  else panel.classList.add('hidden');
}

// Dragging
(function makeDraggable() {
  const panel = el('post-panel');
  const header = el('panel-header');
  let offsetX, offsetY, dragging = false;

  header.addEventListener('mousedown', e => {
    dragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  function onMove(e) {
    if (!dragging) return;
    panel.style.left = e.clientX - offsetX + 'px';
    panel.style.top = e.clientY - offsetY + 'px';
  }

  function onUp() {
    dragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
})();

// ===============================
// CALENDAR EVENTS
// ===============================
async function loadCalendar() {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Error loading calendar:', error.message);
    return;
  }

  const container = el('calendar');
  container.innerHTML = '';
  data.forEach(ev => {
    const div = document.createElement('div');
    div.className = 'calendar-event';
    div.innerHTML = `
      <b>${ev.title}</b> — ${ev.event_date}<br>
      <small>${ev.note || ''}</small>
    `;
    container.appendChild(div);
  });
}

// ===============================
// INIT
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  loadPosts();
  loadCalendar();

  el('create-post-btn').addEventListener('click', createPost);
  el('open-panel-btn').addEventListener('click', () => togglePanel(true));
  el('close-panel-btn').addEventListener('click', () => togglePanel(false));
});
