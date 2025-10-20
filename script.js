// ===============================
// UNAMUNO SITE JS (Supabase-ready)
// ===============================

// 💾 Connect to Supabase
const SUPABASE_URL = 'https://ddpqzpexcktjtzaqradg.supabase.co';   // <-- Replace with your Supabase project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ';              // <-- Replace with your anon key
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// UTILITIES
// ===============================
function el(id) { return document.getElementById(id); }
function show(msg) { alert(msg); }

// ===============================
// SITE SETTINGS
// ===============================
async function loadSiteSettings() {
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', '00000000-0000-0000-0000-000000000001').single();
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
    div.className = 'post';
    div.innerHTML = `
      <h3>${post.title}</h3>
      <p>${post.description || ''}</p>
      ${post.category ? `<span class="category">${post.category}</span>` : ''}
      <small>${new Date(post.created_at).toLocaleString()}</small>
    `;
    container.appendChild(div);
  });
}

// Create a new post
async function createPost() {
  const title = el('post-title').value.trim();
  const description = el('post-description').value.trim();
  const username = el('post-username')?.value?.trim() || '';
  const category = el('post-category')?.value?.trim() || '';
  const pinned = el('post-pinned')?.checked || false;

  if (!title) return show('Please enter a title.');

  const { data, error } = await supabase
    .from('items')
    .insert([{ title, description, username, category, pinned }])
    .select();

  if (error) {
    console.error('Create failed:', error.message);
    return show(`Create failed: ${error.message}`);
  }

  show('Post created successfully!');
  el('post-title').value = '';
  el('post-description').value = '';
  el('post-category').value = '';
  el('post-pinned').checked = false;

  loadPosts();
}

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

async function createEvent() {
  const date = el('event-date').value;
  const title = el('event-title').value.trim();
  const note = el('event-note').value.trim();

  if (!date || !title) return show('Please fill in event date and title.');

  const { data, error } = await supabase
    .from('calendar_events')
    .insert([{ event_date: date, title, note }])
    .select();

  if (error) {
    console.error('Failed to create event:', error.message);
    return show(`Create failed: ${error.message}`);
  }

  show('Event added successfully!');
  el('event-date').value = '';
  el('event-title').value = '';
  el('event-note').value = '';

  loadCalendar();
}

// ===============================
// INIT
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  loadPosts();
  loadCalendar();

  const postBtn = el('create-post-btn');
  if (postBtn) postBtn.addEventListener('click', createPost);

  const eventBtn = el('create-event-btn');
  if (eventBtn) eventBtn.addEventListener('click', createEvent);
});
