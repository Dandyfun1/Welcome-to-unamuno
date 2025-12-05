// ========== SETTINGS PANEL ==========
document.getElementById("settings-btn").onclick = () => {
    document.getElementById("settings-panel").style.display = "block";
};

document.getElementById("close-settings").onclick = () => {
    document.getElementById("settings-panel").style.display = "none";
};

// Theme color
document.getElementById("theme-picker").oninput = (e) => {
    document.documentElement.style.setProperty("--theme-color", e.target.value);
};

// Live wallpaper (CSS animations later)
document.getElementById("live-wallpaper").onchange = (e) => {
    const value = e.target.value;

    if (value === "stars") {
        document.body.style.backgroundImage = "url('https://i.imgur.com/7rV9c4F.gif')";
    } else if (value === "grid") {
        document.body.style.backgroundImage = "url('https://i.imgur.com/nG1h9yq.gif')";
    } else {
        document.body.style.backgroundImage = "";
    }
};

// Custom wallpaper upload
document.getElementById("custom-wallpaper").onchange = function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.body.style.backgroundImage = `url(${e.target.result})`;
    };
    reader.readAsDataURL(file);
};

// ========== FILE UPLOAD (LOCAL for NOW) ==========
document.getElementById("file-upload").onchange = function () {
    const file = this.files[0];
    if (!file) return;

    const li = document.createElement("li");
    li.textContent = file.name;
    document.getElementById("file-list").appendChild(li);
};

// ========== CALENDAR ==========
document.getElementById("calendar-btn").onclick = () => {
    document.getElementById("calendar-popup").style.display = "block";
};

document.getElementById("close-calendar").onclick = () => {
    document.getElementById("calendar-popup").style.display = "none";
};

document.getElementById("add-event-btn").onclick = () => {
    document.getElementById("event-form").style.display = "block";
};

// Save event (local for now)
document.getElementById("save-event").onclick = () => {
    const title = document.getElementById("event-title").value;
    const date = document.getElementById("event-date").value;
    const type = document.getElementById("event-type").value;

    if (!title || !date) return alert("Missing info!");

    const eventBox = document.createElement("div");
    eventBox.className = "event";

    const colors = {
        lecture: "#4d9cff",
        exam: "#ff5d5d",
        deadline: "#ffb84d",
        other: "#8f8fff",
    };

    eventBox.style.borderLeft = `5px solid ${colors[type]}`;
    eventBox.style.padding = "10px";
    eventBox.style.margin = "8px 0";

    eventBox.innerHTML = `<strong>${title}</strong> — ${date}`;

    document.getElementById("calendar-events").appendChild(eventBox);

    document.getElementById("event-form").style.display = "none";
};

document.getElementById("cancel-event").onclick = () => {
    document.getElementById("event-form").style.display = "none";
};
