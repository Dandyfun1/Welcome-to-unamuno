// Global variables
let currentDate = new Date();
let selectedDate = null;
let events = JSON.parse(localStorage.getItem('calendarEvents')) || {};
let posts = JSON.parse(localStorage.getItem('publicPosts')) || [];
let currentView = 'calendar';
let editingEventId = null;

// Spanish month names
const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// DOM elements
const elements = {
    currentMonth: document.getElementById('currentMonth'),
    calendarDays: document.getElementById('calendarDays'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),
    todayBtn: document.getElementById('todayBtn'),
    toggleView: document.getElementById('toggleView'),
    selectedDate: document.getElementById('selectedDate'),
    dayEvents: document.getElementById('dayEvents'),
    addEventBtn: document.getElementById('addEventBtn'),
    eventModal: document.getElementById('eventModal'),
    postModal: document.getElementById('postModal'),
    calendarSection: document.getElementById('calendarSection'),
    postsSection: document.getElementById('postsSection'),
    postsContainer: document.getElementById('postsContainer'),
    newPostBtn: document.getElementById('newPostBtn')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeCalendar();
    initializeEventHandlers();
    renderPosts();
    selectToday();
});

// Calendar functions
function initializeCalendar() {
    updateCalendarHeader();
    renderCalendar();
}

function updateCalendarHeader() {
    elements.currentMonth.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Previous month days
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    let daysHTML = '';
    
    // Previous month's trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        daysHTML += `<div class="day other-month" data-date="${year}-${month}-${day}">${day}</div>`;
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month + 1}-${day}`;
        const isToday = isDateToday(year, month, day);
        const isSelected = selectedDate && selectedDate === dateStr;
        const hasEvents = events[dateStr] && events[dateStr].length > 0;
        
        let classes = 'day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (hasEvents) classes += ' has-events';
        
        daysHTML += `<div class="${classes}" data-date="${dateStr}">${day}</div>`;
    }
    
    // Next month's leading days
    const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (startingDayOfWeek + daysInMonth);
    
    for (let day = 1; day <= remainingCells; day++) {
        daysHTML += `<div class="day other-month" data-date="${year}-${month + 2}-${day}">${day}</div>`;
    }
    
    elements.calendarDays.innerHTML = daysHTML;
    
    // Add click handlers to days
    document.querySelectorAll('.day').forEach(day => {
        day.addEventListener('click', function() {
            if (!this.classList.contains('other-month')) {
                selectDate(this.dataset.date);
            }
        });
    });
}

function isDateToday(year, month, day) {
    const today = new Date();
    return year === today.getFullYear() && 
           month === today.getMonth() && 
           day === today.getDate();
}

function selectDate(dateStr) {
    selectedDate = dateStr;
    renderCalendar();
    updateSelectedDateDisplay();
    renderDayEvents();
}

function selectToday() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    selectDate(dateStr);
}

function updateSelectedDateDisplay() {
    if (selectedDate) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        elements.selectedDate.textContent = date.toLocaleDateString('es-ES', options);
    }
}

function renderDayEvents() {
    const dayEvents = events[selectedDate] || [];
    
    if (dayEvents.length === 0) {
        elements.dayEvents.innerHTML = '<p class="no-events">No hay eventos para este día</p>';
        return;
    }
    
    const eventsHTML = dayEvents.map(event => `
        <div class="event-item ${event.color}" data-event-id="${event.id}">
            <div class="event-title">${event.title}</div>
            ${event.time ? `<div class="event-time">${event.time}</div>` : ''}
            ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
        </div>
    `).join('');
    
    elements.dayEvents.innerHTML = eventsHTML;
    
    // Add click handlers to events
    document.querySelectorAll('.event-item').forEach(item => {
        item.addEventListener('click', function() {
            editEvent(this.dataset.eventId);
        });
    });
}

// Event management
function showEventModal(eventId = null) {
    editingEventId = eventId;
    const modal = elements.eventModal;
    const form = document.getElementById('eventForm');
    const title = document.getElementById('modalTitle');
    const deleteBtn = document.getElementById('deleteEventBtn');
    
    if (eventId) {
        // Edit mode
        const event = findEventById(eventId);
        if (event) {
            title.textContent = 'Editar Evento';
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventDescription').value = event.description || '';
            document.getElementById('eventTime').value = event.time || '';
            document.getElementById('eventColor').value = event.color || 'red';
            deleteBtn.classList.remove('hidden');
        }
    } else {
        // Add mode
        title.textContent = 'Agregar Evento';
        form.reset();
        deleteBtn.classList.add('hidden');
    }
    
    modal.classList.add('show');
}

function hideEventModal() {
    elements.eventModal.classList.remove('show');
    editingEventId = null;
}

function saveEvent(eventData) {
    if (!selectedDate) return;
    
    if (!events[selectedDate]) {
        events[selectedDate] = [];
    }
    
    if (editingEventId) {
        // Update existing event
        const eventIndex = events[selectedDate].findIndex(e => e.id === editingEventId);
        if (eventIndex !== -1) {
            events[selectedDate][eventIndex] = { ...eventData, id: editingEventId };
        }
    } else {
        // Add new event
        const newEvent = {
            ...eventData,
            id: Date.now().toString()
        };
        events[selectedDate].push(newEvent);
    }
    
    saveEventsToStorage();
    renderCalendar();
    renderDayEvents();
    hideEventModal();
}

function deleteEvent() {
    if (!editingEventId || !selectedDate) return;
    
    events[selectedDate] = events[selectedDate].filter(e => e.id !== editingEventId);
    
    if (events[selectedDate].length === 0) {
        delete events[selectedDate];
    }
    
    saveEventsToStorage();
    renderCalendar();
    renderDayEvents();
    hideEventModal();
}

function editEvent(eventId) {
    showEventModal(eventId);
}

function findEventById(eventId) {
    if (!selectedDate || !events[selectedDate]) return null;
    return events[selectedDate].find(e => e.id === eventId);
}

function saveEventsToStorage() {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
}

// Posts management
function showPostModal() {
    const modal = elements.postModal;
    const form = document.getElementById('postForm');
    form.reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('linkPreview').innerHTML = '';
    modal.classList.add('show');
}

function hidePostModal() {
    elements.postModal.classList.remove('show');
}

function savePost(postData) {
    const newPost = {
        ...postData,
        id: Date.now().toString(),
        date: new Date().toISOString()
    };
    
    posts.unshift(newPost);
    savePostsToStorage();
    renderPosts();
    hidePostModal();
}

function renderPosts() {
    if (posts.length === 0) {
        elements.postsContainer.innerHTML = '<p class="no-posts">No hay publicaciones aún</p>';
        return;
    }
    
    const postsHTML = posts.map(post => {
        const date = new Date(post.date);
        const formattedDate = date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="post-item">
                <div class="post-header">
                    <div>
                        <div class="post-title">${post.title}</div>
                        <div class="post-date">${formattedDate}</div>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
                ${post.linkPreview ? `
                    <a href="${post.link}" target="_blank" class="post-link">
                        <div class="link-title">${post.linkPreview.title}</div>
                        <div class="link-description">${post.linkPreview.description}</div>
                        <div class="link-url">${post.link}</div>
                    </a>
                ` : ''}
            </div>
        `;
    }).join('');
    
    elements.postsContainer.innerHTML = postsHTML;
}

