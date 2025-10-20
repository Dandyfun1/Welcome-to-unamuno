// ===============================
// main.js — UNAMUNO (Supabase-ready)
// ===============================

// --- CONFIG: Replace these values if needed (kept same as you provided) ---
const SUPABASE_URL = 'https://ddpqzpexcktjtzaqradg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ';

if (!window.supabase) {
  console.error('Supabase client library not loaded. Make sure <script src="https://unpkg.com/@supabase/supabase-js"></script> is included.');
}

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// --- small helpers ---
const el = id => document.getElementById(id);
const showToast = (msg, timeout = 3000) => {
  const container = el('notifications');
  if (!container) return alert(msg);
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), timeout);
};

// --- SITE SETTINGS ---
async function loadSiteSettings() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    if (error && error.code !== 'PGRST116') { // some supabase errors vary; still log
      console.warn('site_settings load warning:', error.message || error);
    }
    const s = data || {};
    if (el('site-title')) el('site-title').textContent = s.title || 'UNAMUNO';
    if (el('site-description')) el('site-description').textContent = s.description || '';
    if (s.accent) document.documentElement.style.setProperty('--accent', s.accent);
    if (s.logo_url && el('site-logo')) el('site-logo').src = s.logo_url;
  } catch (err) {
    console.error('Failed to load site settings', err);
  }
}

// --- POSTS (load + render) ---
async function loadPosts() {
  const postsContainer = el('posts');
  if (!postsContainer) return;
  postsContainer.innerHTML = 'Loading posts...';

  if (!supabase) {
    postsContainer.innerHTML = '<p>Supabase not available.</p>';
    return;
  }

  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading posts:', error);
      postsContainer.innerHTML = '<p>Failed to load posts.</p>';
      return;
    }

    postsContainer.innerHTML = '';
    if (!data || data.length === 0) {
      postsContainer.innerHTML = '<p>No posts yet.</p>';
      return;
    }

    data.forEach(post => {
      const card = document.createElement('div');
      card.className = 'post card';

      // thumbnail (if exists)
      const thumbHtml = post.thumbnail_url ? `<img class="thumb" src="${escapeHtml(post.thumbnail_url)}" alt="thumbnail" onerror="this.style.display='none'">` : '';

      // link if present
      const linkHtml = post.link ? `<p><a href="${escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(post.link)}</a></p>` : '';

      // pinned icon
      const pinnedIcon = post.pinned ? ' 📌' : '';

      const created = post.created_at ? new Date(post.created_at).toLocaleString() : '';

      card.innerHTML = `
        ${thumbHtml}
        <h3>${escapeHtml(post.title)}</h3>
        ${linkHtml}
        <small>${created}${pinnedIcon}</small>
      `;
      postsContainer.appendChild(card);
    });
  } catch (err) {
    console.error('Exception loading posts:', err);
    postsContainer.innerHTML = '<p>Unexpected error loading posts.</p>';
  }
}

// --- CREATE POST (from panel) ---
async function createPost() {
  const title = el('post-title')?.value?.trim() || '';
  const link = el('post-link')?.value?.trim() || null;
  const thumbnail = el('post-thumbnail')?.value?.trim() || null;
  const pinned = !!el('post-pinned')?.checked;

  if (!title) {
    showToast('Please enter a title.');
    return;
  }

  if (!supabase) {
    showToast('Supabase client not configured.');
    return;
  }

  // Basic validation for thumbnail: if present, check it looks like a URL
  if (thumbnail && !isLikelyUrl(thumbnail)) {
    showToast('Thumbnail does not look like a valid URL. Paste a full URL (https://...).');
    return;
  }

  // Insert
  try {
    const { error } = await supabase
      .from('items')
      .insert([{ title, link, thumbnail_url: thumbnail, pinned }]);

    if (error) {
      console.error('Create post error:', error);
      showToast('Failed to create post. See console for details.');
      return;
    }

    showToast('Post created!');
    clearPanelInputs();
    togglePanel(false);
    // best-effort refresh
    setTimeout(loadPosts, 300);
  } catch (err) {
    console.error('Exception inserting post:', err);
    showToast('Unexpected error creating post.');
  }
}

