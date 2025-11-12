// ======= PRESENTATION HANDLING =======
const addBtn = document.getElementById('add-presentation');
const linkInput = document.getElementById('slides-link');
const container = document.getElementById('presentations');
let presentations = JSON.parse(localStorage.getItem('presentations')) || [];

function renderPresentations() {
  container.innerHTML = '';
  presentations.forEach(url => {
    const card = document.createElement('div');
    card.className = 'presentation-card';
    
    // Convert standard Google Slides link into embeddable one
    let embedUrl = url;
    if (url.includes('/edit')) {
      embedUrl = url.replace('/edit', '/embed');
    } else if (url.includes('/view')) {
      embedUrl = url.replace('/view', '/embed');
    }

    card.innerHTML = `
      <iframe src="${embedUrl}" allowfullscreen></iframe>
      <a href="${url}" target="_blank">Abrir Presentación</a>
    `;
    container.appendChild(card);
  });
}

addBtn.addEventListener('click', () => {
  const link = linkInput.value.trim();
  if (!link || !link.includes('docs.google.com/presentation')) {
    alert('Por favor, pega un enlace válido de Google Presentaciones.');
    return;
  }
  presentations.push(link);
  localStorage.setItem('presentations', JSON.stringify(presentations));
  linkInput.value = '';
  renderPresentations();
});

renderPresentations();

// ======= CALENDAR POPUP =======
const openCalendarBtn = document.getElementById('open-calendar');
const calendarPopup = document.getElementById('calendar-popup');
const closePopup = document.querySelector('.close-popup');

openCalendarBtn.addEventListener('click', () => {
  calendarPopup.style.display = 'block';
});
closePopup.addEventListener('click', () => {
  calendarPopup.style.display = 'none';
});

// ======= DRAGGABLE POPUP =======
const header = calendarPopup.querySelector('.popup-header');
let offsetX, offsetY, isDragging = false;

header.addEventListener('mousedown', e => {
  isDragging = true;
  offsetX = e.clientX - calendarPopup.offsetLeft;
  offsetY = e.clientY - calendarPopup.offsetTop;
});

document.addEventListener('mouseup', () => isDragging = false);
document.addEventListener('mousemove', e => {
  if (isDragging) {
    calendarPopup.style.left = (e.clientX - offsetX) + 'px';
    calendarPopup.style.top = (e.clientY - offsetY) + 'px';
  }
});

// ======= CALENDAR =======
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

  const emptyDays = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  for (let i = 0; i < emptyDays; i++) {
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
