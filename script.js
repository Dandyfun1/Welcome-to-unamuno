Perfect. Below is your **full fixed JavaScript code**, including:

* ✅ Supabase client setup
* ✅ Definitions for `enableDrag`, `showPanel`, `hidePanel`, `toast`, `escapeHtml`
* ✅ Completion of the `loadEvents()` function
* ✅ Minor cleanup for robustness

You can copy and paste this entire block into your script file or inside a `<script>` tag in HTML.

---

### ✅ Full Fixed JavaScript (UNAMUNO)

<!-- Add this to your HTML HEAD or before the script if not using a bundler -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

```js
// UNAMUNO final setup with draggable post panel and optional thumbnail
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let loggedIn = false;
let eventsCache = [];
let calendarCursor = new Date();

document.addEventListener('DOMContentLoaded', () => {
  const adminPanel = $('#admin-panel');
  const calendarPanel = $('#calendar-panel');
  const postPanel = $('#post-panel');
  const publicPostBtn = $('#public-post-btn');
  const postTitle = $('#post-title');
  const postUsername = $('#post-username');
  const postThumbnail = $('#post-thumbnail');

  enableDrag('#admin-panel','#admin-drag');
  enableDrag('#calendar-panel','#calendar-drag');
  enableDrag('#post-panel','#post-drag');

  init();

  $('#admin-toggle').addEventListener('click', async () => { showPanel('#admin-panel'); await populateAdmin(); });
  $('#admin-close').addEventListener('click', ()=> hidePanel('#admin-panel'));
  $('#calendar-toggle').addEventListener('click', async () => { showPanel('#calendar-panel'); await loadEvents(); renderCalendar(calendarCursor); });
  $('#calendar-close').addEventListener('click', ()=> hidePanel('#calendar-panel'));
  $('#cal-prev').addEventListener('click', ()=> { calendarCursor.setMonth(calendarCursor.getMonth()-1); renderCalendar(calendarCursor); });
  $('#cal-next').addEventListener('click', ()=> { calendarCursor.setMonth(calendarCursor.getMonth()+1); renderCalendar(calendarCursor); });

  $('#login-btn').addEventListener('click', async () => {
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

  $('#logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    hidePanel('#admin-panel');
    toast('Sesión cerrada');
  });

  $('#save-changes').addEventListener('click', async () => {
    if (!loggedIn) return alert('Solo admin.');
    const title = $('#edit-title').value || 'UNAMUNO';
    const sub = $('#edit-sub').value || '';
    const accent = $('#edit-accent').value || '#16a34a';
    const logo = $('#edit-logo').value || null;
    const hero = $('#edit-hero').value || null;
    const { error } = await supabaseClient.from('site_settings').upsert([{
      id: '00000000-0000-0000-0000-000000000001',
      title,
      description: sub,
      accent,
      logo_url: logo,
      hero_url: hero
    }]);
    if (error) return alert('Save failed: ' + error.message);
    document.documentElement.style.setProperty('--accent', accent);
    await loadSiteSettings();
    toast('Configuración guardada');
  });

  $('#export-btn').addEventListener('click', async () => {
    if (!loggedIn) return alert('Solo admin.');
    const { data: items } = await supabaseClient.from('items').select('*');
    const { data: events } = await supabaseClient.from('calendar_events').select('*');
    const payload = { exported_at: new Date().toISOString(), items, events };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unamuno_export_' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  publicPostBtn.addEventListener('click', () => {
    postTitle.value = '';
    postUsername.value = '';
    postThumbnail.value = '';
    showPanel('#post-panel');
  });

  $('#post-close').addEventListener('click', () => hidePanel('#post-panel'));

  $('#post-submit').addEventListener('click', async () => {
    const title = postTitle.value.trim();
    const username = postUsername.value.trim() || 'Anon';
    const thumbnail = postThumbnail.value.trim() || null;
    if (!title) return alert('Título requerido.');
    const { error } = await supabaseClient.from('items').insert([{ title, username, thumbnail_url: thumbnail }]);
    if (error) return alert('Error al publicar: ' + error.message);
    toast('Publicación creada');
    hidePanel('#post-panel');
    await loadItems();
  });

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

  async function init() {
    const { data } = await supabaseClient.auth.getSession();
    loggedIn = !!data?.session;
    updateAuthUI();
    await loadAll();
    supabaseClient.channel('unamuno_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => loadItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => { loadEvents(); toast('Calendario actualizado'); })
      .subscribe();
  }

  function updateAuthUI() {
    $('#controls-area')?.classList.toggle('hidden', !loggedIn);
    if ($('#login-area')) $('#login-area').style.display = loggedIn ? 'none' : 'block';
  }

  async function loadAll() {
    await Promise.all([loadSiteSettings(), loadItems(), loadEvents()]);
  }

  async function loadSiteSettings() {
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
      if (data.logo_url) $('#site-logo').src = data.logo_url;
      if (data.hero_url) document.querySelector('.hero').style.backgroundImage = `url(${data.hero_url})`;
      document.documentElement.style.setProperty('--accent', data.accent || '#16a34a');
    }
  }

  async function loadItems() {
    const { data } = await supabaseClient.from('items')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    const pinned = (data || []).filter(i => i.pinned);
    const normal = (data || []).filter(i => !i.pinned);
    renderPinned(pinned);
    renderItems(normal);
  }

  function renderPinned(items = []) {
    const pinnedArea = $('#pinned-area');
    pinnedArea.innerHTML = '';
   
