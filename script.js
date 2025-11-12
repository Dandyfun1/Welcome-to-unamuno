// === POPUPS ===
const popups = {
  pres: document.getElementById('presentation-popup'),
  cal: document.getElementById('calendar-popup'),
  set: document.getElementById('settings-popup')
};

document.getElementById('open-presentations').onclick = () => showPopup(popups.pres);
document.getElementById('open-calendar').onclick = () => showPopup(popups.cal);
document.getElementById('open-settings').onclick = () => showPopup(popups.set);

document.querySelectorAll('.close-popup').forEach(btn => {
  btn.onclick = () => btn.closest('.popup').style.display = 'none';
});

function showPopup(popup) {
  popup.style.display = 'block';
  popup.style.opacity = 0;
  popup.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
  popup.style.opacity = 1;
}

// === DRAGGABLE POPUPS ===
document.querySelectorAll('.popup').forEach(popup => {
  const header = popup.querySelector('.popup-header');
  let isDragging = false, offsetX, offsetY;
  header.addEventListener('mousedown', e => {
    isDragging = true;
    offsetX = e.clientX - popup.offsetLeft;
    offsetY = e.clientY - popup.offsetTop;
  });
  document.addEventListener('mouseup', () => isDragging = false);
  document.addEventListener('mousemove', e => {
    if (isDragging) {
      popup.style.left = (e.clientX - offsetX) + 'px';
      popup.style.top = (e.clientY - offsetY) + 'px';
    }
  });
});

// === PRESENTATIONS ===
const addBtn = document.getElementById('add-presentation');
const linkInput = document.getElementById('slides-link');
const container = document.getElementById('presentations');
let presentations = JSON.parse(localStorage.getItem('presentations')) || [];

function renderPresentations() {
  container.innerHTML = '';
  presentations.forEach(url => {
    const embed = url.replace(/\/edit.*$/, '/embed');
    const card = document.createElement('div');
    card.className = 'presentation-card';
    card.innerHTML = `
      <iframe src="${embed}" allowfullscreen></iframe>
      <a href="${url}" target="_blank">Abrir Presentación</a>
    `;
    container.appendChild(card);
  });
}

addBtn.onclick = () => {
  const link = linkInput.value.trim();
  if (!link.includes('docs.google.com/presentation')) {
    alert('Pega un enlace válido de Google Presentaciones');
    return;
  }
  presentations.push(link);
  localStorage.setItem('presentations', JSON.stringify(presentations));
  linkInput.value = '';
  renderPresentations();
};

renderPresentations();

// === CALENDAR ===
const calendarEl = document.getElementById('calendar');
const eventDateInput = document.getElementById('event-date');
const eventTitleInput = document.getElementById('event-title');
const addEventBtn = document.getElementById('add-event');
let events = JSON.parse(localStorage.getItem('events')) || {};

function renderCalendar() {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  calendarEl.innerHTML = '';

  const daysOfWeek = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  daysOfWeek.forEach(d => {
    const el = document.createElement('div');
    el.textContent = d;
    el.style.fontWeight = 'bold';
    calendarEl.appendChild(el);
  });

  const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  for (let i = 0; i < offset; i++) calendarEl.appendChild(document.createElement('div'));

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.textContent = day;
    cell.classList.add('day');
    if (events[dateStr]) cell.classList.add('event-day');
    cell.onclick = () => {
      alert(events[dateStr] ? `Eventos:\n${events[dateStr].join('\n')}` : 'Sin eventos.');
    };
    calendarEl.appendChild(cell);
  }
}

addEventBtn.onclick = () => {
  const date = eventDateInput.value;
  const title = eventTitleInput.value.trim();
  if (!date || !title) return alert('Completa todos los campos');
  if (!events[date]) events[date] = [];
  events[date].push(title);
  localStorage.setItem('events', JSON.stringify(events));
  renderCalendar();
  eventDateInput.value = '';
  eventTitleInput.value = '';
};

renderCalendar();

// === SETTINGS ===
const lightBtn = document.getElementById('light-theme');
const darkBtn = document.getElementById('dark-theme');
const setBgBtn = document.getElementById('set-background');
const resetBgBtn = document.getElementById('reset-background');
const bgInput = document.getElementById('background-url');

function applySettings() {
  const theme = localStorage.getItem('theme') || 'dark';
  const bg = localStorage.getItem('background');
  document.body.classList.toggle('light', theme === 'light');
  if (bg) document.body.style.backgroundImage = `url('${bg}')`;
  else document.body.style.backgroundImage = '';
}

lightBtn.onclick = () => {
  localStorage.setItem('theme', 'light');
  applySettings();
};

darkBtn.onclick = () => {
  localStorage.setItem('theme', 'dark');
  applySettings();
};

setBgBtn.onclick = () => {
  const url = bgInput.value.trim();
  if (url) {
    localStorage.setItem('background', url);
    applySettings();
  } else {
    alert('Pega un enlace válido de imagen o GIF.');
  }
};

resetBgBtn.onclick = () => {
  localStorage.removeItem('background');
  applySettings();
};

applySettings();
