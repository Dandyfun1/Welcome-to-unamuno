const SUPABASE_URL = 'https://ddpqzpexcktjtzaqradg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

// Analog clock
setInterval(() => {
  const now = new Date();
  const sec = now.getSeconds();
  const min = now.getMinutes();
  const hr = now.getHours();
  document.getElementById('secondHand').setAttribute('transform', `rotate(${sec * 6} 50 50)`);
  document.getElementById('minuteHand').setAttribute('transform', `rotate(${min * 6} 50 50)`);
  document.getElementById('hourHand').setAttribute('transform', `rotate(${(hr % 12) * 30 + min * 0.5} 50 50)`);
}, 1000);

// Show post tablet
document.getElementById('newPostBtn').addEventListener('click', () => {
  document.getElementById('postTablet').classList.remove('hidden');
});

// Close tablet
function closeTablet() {
  document.getElementById('postTablet').classList.add('hidden');
}

// Drag & drop image
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

// Submit post
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

  await supabase.from('posts').insert([{ title, link, image: imageUrl }]);
  closeTablet();
  loadPosts();
});

// Load posts
async function loadPosts() {
  const { data } = await
