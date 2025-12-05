// script.js — FullCalendar local version + UI glue
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- helpers ---------- */
  const qs = sel => document.querySelector(sel);
  const qsa = sel => Array.from(document.querySelectorAll(sel));
  const storageKey = 'cs_events_v1';

  const colorMap = {
    lecture: '#2563eb',
    exam:    '#ef4444',
    deadline:'#f59e0b',
    other:   '#10b981'
  };

  function loadEvents() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('loadEvents error', e);
      return [];
    }
  }
  function saveEvents(events) {
    localStorage.setItem(storageKey, JSON.stringify(events));
  }

  function uid() { return 'e_' + Date.now() + '_' + Math.floor(Math.random()*9999); }

  /* ---------- UI elements ---------- */
  const openCalendarBtn = qs('#openCalendarBtn');
  const calendarModal = qs('#calendarModal');
  const closeCalendar = qs('#closeCalendar');
  const calendarEl = qs('#calendar');

  const eventModal = qs('#eventModal');
  const evtTitle = qs('#evtTitle');
  const evtDate = qs('#evtDate');
  const evtTime = qs('#evtTime');
  const evtDesc = qs('#evtDesc');
  const evtCategory = qs('#evtCategory');
  const eventModalTitle = qs('#eventModalTitle');
  const saveEventBtn = qs('#saveEventBtn');
  const cancelEventBtn = qs('#cancelEventBtn');
  const deleteEventBtn = qs('#deleteEventBtn');

  const settingsToggle = qs('#settingsToggle');
  const settingsPanel = qs('#settingsPanel');
  const closeSettingsBtn = qs('#closeSettingsBtn');
  const themeSelect = qs('#themeSelect');
  const accentColor = qs('#accentColor');
  const wallUploadSettings = qs('#wallUploadSettings');

  const newEventBtn = qs('#newEventBtn');

  const wallpaperEl = qs('#wallpaper');
  const wallUpload = qs('#wallUpload');

  const fileUploadInput = qs('#fileUploadInput');
  const filesList = qs('#filesList');
  const refreshBtn = qs('#refreshBtn');

  /* ---------- Calendar setup (FullCalendar) ---------- */
  let calendar;
  let editingEventId = null; // if editing existing event

  function buildCalendar() {
    const initialEvents = loadEvents().map(ev => {
      // convert to FullCalendar event object
      return {
        id: ev.id,
        title: ev.title,
        start: ev.start,
        allDay: !!ev.allDay,
        backgroundColor: colorMap[ev.category] || colorMap.other,
        borderColor: colorMap[ev.category] || colorMap.other,
        extendedProps: { description: ev.description, category: ev.category }
      };
    });

    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      height: 650,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listWeek'
      },
      editable: true,
      selectable: true,
      events: initialEvents,
      dateClick(info) {
        // open add form with preselected date
        openEventModal({ date: info.dateStr });
      },
      eventClick(info) {
        // open edit modal
        const ev = info.event;
        openEventModal({
          id: ev.id,
          title: ev.title,
          date: ev.startStr ? ev.startStr.split('T')[0] : ev.startStr,
          time: ev.startStr && ev.startStr.includes('T') ? ev.startStr.split('T')[1].slice(0,5) : '',
          description: ev.extendedProps.description || '',
          category: ev.extendedProps.category || 'other'
        });
      },
      eventDrop(info) {
        // update storage after drag/drop
        const ev = info.event;
        const events = loadEvents();
        const idx = events.findIndex(x => x.id === ev.id);
        if (idx > -1) {
          events[idx].start = ev.start.toISOString();
          events[idx].allDay = ev.allDay;
          saveEvents(events);
        }
      }
    });

    calendar.render();
  }

  /* ---------- event modal (add / edit) ---------- */
  function openEventModal(data = {}) {
    editingEventId = data.id || null;
    eventModalTitle.textContent = editingEventId ? 'Edit Event' : 'New Event';
    evtTitle.value = data.title || '';
    evtDate.value = data.date || '';
    evtTime.value = data.time || '';
    evtDesc.value = data.description || '';
    evtCategory.value = data.category || 'lecture';
    deleteEventBtn.style.display = editingEventId ? 'inline-block' : 'none';
    eventModal.classList.add('open');
  }
  function closeEventModal() {
    editingEventId = null;
    eventModal.classList.remove('open');
  }

  saveEventBtn.addEventListener('click', () => {
    const title = evtTitle.value.trim();
    const date = evtDate.value;
    const time = evtTime.value;
    const description = evtDesc.value.trim();
    const category = evtCategory.value;

    if (!title || !date) {
      alert('Please provide a title and date.');
      return;
    }

    // construct ISO string
    let iso = date;
    let allDay = true;
    if (time) {
      iso = date + 'T' + time;
      allDay = false;
    }

    const events = loadEvents();

    if (editingEventId) {
      // update existing
      const idx = events.findIndex(e => e.id === editingEventId);
      if (idx > -1) {
        events[idx].title = title;
        events[idx].start = new Date(iso).toISOString();
        events[idx].allDay = allDay;
        events[idx].description = description;
        events[idx].category = category;
      }
    } else {
      // new event
      const newEv = {
        id: uid(),
        title,
        start: new Date(iso).toISOString(),
        allDay,
        description,
        category
      };
      events.push(newEv);
    }

    saveEvents(events);

    // refresh calendar events quickly
    calendar.removeAllEvents();
    const again = loadEvents().map(ev => ({
      id: ev.id,
      title: ev.title,
      start: ev.start,
      allDay: ev.allDay,
      backgroundColor: colorMap[ev.category] || colorMap.other,
      borderColor: colorMap[ev.category] || colorMap.other,
      extendedProps: { description: ev.description, category: ev.category }
    }));
    calendar.addEventSource(again);

    closeEventModal();
  });

  cancelEventBtn.addEventListener('click', () => closeEventModal());

  deleteEventBtn.addEventListener('click', () => {
    if (!editingEventId) return;
    if (!confirm('Delete this event?')) return;
    let events = loadEvents();
    events = events.filter(e => e.id !== editingEventId);
    saveEvents(events);
    calendar.getEventById(editingEventId)?.remove();
    closeEventModal();
  });

  /* ---------- Settings & wallpaper ---------- */
  settingsToggle.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
  });
  closeSettingsBtn.addEventListener('click', () => settingsPanel.style.display = 'none');

  themeSelect.addEventListener('change', (e) => {
    document.getElementById('appRoot').setAttribute('data-theme', e.target.value);
  });

  accentColor.addEventListener('input', (e) => {
    const c = e.target.value;
    document.documentElement.style.setProperty('--accent', c);
  });

  wallUploadSettings.addEventListener('change', function () {
    const f = this.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      wallpaperEl.style.backgroundImage = `url(${ev.target.result})`;
    };
    r.readAsDataURL(f);
  });

  wallUpload.addEventListener('change', function () {
    const f = this.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      wallpaperEl.style.backgroundImage = `url(${ev.target.result})`;
    };
    r.readAsDataURL(f);
  });

  /* quick built-in live backgrounds (no external network) */
  qs('#liveSelect').addEventListener('change', (e) => {
    const v = e.target.value;
    if (v === 'stars') {
      wallpaperEl.style.backgroundImage = "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 0.6px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.03) 0.6px, transparent 1px)";
      wallpaperEl.style.backgroundSize = '150px 150px, 120px 120px';
    } else if (v === 'waves') {
      wallpaperEl.style.backgroundImage = "repeating-linear-gradient(120deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.00) 8px)";
      wallpaperEl.style.backgroundSize = '200% 200%';
    } else {
      wallpaperEl.style.backgroundImage = '';
    }
  });

  /* ---------- Files (local-only) ---------- */
  fileUploadInput.addEventListener('change', function () {
    const f = this.files[0]; if (!f) return;
    // show file in list (no upload backend)
    const row = document.createElement('div');
    row.className = 'file-row';
    const left = document.createElement('div'); left.className = 'file-left'; left.textContent = f.name.split('.').pop().toUpperCase();
    const meta = document.createElement('div'); meta.innerHTML = `<strong>${f.name}</strong><div style="font-size:12px;color:var(--muted)">${(f.size/1024).toFixed(1)} KB</div>`;
    row.appendChild(left); row.appendChild(meta);
    // replace placeholder
    const ph = filesList.querySelector('.placeholder');
    if (ph) ph.remove();
    filesList.appendChild(row);
    this.value = '';
  });

  /* ---------- other buttons ---------- */
  openCalendarBtn.addEventListener('click', () => calendarModal.classList.add('open'));
  closeCalendar.addEventListener('click', () => calendarModal.classList.remove('open'));

  newEventBtn.addEventListener('click', () => openEventModal());

  refreshBtn.addEventListener('click', () => location.reload());

  // close modals on ESC
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { document.querySelectorAll('.modal').forEach(m => m.classList.remove('open')); settingsPanel.style.display = 'none'; } });

  /* ---------- init ---------- */
  buildCalendar();

  // ensure UI reflects existing settings if any
  const evs = loadEvents();
  if (evs.length === 0) {
    // add a sample event for first-time users
    const sample = {
      id: uid(),
      title: 'Welcome — click a date to create events',
      start: new Date().toISOString(),
      allDay: true,
      description: 'This calendar is stored locally (your browser). When ready we can add Firebase to sync across devices.',
      category: 'other'
    };
    evs.push(sample);
    saveEvents(evs);
    calendar.addEvent({
      id: sample.id, title: sample.title, start: sample.start,
      backgroundColor: colorMap[sample.category], borderColor: colorMap[sample.category], extendedProps: { description: sample.description, category: sample.category }
    });
  }
});
