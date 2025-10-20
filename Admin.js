// admin.js — Admin panel logic (UNAMUNO)
const SUPABASE_URL = 'https://ddpqzpexcktjtzaqradg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ';

if (!window.supabase) console.error('Supabase client missing.');
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const el = id => document.getElementById(id);
const notify = (m, t=3000) => { const container = el('notifications'); if (!container) return alert(m); const d=document.createElement('div'); d.className='toast'; d.textContent=m; container.appendChild(d); setTimeout(()=>d.remove(),t); };

// SESSION
function isAdminAuthenticated() { return sessionStorage.getItem('unamuno_admin') === '1'; }
function setAdminAuthenticated(val) { if (val) sessionStorage.setItem('unamuno_admin','1'); else sessionStorage.removeItem('unamuno_admin'); }

// Load settings to show admin UI
async function getSiteSettings() {
  try {
    const { data, error } = await supabase.from('site_settings').select('*').eq('id','00000000-0000-0000-0000-000000000001').single();
    if (error) { console.warn('getSiteSettings error', error); return null; }
    return data;
  } catch (err) {
    console.error(err); return null;
  }
}

async function adminInit() {
  // wire auth buttons
  el('admin-signin-btn')?.addEventListener('click', async () => {
    const secret = el('admin-secret-input')?.value?.trim();
    if (!secret) { notify('Enter admin secret'); return; }

    const s = await getSiteSettings();
    if (!s) { notify('Could not load settings'); return; }
    if (s.admin_secret && secret === s.admin_secret) {
      setAdminAuthenticated(true);
      showAdminControls(true);
      notify('Signed in as admin');
      populateAdminFromSettings(s);
      loadAdminPosts();
      loadAdminCalendar();
    } else {
      notify('Invalid admin secret');
    }
  });

  el('admin-signout-btn')?.addEventListener('click', () => {
    setAdminAuthenticated(false);
    showAdminControls(false);
    notify('Signed out');
  });

  // if already authenticated (session)
  if (isAdminAuthenticated()) {
    showAdminControls(true);
    const s = await getSiteSettings();
    if (s) populateAdminFromSettings(s);
    loadAdminPosts();
    loadAdminCalendar();
  } else {
    showAdminControls(false);
  }

  el('save-settings-btn')?.addEventListener('click', saveSiteSettings);
  el('admin-create-event-btn')?.addEventListener('click', adminCreateEvent);
}

// show/hide admin controls
function showAdminControls(show) {
  el('admin-controls')?.classList.toggle('hidden', !show);
  el('admin-signout-btn')?.classList.toggle('hidden', !show);
}

// populate settings inputs
function populateAdminFromSettings(s) {
  if (!s) return;
  if (el('setting-title')) el('setting-title').value = s.title || '';
  if (el('setting-description')) el('setting-description').value = s.description || '';
  if (el('setting-accent')) el('setting-accent').value = s.accent || '';
  if (el('setting-logo')) el('setting-logo').value = s.logo_url || '';
  if (el('site-logo-admin') && s.logo_url) el('site-logo-admin').src = s.logo_url;
}

// save site settings
async function saveSiteSettings() {
  if (!supabase) return notify('Supabase not available');
  const title = el('setting-title')?.value?.trim();
  const description = el('setting-description')?.value?.trim();
  const accent = el('setting-accent')?.value?.trim();
  const logo = el('setting-logo')?.value?.trim();

  try {
    const { error } = await supabase.from('site_settings').upsert([{
      id: '00000000-0000-0000-0000-000000000001',
      title, description, accent, logo_url: logo
    }], { onConflict: 'id' });
    if (error) { console.error('saveSiteSettings error', error); notify('Failed to save settings'); return; }
    notify('Site settings updated');
  } catch (err) {
    console.error(err); notify('Error saving settings');
  }
}

// ---- ADMIN POSTS CRUD ----
async function loadAdminPosts() {
  const container = el('admin-posts');
  if (!container) return;
  container.innerHTML = 'Loading posts...';
  try {
    const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    if (error) { console.error('loadAdminPosts error', error); container.innerHTML = '<p>Failed to load posts.</p>'; return; }
    if (!data || !data.length) { container.innerHTML = '<p>No posts yet.</p>'; return; }

    container.innerHTML = '';
    data.forEach(post => {
      const row = document.createElement('div');
      row.className = 'card';
      row.innerHTML = `
        <strong>${escapeHtml(post.title)}</strong>
        <div style="margin-top:8px;">
          ${post.thumbnail_url ? `<img src="${escapeHtml(post.thumbnail_url)}" class="thumb" style="max-width:140px;display:block;margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
          ${post.link ? `<div><a href="${escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(post.link)}</a></div>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn edit-post-btn" data-id="${post.id}">Edit</button>
          <button class="ghost small delete-post-btn" data-id="${post.id}">Delete</button>
          <button class="ghost small pin-post-btn" data-id="${post.id}">${post.pinned ? 'Unpin' : 'Pin'}</button>
        </div>
      `;
      container.appendChild(row);
    });

    // attach handlers
    container.querySelectorAll('.delete-post-btn').forEach(b => b.addEventListener('click', adminDeletePost));
    container.querySelectorAll('.pin-post-btn').forEach(b => b.addEventListener('click', adminTogglePin));
    container.querySelectorAll('.edit-post-btn').forEach(b => b.addEventListener('click', adminEditPost));
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Error loading posts.</p>';
  }
}

async function adminDeletePost(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm('Delete this post?')) return;
  try {
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) { console.error(error); notify('Failed to delete post'); return; }
    notify('Post deleted');
    loadAdminPosts();
  } catch (err) { console.error(err); notify('Error deleting post'); }
}

