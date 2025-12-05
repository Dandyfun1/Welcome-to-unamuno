// ====== SETTINGS PANEL ======
const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");
const closeSettings = document.getElementById("close-settings");

settingsBtn.onclick = () => settingsPanel.style.display = "block";
closeSettings.onclick = () => settingsPanel.style.display = "none";

document.getElementById("theme-color").oninput = (e) => {
    document.documentElement.style.setProperty("--theme", e.target.value);
};

// Wallpaper upload
document.getElementById("wallpaper-upload").onchange = function() {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.body.style.backgroundImage = `url(${e.target.result})`;
    };
    reader.readAsDataURL(file);
};



// ====== FILES SECTION ======
document.getElementById("file-upload").onchange = function() {
    const file = this.files[0];
    if (!file) return;

    const li = document.createElement("li");
    li.textContent = file.name;
    document.getElementById("file-list").appendChild(li);
};



// ====== CALENDAR POPUP ======
const calendarPopup = document.getElementById("calendar-popup");

document.getElementById("calendar-btn").onclick = () => {
    calendarPopup.style.display = "block";
};

document.getElementById("close-calendar").onclick = () => {
    calendarPopup.style.display = "none";
};

// New event form
document.getElementById("add-event-btn").onclick = () => {
    document.getElementById("event-form").style.display = "block";
};

document.getElementById("cancel-event").onclick = () => {
    document.getElementById("event-form").style.display = "none";
};

// Save event
document.getElementById("save-event").onclick = () => {
    const title = document.getElementById("event-title").value;
    const date = document.getElementById("event-date").value;

    if (!title || !date) {
        alert("Please fill all fields");
        return;
    }

    const eventBox = document.createElement("div");
    eventBox.innerHTML = `<strong>${title}</strong> - ${date}`;
    eventBox.style.padding = "8px 0";

    document.getElementById("calendar-events").appendChild(eventBox);

    document.getElementById("event-form").style.display = "none";
};
