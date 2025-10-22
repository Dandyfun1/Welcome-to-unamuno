const SUPABASE_URL = 'https://ddpqzpexcktjtzaqradg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🕒 Live Spanish time
setInterval(() => {
  const now = new Date();
  const options = { weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  document.getElementById('liveTime').textContent = now.toLocaleTimeString('es-ES', options);
}, 1000);

// 📝 Show tablet
document.getElementById('newPostBtn').addEventListener('click', () => {
  document.getElementById('postTablet').classList.remove('hidden');
});

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
  const description = document.getElementById('description').value;
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

  await supabase.from('posts').insert([{ title, link, description, image: imageUrl }]);
  closeTablet();
  loadPosts();
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
      ${post.link ? `<a href="${post.link}" target="_blank">🔗 Enlace</a>` : ''}
      <p>${post.description}</p>
      ${post.image ? `<img src="${post.image}" />` : ''}
    `;
    container.appendChild(div);
  });
}

loadPosts();

// 📅 Calendar logic
const calendar = document.getElementById('calendar');
const eventInput = document.getElementById('eventInput');
const addEventBtn = document.getElementById('