// --- CALENDAR: load + create ---
async function loadCalendar() {
  const container = el('calendar');
  if (!container) return;
  container.innerHTML = 'Loading events...';

  if (!supabase) {
    container.innerHTML = '<p>Supabase not available.</p>';
    return;
  }

  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error loading calendar:', error);
      container.innerHTML = '<p>Failed to load events.</p>';
      return;
    }

    container.innerHTML = '';
    if (!data || data.length === 0) {
      container.innerHTML = '<p>No events yet.</p>';
      return;
    }

    data.forEach(ev => {
      const div = document.createElement('div');
      div.className = 'calendar-event';
      div.innerHTML = `<b>${escapeHtml(ev.title)}</b> — ${escapeHtml(ev.event_date)}<br><small>${escapeHtml(ev.note || '')}</small>`;
      container.appendChild(div);
    });

  } catch (err) {
    console.error('Exception loading calendar:', err);
    container.innerHTML = '<p>Unexpected error loading events.</p>';
  }
}

async function createEvent() {
  const date = el('event-date')?.value;
  const title = el('event-title')?.value?.trim();
  const note = el('event-note')?.value?.trim();

  if (!date || !title) {
    showToast('Please set event date and title.');
    return;
  }

  if (!supabase) {
    showToast('Supabase not configured.');
    return;
  }

  try {
    const { error } = await supabase
      .from('calendar_events')
      .insert([{ event_date: date, title, note }]);

    if (error) {
      console.error('Create event error:', error);
      showToast('Failed to add event.');
      return;
    }

    showToast('Event added!');
    el('event-date').value = '';
    el('event-title').value = '';
    el('event-note').value = '';
    loadCalendar();
  } catch (err) {
    console.error('Exception creating event:', err);
    showToast('Unexpected error creating event.');
  }
}

// --- PANEL UI / DRAGGING ---
function togglePanel(show = true) {
  const panel = el('post-panel');
  if (!panel) return;
  panel.classList.toggle('hidden', !show);
  if (show) {
    // focus title when opened
    setTimeout(() => el('post-title')?.focus(), 120);
  }
}

function clearPanelInputs() {
  if (el('post-title')) el('post-title').value = '';
  if (el('post-link')) el('post-link').value = '';
  if (el('post-thumbnail')) el('post-thumbnail').value = '';
  if (el('post-pinned')) el('post-pinned').checked = false;
  if (el('thumb-preview')) el('thumb-preview').innerHTML = '';
}

(function makeDraggable() {
  const panel = el('post-panel');
  const header = el('panel-header');
  if (!panel || !header) return;

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener('mousedown', e => {
    dragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  function onMove(e) {
    if (!dragging) return;
    panel.style.left = Math.max(8, e.clientX - offsetX) + 'px';
    panel.style.top = Math.max(8, e.clientY - offsetY) + 'px';
  }

  function onUp() {
    dragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }

  // Touch support
  header.addEventListener('touchstart', e => {
    const t = e.touches[0];
    dragging = true;
    offsetX = t.clientX - panel.offsetLeft;
    offsetY = t.clientY - panel.offsetTop;
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  });

  function onTouchMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const t = e.touches[0];
    panel.style.left = Math.max(8, t.clientX - offsetX) + 'px';
    panel.style.top = Math.max(8, t.clientY - offsetY) + 'px';
  }

  function onTouchEnd() {
    dragging = false;
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }
})();

// --- Thumbnail preview (live) ---
function setupThumbnailPreview() {
  const thumbInput = el('post-thumbnail');
  const preview = el('thumb-preview');
  if (!thumbInput || !preview) return;
  thumbInput.addEventListener('input', () => {
    const url = thumbInput.value.trim();
    preview.innerHTML = '';
    if (!url) return;
    if (!isLikelyUrl(url)) {
      preview.textContent = 'Thumbnail does not look like a valid URL.';
      return;
    }
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    img.style.maxHeight = '160px';
    img.onerror = () => {
      preview.textContent = 'Failed to load preview image.';
    };
    img.onload = () => preview.appendChild(img);
  });
}

// --- Utility helpers ---
function isLikelyUrl(s) {
  try {
    if (!s) return false;
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  // Load core data
  loadSiteSettings();
  loadPosts();
  loadCalendar();

  // Events
  const openBtn = el('open-panel-btn');
  const closeBtn = el('close-panel-btn');
  const createBtn = el('create-post-btn');
  const clearBtn = el('clear-panel-btn');
  const createEventBtn = el('create-event-btn');

  if (openBtn) openBtn.addEventListener('click', () => togglePanel(true));
  if (closeBtn) closeBtn.addEventListener('click', () => togglePanel(false));
  if (createBtn) createBtn.addEventListener('click', createPost);
  if (clearBtn) clearBtn.addEventListener('click', clearPanelInputs);
  if (createEventBtn) createEventBtn.addEventListener('click', createEvent);

  setupThumbnailPreview();
});
