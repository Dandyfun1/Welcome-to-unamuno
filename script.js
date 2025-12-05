/******************************
 * Helpers
 *****************************/
const qs = s => document.querySelector(s);
const storageKey = "class_events_v1";

/******************************
 * Calendar event storage
 *****************************/
function loadEvents() {
    return JSON.parse(localStorage.getItem(storageKey) || "[]");
}
function saveEvents(events) {
    localStorage.setItem(storageKey, JSON.stringify(events));
}
function uid() {
    return "e" + Date.now() + Math.floor(Math.random() * 9999);
}

let calendar;
let editingEvent = null;

/******************************
 * Calendar Setup
 *****************************/
document.addEventListener("DOMContentLoaded", () => {
    const calendarEl = qs("#calendar");

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        height: "100%",
        selectable: true,
        editable: true,
        events: loadEvents(),

        dateClick(info) {
            openEventModal({ date: info.dateStr });
        },

        eventClick(info) {
            const ev = info.event;
            editingEvent = ev.id;
            openEventModal({
                id: ev.id,
                title: ev.title,
                date: ev.startStr.split("T")[0],
                time: ev.startStr.includes("T") ? ev.startStr.split("T")[1].substring(0,5) : "",
                category: ev.extendedProps.category,
                description: ev.extendedProps.description
            });
        },

        eventDrop(info) {
            const ev = info.event;
            let events = loadEvents();
            const idx = events.findIndex(e => e.id === ev.id);
            if (idx !== -1) {
                events[idx].start = ev.start.toISOString();
                saveEvents(events);
            }
        }
    });

    calendar.render();
});

/******************************
 * Event Modal Logic
 *****************************/
const modal = qs("#eventModal");

function openEventModal(data={}) {
    modal.classList.add("open");

    qs("#modalTitle").innerText = data.id ? "Edit Event" : "New Event";

    qs("#evtTitle").value = data.title || "";
    qs("#evtDate").value = data.date || "";
    qs("#evtTime").value = data.time || "";
    qs("#evtDesc").value = data.description || "";
    qs("#evtCategory").value = data.category || "lecture";

    qs("#deleteEvent").style.display = data.id ? "block" : "none";

    editingEvent = data.id || null;
}

qs("#closeEvent").onclick = () => modal.classList.remove("open");

qs("#saveEvent").onclick = () => {
    const title = qs("#evtTitle").value.trim();
    const date = qs("#evtDate").value;
    const time = qs("#evtTime").value;
    const desc = qs("#evtDesc").value.trim();
    const cat = qs("#evtCategory").value;

    if (!title || !date) return alert("Title and date required.");

    const iso = time ? `${date}T${time}` : `${date}`;

    let events = loadEvents();

    if (editingEvent) {
        const idx = events.findIndex(e => e.id === editingEvent);
        events[idx] = {
            ...events[idx],
            title,
            start: new Date(iso).toISOString(),
            description: desc,
            category: cat
        };
    } else {
        events.push({
            id: uid(),
            title,
            start: new Date(iso).toISOString(),
            description: desc,
            category: cat
        });
    }

    saveEvents(events);

    calendar.removeAllEvents();
    calendar.addEventSource(events);

    modal.classList.remove("open");
};

qs("#deleteEvent").onclick = () => {
    if (!confirm("Delete this event?")) return;

    let events = loadEvents().filter(e => e.id !== editingEvent);
    saveEvents(events);

    calendar.getEventById(editingEvent).remove();
    modal.classList.remove("open");
};

/******************************
 * File Upload
 *****************************/
const uploadBtn = qs("#uploadBtn");
const uploadFile = qs("#uploadFile");
const fileList = qs("#fileList");

uploadBtn.onclick = () => uploadFile.click();

uploadFile.onchange = () => {
    const file = uploadFile.files[0];
    if (!file) return;

    const row = document.createElement("div");
    row.className = "file-row";
    row.innerHTML = `<strong>${file.name}</strong> (${(file.size/1024).toFixed(1)} KB)`;

    fileList.querySelector(".placeholder")?.remove();
    fileList.appendChild(row);

    uploadFile.value = "";
};

/******************************
 * Wallpaper & theme
 *****************************/
const bg = qs("#background");

qs("#wallpaperInput").onchange = () => {
    const f = wallpaperInput.files[0];
    if (!f) return;

    const r = new FileReader();
    r.onload = e => bg.style.backgroundImage = `url(${e.target.result})`;
    r.readAsDataURL(f);
};

qs("#accentPicker").oninput = e =>
    document.documentElement.style.setProperty("--accent", e.target.value);

qs("#themeSelect").onchange = e =>
    document.body.setAttribute("data-theme", e.target.value);

qs("#wallpaperFX").onchange = e => {
    const v = e.target.value;

    if (v === "none") bg.style.filter = "none";
    if (v === "stars") bg.style.filter = "drop-shadow(0 0 2px white)";
    if (v === "waves") bg.style.filter = "blur(2px) brightness(1.1)";
};