async function adminTogglePin(e) {
  const id = e.currentTarget.dataset.id;
  try {
    const { data, error } = await supabase.from('items').select('pinned').eq('id', id).single();
    if (error) { console.error(error); notify('Failed to toggle pin'); return; }
    const newPinned = !data.pinned;
    const { error: uerr } = await supabase.from('items').update({ pinned: newPinned }).eq('id', id);
    if (uerr) { console.error(uerr); notify('Failed to update pin'); return; }
    notify(newPinned ? 'Post pinned' : 'Post unpinned');
    loadAdminPosts();
  } catch (err) { console.error(err); notify('Error toggling pin'); }
}

// edit post: open a small prompt-based flow (for quick inline edits)
async function adminEditPost(e) {
  const id = e.currentTarget.dataset.id;
  try {
    const { data, error } = await supabase.from('items').select('*').eq('id', id).single();
    if (error) { console.error(error); notify('Failed to fetch post'); return; }

    const newTitle = prompt('Edit title', data.title);
    if (newTitle === null) return; // cancelled
    const newLink = prompt('Edit link (leave empty for none)', data.link || '') || null;
    const newThumb = prompt('Edit thumbnail URL (leave empty for none)', data.thumbnail_url || '') || null;

    const { error: uerr } = await supabase.from('items').update({
      title: newTitle.trim(),
      link: newLink ? newLink.trim() : null,
      thumbnail_url: newThumb ? newThumb.trim() : null
    }).eq('id', id);

    if (uerr) { console.error(uerr); notify('Failed to update post'); return; }
    notify('Post updated');
    loadAdminPosts();
  } catch (err) { console.error(err); notify('Error editing post'); }
}

// ---- ADMIN CALENDAR ----
async function loadAdminCalendar() {
  const container = el('admin-calendar');
  if (!container) return;
  container.innerHTML = 'Loading events...';
  try {
    const { data, error } = await supabase.from('calendar_events').select('*').order('event_date', { ascending: true });
    if (error) { console.error(error); container.innerHTML = '<p>Failed to load events.</p>'; return; }
    container.innerHTML = '';
    if (!data || !data.length) { container.innerHTML = '<p>No events yet.</p>'; return; }
    data.forEach(ev => {
      const row = document.createElement('div');
      row.className = 'card';
      row.innerHTML = `
        <strong>${escapeHtml(ev.title)}</strong><div>${escapeHtml(ev.event_date)}</div>
        <div style="margin-top:8px;">${escapeHtml(ev.note || '')}</div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="ghost small edit-event-btn" data-id="${ev.id}">Edit</button>
          <button class="ghost small delete-event-btn" data-id="${ev.id}">Delete</button>
        </div>
      `;
      container.appendChild(row);
    });

    container.querySelectorAll('.delete-event-btn').forEach(b => b.addEventListener('click', adminDeleteEvent));
    container.querySelectorAll('.edit-event-btn').forEach(b => b.addEventListener('click', adminEditEvent));
  } catch (err) { console.error(err); container.innerHTML = '<p>Error loading events.</p>'; }
}

async function adminCreateEvent() {
  const date = el('admin-event-date')?.value;
  const title = el('admin-event-title')?.value?.trim();
  const note = el('admin-event-note')?.value?.trim();
  if (!date || !title) { notify('Date and title required'); return; }

  try {
    const { error } = await supabase.from('calendar_events').insert([{ event_date: date, title, note }]);
    if (error) { console.error(error); notify('Failed to create event'); return; }
    notify('Event created');
    el('admin-event-date').value = ''; el('admin-event-title').value = ''; el('admin-event-note').value = '';
    loadAdminCalendar();
  } catch (err) { console.error(err); notify('Error creating event'); }
}

async function adminDeleteEvent(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm('Delete event?')) return;
  try {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) { console.error(error); notify('Failed to delete event'); return; }
    notify('Event deleted'); loadAdminCalendar();
  } catch (err) { console.error(err); notify('Error deleting event'); }
}

async function adminEditEvent(e) {
  const id = e.currentTarget.dataset.id;
  try {
    const { data, error } = await supabase.from('calendar_events').select('*').eq('id', id).single();
    if (error) { console.error(error); notify('Failed to fetch event'); return; }
    const newDate = prompt('Edit date (YYYY-MM-DD)', data.event_date);
    if (newDate === null) return;
    const newTitle = prompt('Edit title', data.title);
    if (newTitle === null) return;
    const newNote = prompt('Edit note', data.note || '') || null;

    const { error: uerr } = await supabase.from('calendar_events').update({
      event_date: newDate.trim(),
      title: newTitle.trim(),
      note: newNote ? newNote.trim() : null
    }).eq('id', id);

    if (uerr) { console.error(uerr); notify('Failed to update event'); return; }
    notify('Event updated'); loadAdminCalendar();
  } catch (err) { console.error(err); notify('Error editing event'); }
}

// small helpers
function escapeHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

// INIT
document.addEventListener('DOMContentLoaded', async () => {
  await adminInit();
});
