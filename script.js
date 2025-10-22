const SUPABASE_URL = 'https://ddpqzpexcktjtzaqradg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🌙 Theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

// 🕒 Analog clock
setInterval(() => {
  const now = new Date();
  const sec = now.getSeconds();
  const min = now.getMinutes();
  const hr = now.getHours();
  document.getElementById('secondHand').setAttribute('transform', `rotate(${sec * 6} 50 50)`);
  document.getElementById('minuteHand').setAttribute('transform', `rotate(${min * 6} 50 50)`);
  document.getElementById('hourHand').setAttribute('transform', `rotate(${(hr % 12) * 30 + min * 0.5} 50 50)`);
}, 1000);

// 📝 Show post tablet
document.getElementById('newPostBtn').addEventListener('click', () => {
  document.getElementById('postTablet').classList.remove('hidden');
});

// ❌ Close tablet
function closeTablet() {
  document.getElementById('postTablet').classList.add('hidden');
}

// 🧼 Drag & drop image
const dropZone = document.getElementById('dropZone');
const imageUpload = document.getElementById('imageUpload');
dropZone.addEventListener('click', () => imageUpload.click());
dropZone.addEventListener('dragover', e => e.preventDefault());
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  imageUpload.files = e.dataTransfer.files;
  previewImage();
});
imageUpload.addEventListener('change', previewImage);

function previewImage() {
  const file = imageUpload.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('imagePreview').innerHTML = `<img src="${e.target.result}" />`;
  };
  if (file) reader.readAsDataURL(file);
}

// 📤 Submit post
document.getElementById('submitBtn').addEventListener('click', async () => {
  const title = document.getElementById('thumbnail').value;
  const link = document.getElementById('link').value;
  const image = imageUpload.files[0];
  let imageUrl = '';

  if (image) {
    const { data, error } = await supabase.storage
      .from('images')
      .upload(`public/${Date.now()}_${image.name}`, image);
    if (!error) {
      imageUrl = supabase.storage.from('images').getPublicUrl(data.path).publicUrl;
    }
  }

  const { error } = await supabase.from('posts').insert([{ title, link, image: imageUrl }]);
  if (!error) {
    closeTablet();
    loadPosts();
  }
});

// 📚 Load posts
async function loadPosts() {
  const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  const container = document.getElementById('posts');
  container.innerHTML = '';

  data.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = `
      <h3>${post.title}</h3>
      ${post.link ? `<a href="${post.link}" target="_blank">🔗 Link</a>` : ''}
      ${post.image ? `<img src="${post.image}" />` : ''}
    `;
    container.appendChild(div);
  });
}

loadPosts();

// 📅 Calendar logic
document.getElementById('calendar').valueAsDate = new Date();
document.getElementById('addEventBtn').addEventListener('click', async () => {
  const date = document.getElementById('calendar').value;
  const description = document.getElementById('eventInput').value;
  if (!date || !description) return;

  const { error } = await supabase.from('events').insert([{ event_date: date, description }]);
  if (!error) {
    document.getElementById('eventInput').value = '';
    loadEvents(date);
  }
});

document.getElementById('calendar').addEventListener('change', e => {
  loadEvents(e.target.value);
});

async function loadEvents(date) {
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('event_date', date)
    .order('created_at', { ascending: true });

  const list = document.getElementById('eventList');
  list.innerHTML = '';
  data.forEach(event => {
    const item = document.createElement('div');
    item.textContent = `📌 ${event.description}`;
    list.appendChild(item);
  });
}

// 🔐 Admin-only settings panel
supabase.auth.getSession().then(({ data }) => {
  if (data.session?.user?.email === 'admin@yourdomain.com') {
    document.getElementById('settingsPanel').classList.remove('hidden');
  }
});
