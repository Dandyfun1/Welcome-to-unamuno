const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();

  // UI handles
  const fileInput = document.getElementById('fileInput');
  const filesList = document.getElementById('filesList');
  const userStatus = document.getElementById('userStatus');

  const calendarBtn = document.getElementById('calendarBtn');
  const calendarModal = document.getElementById('calendarModal');
  const closeCal = document.getElementById('closeCal');

  const newEventBtn = document.getElementById('newEventBtn');
  const eventModal = document.getElementById('eventModal');
  const cancelEvent = document.getElementById('cancelEvent');
  const saveEvent = document.getElementById('saveEvent');

  const evTitle = document.getElementById('evTitle');
  const evDate = document.getElementById('evDate');
  const evTime = document.getElementById('evTime');
  const evDesc = document.getElementById('evDesc');
  const evCategory = document.getElementById('evCategory');

  const liveSelect = document.getElementById('liveSelect');
  const wallUpload = document.getElementById('wallUpload');

  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const closeSettings = document.getElementById('closeSettings');
  const themeSelect = document.getElementById('themeSelect');
  const liveSelectSettings = document.getElementById('liveSelectSettings');
  const wallUploadSettings = document.getElementById('wallUploadSettings');

  const wallpaperEl = document.getElementById('wallpaper');
  const liveLayer = document.getElementById('liveLayer');

  let calendar;
  let currentUser = null;

  // anonymous auth
  auth.signInAnonymously()
    .then(cred => {
      currentUser = cred.user;
      userStatus.textContent = 'Signed in anonymously — ready to upload';
    })
    .catch(err => {
      console.error('Auth error:', err);
      userStatus.textContent = 'Sign-in failed: ' + err.message;
    });

  // file upload
  fileInput.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const id = 'file_' + Date.now();
    const ref = storage.ref().child('shared/' + id + '_' + f.name);
    const uploadTask = ref.put(f);

    uploadTask.on('state_changed',
      null,
      err => alert('Upload error: ' + err.message),
      async () => {
        const url = await ref.getDownloadURL();
        await db.collection('shared_files').add({
          name: f.name,
          url,
          size: f.size,
          type: f.type,
          uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
          uploaderId: currentUser && currentUser.uid ? currentUser.uid : 'anon'
        });
        fileInput.value = '';
      });
  });

  // render files
  function makeFileCard(doc) {
    const data = doc.data();
    const wrap = document.createElement('div');
    wrap.className = 'file';

    const left = document.createElement('div');
    left.className = 'left';
    left.textContent = (data.name && data.name.split('.').pop().toUpperCase()) || 'FILE';

    const meta = document.createElement('div');
    meta.className = 'meta';

    const title = document.createElement('div');
    title.textContent = data.name;
    title.style.fontWeight = '600';

    const upl = document.createElement('div');
    upl.className = 'uploader-status';
    upl.textContent = data.uploadedAt && data.uploadedAt.toDate ? data.uploadedAt.toDate().toLocaleString() : '';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.marginTop = '8px';

    const previewBtn = document.createElement('button');
    previewBtn.className = 'btn';
    previewBtn.textContent = 'Preview';
    previewBtn.onclick = () => showPreview(data);

    const dl = document.createElement('a');
    dl.href = data.url;
    dl.target = '_blank';
    dl.className = 'btn';
    dl.textContent = 'Download';

    actions.appendChild(previewBtn);
    actions.appendChild(dl);

    meta.appendChild(title);
    meta.appendChild(upl);
    meta.appendChild(actions);

    wrap.appendChild(left);
    wrap.appendChild(meta);

    return wrap;
  }

  function showPreview(data) {
    const existing = document.querySelector('.preview');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.className = 'preview card';

    if (data.type === 'application/pdf') {
      const embed = document.createElement('embed');
      embed.src = data.url;
      embed.type = 'application/pdf';
      embed.style.width = '100%';
      embed.style.height = '100%';
      container.appendChild(embed);
    } else if (data.type && data.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = data.url;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      container.appendChild(img);
    } else if (data.type && data.type.startsWith('text/')) {
      fetch(data.url).then(r => r.text()).then(txt => {
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.padding = '12px';
        pre.textContent = txt;
        container.appendChild(pre);
      });
    } else {
      const p = document.createElement('div');
      p.style.padding = '12px';
      p.textContent = 'No inline preview available — click Download to open in another app.';
      container.appendChild(p);
    }

    filesList.parentNode.insertBefore(container, filesList.nextSibling);
  }

  // live listener for files
  db.collection('shared_files').orderBy('uploadedAt', 'desc').onSnapshot(sn => {
    filesList.innerHTML = '';
    sn.forEach(doc => {
      filesList.appendChild(makeFileCard(doc));
    });
  });

  // Calendar init with real events
  function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      height: 650,
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
      eventClick(info) {
        alert(info.event.title + '\n\n' + (info.event.extendedProps.description || ''));
      }
    });
    calendar.render();

    db.collection('events').orderBy('start', 'asc').onSnapshot(sn => {
      calendar.removeAllEvents();
      sn.forEach(doc => {
        const e = doc.data();
        let start = e.start && e.start.toDate ? e.start.toDate() : (e.start || null);
        let end = e.end && e.end.toDate ? e.end.toDate() : (e.end || null);

        const colorMap = {
          lecture: '#2563eb',
          exam: '#ef4444',
          deadline: '#f59e0b',
          other: '#10b981'
        };
        const ev = {
          id: doc.id,
          title: e.title,
          start,
          end,
          backgroundColor: colorMap[e.category] || colorMap.other,
          borderColor: colorMap[e.category] || colorMap.other,
          textColor: '#fff',
          extendedProps: { description: e.description || '', category: e.category || 'other' }
        };
        calendar.addEvent(ev);
      });
    });
  }

  // Event modal handlers
  calendarBtn.addEventListener('click', () => {
    calendarModal.classList.add('open');
  });
  closeCal.addEventListener('click', () => {
    calendarModal.classList.remove('open');
  });

  newEventBtn.addEventListener('click', () => {
    eventModal.classList.add('open');
  });

  cancelEvent.addEventListener('click', () => {
    eventModal.classList.remove('open');
  });

  saveEvent.addEventListener('click', async () => {
    const title = evTitle.value || 'Untitled';
    const date = evDate.value;
    const time = evTime.value;
    const category = evCategory.value || 'other';
    const description = evDesc.value || '';

    if (!date) {
      alert('Please pick a date');
      return;
    }
    const starts = time ? new Date(date + 'T' + time) : new Date(date + 'T09:00');

    try {
      await db.collection('events').add({
        title,
        start: firebase.firestore.Timestamp.fromDate(starts),
        category,
        description,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser && currentUser.uid ? currentUser.uid : 'anon'
      });
      evTitle.value = ''; evDate.value = ''; evTime.value = ''; evDesc.value = '';
      eventModal.classList.remove('open');
    } catch (err) {
      console.error(err);
      alert('Error saving event: ' + err.message);
    }
  });

  // Settings UI
  settingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = 'block';
  });
  closeSettings.addEventListener('click', () => {
    settingsPanel.style.display = 'none';
  });

  // Theme selection
  document.querySelectorAll('.theme-swatch').forEach(s => s.addEventListener('click', async () => {
    const t = s.getAttribute('data-theme');
    document.getElementById('app').setAttribute('data-theme', t);
    await db.collection('settings').doc('ui').set({ theme: t }, { merge: true });
  }));
  themeSelect.addEventListener('change', async (e) => {
    const t = e.target.value;
    document.getElementById('app').setAttribute('data-theme', t);
    await db.collection('settings').doc('ui').set({ theme: t }, { merge: true });
  }));

  // Live wallpaper selects
  liveSelect.addEventListener('change', async (e) => {
    const v = e.target.value;
    await db.collection('settings').doc('ui').set({ live: v }, { merge: true });
  });
  liveSelectSettings.addEventListener('change', async (e) => {
    const v = e.target.value;
    await db.collection('settings').doc('ui').set({ live: v }, { merge: true });
  });

  function applyLive(val) {
    liveLayer.style.display = 'block';
    if (val === 'stars') {
      liveLayer.style.backgroundImage = 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0.5px, transparent 1px)';
      liveLayer.style.animation = 'twinkle 8s linear infinite';
    } else if (val === 'waves') {
      liveLayer.style.backgroundImage = 'linear-gradient(120deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.0) 60%)';
      liveLayer.style.animation = 'float 10s linear infinite';
    } else {
      liveLayer.style.display = 'none';
    }
  }

  // Upload wallpaper (visible to everyone — saved to storage and written to settings doc)
  wallUpload.addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const id = 'wall_' + Date.now();
    const ref = storage.ref().child('wallpapers/' + id + '_' + f.name);
    const up = ref.put(f);
    up.on('state_changed', null, err => alert('Wallpaper upload error: ' + err.message), async () => {
      const url = await ref.getDownloadURL();
      await db.collection('settings').doc('ui').set({ wallpaperUrl: url }, { merge: true });
      e.target.value = '';
    });
  });

  wallUploadSettings.addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const id = 'wall_' + Date.now();
    const ref = storage.ref().child('wallpapers/' + id + '_' + f.name);
    const up = ref.put(f);
    up.on('state_changed', null, err => alert('Wallpaper upload error: ' + err.message), async () => {
      const url = await ref.getDownloadURL();
      await db.collection('settings').doc('ui').set({ wallpaperUrl: url }, { merge: true });
      e.target.value = '';
    });
  });

  function setWallpaperUrl(url) {
    if (!url) return;
    wallpaperEl.style.backgroundImage = `url(${url})`;
    wallpaperEl.style.backgroundSize = 'cover';
    wallpaperEl.style.backgroundPosition = 'center';
    liveLayer.style.display = 'none';
  }

  // Read settings UI changes from Firestore
  db.collection('settings').doc('ui').onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    if (data.theme) {
      document.getElementById('app').setAttribute('data-theme', data.theme);
      if (themeSelect) themeSelect.value = data.theme;
    }
    if (data.wallpaperUrl) setWallpaperUrl(data.wallpaperUrl);
    if (data.live) {
      if (liveSelect) liveSelect.value = data.live;
      if (liveSelectSettings) liveSelectSettings.value = data.live;
      applyLive(data.live);
    }
  });

  // init calendar then load events
  initCalendar();

  // initial settings snapshot (one-time fallback)
  db.collection('settings').doc('ui').get().then(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    if (d.theme) document.getElementById('app').setAttribute('data-theme', d.theme);
    if (d.live) applyLive(d.live);
    if (d.wallpaperUrl) setWallpaperUrl(d.wallpaperUrl);
  });

  // refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => location.reload());

  // ESC key closes modals / settings
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
      settingsPanel.style.display = 'none';
    }
  });
});