function savePostsToStorage() {
    localStorage.setItem('publicPosts', JSON.stringify(posts));
}

// View management
function toggleView() {
    if (currentView === 'calendar') {
        currentView = 'posts';
        elements.calendarSection.classList.add('hidden');
        elements.postsSection.classList.remove('hidden');
        elements.toggleView.innerHTML = '<i class="fas fa-calendar-alt"></i> Calendario';
    } else {
        currentView = 'calendar';
        elements.calendarSection.classList.remove('hidden');
        elements.postsSection.classList.add('hidden');
        elements.toggleView.innerHTML = '<i class="fas fa-comments"></i> Publicaciones';
    }
}

// Utility functions
async function fetchLinkPreview(url) {
    try {
        // This is a simplified version - in a real app you'd use a service like linkpreview.net
        // For demo purposes, we'll create a mock preview
        const domain = new URL(url).hostname;
        return {
            title: `Enlace a ${domain}`,
            description: `Contenido de ${domain}`,
            image: null
        };
    } catch (error) {
        return null;
    }
}

function handleImageUpload(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

// Event handlers
function initializeEventHandlers() {
    // Calendar navigation
    elements.prevMonth.addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendarHeader();
        renderCalendar();
    });
    
    elements.nextMonth.addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendarHeader();
        renderCalendar();
    });
    
    elements.todayBtn.addEventListener('click', function() {
        currentDate = new Date();
        updateCalendarHeader();
        renderCalendar();
        selectToday();
    });
    
    // View toggle
    elements.toggleView.addEventListener('click', toggleView);
    
    // Event modal
    elements.addEventBtn.addEventListener('click', () => showEventModal());
    document.getElementById('closeModal').addEventListener('click', hideEventModal);
    document.getElementById('deleteEventBtn').addEventListener('click', deleteEvent);
    
    // Event form
    document.getElementById('eventForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const eventData = {
            title: formData.get('eventTitle') || document.getElementById('eventTitle').value,
            description: document.getElementById('eventDescription').value,
            time: document.getElementById('eventTime').value,
            color: document.getElementById('eventColor').value
        };
        saveEvent(eventData);
    });
    
    // Post modal
    elements.newPostBtn.addEventListener('click', showPostModal);
    document.getElementById('closePostModal').addEventListener('click', hidePostModal);
    
    // Post form
    document.getElementById('postForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const imageFile = document.getElementById('postImage').files[0];
        const link = document.getElementById('postLink').value;
        
        const postData = { title, content };
        
        if (imageFile) {
            postData.image = await handleImageUpload(imageFile);
        }
        
        if (link) {
            postData.link = link;
            postData.linkPreview = await fetchLinkPreview(link);
        }
        
        savePost(postData);
    });
    
    // Image preview
    document.getElementById('postImage').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('imagePreview');
        
        if (file) {
            const imageUrl = await handleImageUpload(file);
            preview.innerHTML = `<img src="${imageUrl}" alt="Preview">`;
        } else {
            preview.innerHTML = '';
        }
    });
    
    // Link preview
    document.getElementById('postLink').addEventListener('blur', async function(e) {
        const url = e.target.value;
        const preview = document.getElementById('linkPreview');
        
        if (url) {
            const linkData = await fetchLinkPreview(url);
            if (linkData) {
                preview.innerHTML = `
                    <div class="link-title">${linkData.title}</div>
                    <div class="link-description">${linkData.description}</div>
                    <div class="link-url">${url}</div>
                `;
            }
        } else {
            preview.innerHTML = '';
        }
    });
    
    // Modal close on backdrop click
    elements.eventModal.addEventListener('click', function(e) {
        if (e.target === this) {
            hideEventModal();
        }
    });
    
    elements.postModal.addEventListener('click', function(e) {
        if (e.target === this) {
            hidePostModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideEventModal();
            hidePostModal();
        }
    });
}
