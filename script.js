// --- Popup Controls ---
document.getElementById('open-presentation').addEventListener('click', () => {
  document.getElementById('presentation-popup').style.display = 'block';
});

document.getElementById('open-calendar').addEventListener('click', () => {
  document.getElementById('calendar-popup').style.display = 'block';
});

document.querySelectorAll('.close-popup').forEach(btn => {
  btn.addEventListener('click', e => {
    e.target.closest('.popup').style.display = 'none';
  });
});

// --- Draggable Popups ---
document.querySelectorAll('.popup').forEach(popup => {
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
});

// --- File Upload Preview ---
const uploadInput = document.getElementById('upload-file');
const iframe = document.getElementById('file-frame');

uploadInput.addEventListener('change', () => {
  const file = uploadInput.files[0];
  if (!file) return;

  const fileURL = URL.createObjectURL(file);
  if (file.type === "application/pdf") {
    iframe.src = fileURL;
  } else if (file.name.endsWith(".ppt") || file.name.endsWith(".pptx")) {
    alert("Las presentaciones PPTX se mostrarán al convertirlas en línea o descargarlas.");
    iframe.src = "https://view.officeapps.live.com/op/embed.aspx?src=" + encodeURIComponent(fileURL);
  } else {
    alert("Por favor sube un archivo PDF o PPTX válido.");
  }
});

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
    div.style.borderRadius = '4px';
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
