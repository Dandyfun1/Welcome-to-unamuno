// 🔧 Replace with your Supabase project values
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const postsDiv = document.getElementById('posts');
const searchInput = document.getElementById('search');
const loginPanel = document.getElementById('loginPanel');
const adminPanel = document.getElementById('adminPanel');

let allPosts = [];

// Load posts
async function loadPosts() {
  const { data, error } = await supabaseClient
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) console.error(error);
  else {
    allPosts = data;
    renderPosts(allPosts);
  }
}

// Render posts
function renderPosts(posts) {
  postsDiv.innerHTML = '';
  posts.forEach(p => {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = `<h3>${p.title}</h3><p>${p.body || ''}</p><small>${(p.tags||[]).join(', ')}</small>`;

    if (!adminPanel.classList.contains('hidden')) {
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => editPost(p);
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.onclick = () => deletePost(p.id);
      div.appendChild(editBtn);
      div.appendChild(delBtn);
    }

    postsDiv.appendChild(div);
  });
}

// Search
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  const filtered = allPosts.filter(p =>
    p.title.toLowerCase().includes(q) ||
    (p.body || '').toLowerCase().includes(q) ||
    (p.tags || []).join(',').toLowerCase().includes(q)
  );
  renderPosts(filtered);
});

// Add/Update post
document.getElementById('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('postId').value;
  const title = document.getElementById('title').value;
  const body = document.getElementById('body').value;
  const tags = document.getElementById('tags').value.split(',').map(t => t.trim());

  if (id) {
    await supabaseClient.from('posts').update({ title, body, tags }).eq('id', id);
  } else {
    await supabaseClient.from('posts').insert([{ title, body, tags }]);
  }

  e.target.reset();
  document.getElementById('postId').value = '';
  loadPosts();
});

function editPost(p) {
  document.getElementById('postId').value = p.id;
  document.getElementById('title').value = p.title;
  document.getElementById('body').value = p.body;
  document.getElementById('tags').value = (p.tags || []).join(',');
}

async function deletePost(id) {
  if (confirm('Delete this post?')) {
    await supabaseClient.from('posts').delete().eq('id', id);
    loadPosts();
  }
}

// Login
document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) alert(error.message);
  else {
    loginPanel.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    loadPosts();
  }
};

// Logout
document.getElementById('logoutBtn').onclick = async () => {
  await supabaseClient.auth.signOut();
  loginPanel.classList.add('hidden');
  adminPanel.classList.add('hidden');
  loadPosts();
};

// Show/hide login panel
document.getElementById('showLoginBtn').onclick = () => {
  document.getElementById('loginPanel').classList.remove('hidden');
};
document.getElementById('cancelLoginBtn').onclick = () => {
  document.getElementById('loginPanel').classList.add('hidden');
};

// Initial load
loadPosts();