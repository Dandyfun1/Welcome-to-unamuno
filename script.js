// ===============================
// UNAMUNO JS (Supabase)
// ===============================

// 🔗 Connect to Supabase
const SUPABASE_URL = 'https://ddpqzpexcktjtzaqradg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const el = id => document.getElementById(id);
const notify = msg => {
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  el('notifications').appendChild(div);
  setTimeout(() => div.remove(), 3500);
};

// ===============================
// LOAD SITE SETTINGS
// ===============================
async function loadSiteSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  if (error) {
    console.error('Settings load failed:', error);
    return;
  }

  const s = data || {};
  el('site-title').textContent = s.title || 'UNAMUNO';
  el('site-description').textContent = s.description || '';
  document.documentElement.style.setProperty('--accent', s.accent || '#16a34a');
  if (s.logo_url) el('site-logo').src = s.logo_url;
}
loadSiteSettings();

// ===============================
// LOAD POSTS
// ===============================
async function loadPosts() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  const posts = el('posts');
  posts.innerHTML = '';

  if (error) {
    console.error('Load posts error:', error);
    posts.innerHTML = '<p>⚠️ Failed to load posts.</p>';
    return;
  }

  if (!data.length) {
    posts.innerHTML = '<p>No posts yet. Be the first to create one!</p>';
    return;
  }

  data.forEach(post => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      ${post.thumbnail_url ? `<img src="${post.thumbnail_url}" class="thumb" alt="Thumbnail">` : ''}
      <h3>${post.title}</h3>
      ${post.link ? `<p><a href="${post.link}" target="_blank">${post.link}</a></p>` : ''}
      <div class="meta">${new Date(post.created_at).toLocaleString()} ${post.pinned ? '📌' : ''}</div>
    `;
    posts.appendChild(div);
  });
}

// ===============================
// CREATE POST
// ===============================
async function createPost() {
  const title = el('post-title').value.trim();
  const link = el('post-link').value.trim();
  const thumb = el('post-thumbnail').value.trim();
  const pinned = el('post-pinned').checked;

  if (!title) return notify('⚠️ Please enter a title.');

  const { error } = await supabase
    .from('items')
    .insert([{ title, link, thumbnail_url: thumb, pinned }]);

  if (error) {
    console.error('Post create failed:', error);
    notify('❌ Failed to create post. Try again.');
    return;
  }

  notify('✅ Post created successfully!');
  el('post-title').value = '';
  el('post-link').value = '';
  el('post-thumbnail').value = '';
  el('post-pinned').checked = false;

  togglePanel(false);
  loadPosts();
}

// ===============================
// CALENDAR
// ===============================
async function loadCalendar() {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true });

  const container = el('calendar');
  container.innerHTML = '';

  if (error) {
    console.error('Calendar load error:', error);
    container.innerHTML = '<p>⚠️ Failed to load events.</p>';
    return;
  }

  if (!data.length) {
    container.innerHTML = '<p>No events yet.</p>';
    return;
  }

  data.forEach(ev => {
    const div = document.createElement('div');
    div.className = 'calendar-event';
    div.innerHTML = `<b>${ev.title}</b> — ${ev.event_date}<br><small>${ev.note || ''}</small>`;
    container.appendChild(div);
  });
}

// ===============================
// PANEL + DRAG LOGIC
// ===============================
function togglePanel(show) {
  const panel = el('post-panel');
  panel.classList.toggle('hidden', !show);
}

(function makeDraggable() {
  const panel = el('post-panel');
  const header = el('panel-header');
  let drag = false, offsetX, offsetY;

  header.addEventListener('mousedown', e => {
    drag = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
  });

  const move = e => {
    if (!drag) return;
    panel.style.left = e.clientX - offsetX + 'px';
    panel.style.top = e.clientY - offsetY + 'px';
  };
  const stop = () => {
    drag = false;
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', stop);
  };
})();

// ===============================
// INIT
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  loadPosts();
  loadCalendar();

  el('open-panel-btn').addEventListener('click', () => togglePanel(true));
  el('close-panel-btn').addEventListener('click', () => togglePanel(false));
  el('create-post-btn').addEventListener('click', createPost);
});
