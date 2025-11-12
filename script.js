// --- Calendar Popup ---
document.getElementById('open-calendar').addEventListener('click', () => {
  document.getElementById('calendar-popup').style.display = 'block';
});

document.querySelector('.close-popup').addEventListener('click', () => {
  document.getElementById('calendar-popup').style.display = 'none';
});

// --- Draggable Popup ---
const popup = document.getElementById('calendar-popup');
const header = popup.querySelector('.popup-header');
let offsetX, offsetY, isDragging = false;

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

// --- Google Slides Posting & Preview ---
const addBtn = document.getElementById('add-presentation');
const linkInput = document.getElementById('slides-link');
const container = document.getElementById('presentations');

let presentations = JSON.parse(localStorage.getItem('presentations')) || [];

function renderPresentations() {
  container.innerHTML = '';
  presentations.forEach(url => {
    const card = document.createElement('div');
    card.className = 'presentation-card';

    const embedUrl = url.includes('docs.google.com/presentation')
      ? url.replace('/edit', '/embed')
      : url;

    card.innerHTML = `
      <iframe src="${embedUrl}" allowfullscreen></iframe>
      <a href="${url}" target="_blank">Abrir Presentación</a>
    `;
    container.appendChild(card);
  });
}

addBtn.addEventListener('click', () => {
  const link = linkInput.value.trim();
  if (!link.includes('docs.google.com/presentation')) {
    alert('Por favor, pega un enlace válido de Google Presentaciones.');
    return;
  }
  presentations.push(link);
  localStorage.setItem('presentations', JSON.stringify(presentations));
  linkInput.value = '';
  renderPresentations();
});

renderPresentations();

// --- Calendar ---
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
  daysOfWeek.forEach(day => {
    const div = document.createElement('div');
    div.textContent = day;
    div.style.fontWeight = 'bold';
    div.style.background = '#eee';
    calendarEl.appendChild(div);
  });

  for (let i = 0; i < firstDay.getDay() - 1; i++) {
    const empty = document.createElement('div');
    calendarEl.appendChild(empty);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const div = document.createElement('div');
    div.textContent = day;
    div.classList.add('day');
    if (events[dateStr]) div.classList.add('event-day');

    div.addEventListener('click', () => {
      if (events[dateStr]) {
        alert(`Eventos en esta fecha:\n${events[dateStr].join('\n')}`);
      } else {
        alert('No hay eventos en esta fecha.');
      }
    });

    calendarEl.appendChild(div);
  }
}

addEventBtn.addEventListener('click', () => {
  const date = eventDateInput.value;
  const title = eventTitleInput.value.trim();
  if (date && title) {
    if (!events[date]) events[date] = [];
    events[date].push(title);
    localStorage.setItem('events', JSON.stringify(events));
    renderCalendar();
    eventDateInput.value = '';
    eventTitleInput.value = '';
  } else {
    alert('Por favor completa todos los campos.');
  }
});

renderCalendar();
