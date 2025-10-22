// Supabase setup
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Live clock
setInterval(() => {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString();
}, 1000);

// Show tablet
document.getElementById('newPostBtn').addEventListener('click', () => {
  document.getElementById('postTablet').classList.remove('hidden');
});

// Close tablet
function closeTablet() {
  document.getElementById('postTablet').classList.add('hidden');
}

// Image preview
document.getElementById('imageUpload').addEventListener('change', function () {
  const file = this.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    document.getElementById('imagePreview').innerHTML = `<img src="${e.target.result}" />`;
  };
  if (file) reader.readAsDataURL(file);
});

// Submit post
async function submitPost() {
  const title = document.getElementById('thumbnail').value;
  const link = document.getElementById('link').value;
  const image = document.getElementById('imageUpload').files[0];

  let imageUrl = '';
  if (image) {
    const { data, error } = await supabase.storage
      .from('images')
      .upload(`public/${Date.now()}_${image.name}`, image);

    if (!error) {
      const { publicUrl } = supabase.storage.from('images').getPublicUrl(data.path);
      imageUrl = publicUrl;
    }
  }

  await supabase.from('posts').insert([{ title, link, image: imageUrl }]);
  closeTablet();
  loadPosts();
}

// Load posts
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

// Admin-only settings panel (example logic)
supabase.auth.getSession().then(({ data }) => {
  if (data.session?.user?.email === 'admin@yourdomain.com') {
    document.getElementById('settingsPanel').classList.remove('hidden');
  }
});
