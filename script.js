// app.js

// Calendar popup
document.getElementById('calendar-btn').addEventListener('click', () => {
  document.getElementById('calendar-popup').style.display = 'block';
});

document.getElementById('close-calendar').addEventListener('click', () => {
  document.getElementById('calendar-popup').style.display = 'none';
});

// File upload broadcast (GitHub Pages can't push real-time updates)
// This simulates auto-refreshing using localStorage

document.getElementById('upload').addEventListener('change', function() {
  const file = this.files[0];
  if (file) {
    const item = document.createElement('li');
    item.textContent = file.name;
    document.getElementById('file-list').appendChild(item);

    localStorage.setItem('lastUpload', Date.now());
  }
});

// Check for updates every 5 seconds
setInterval(() => {
  if (localStorage.getItem('lastUpload') != window.lastSeenUpload) {
    window.lastSeenUpload = localStorage.getItem('lastUpload');
    location.reload();
  }
}, 5000);

// Theme & wallpaper customization

document.getElementById('theme-select').addEventListener('change', function() {
  document.documentElement.style.setProperty('--theme-color', this.value);
});

document.getElementById('wallpaper').addEventListener('change', function() {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      document.documentElement.style.setProperty('--background-image', `url(${e.target.result})`);
    };
    reader.readAsDataURL(file);
  }
});
