// Supabase config
const SUPABASE_URL = 'https://ddpqzpexcktjtzaqradg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Load posts
async function loadPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  const postsDiv = document.getElementById('posts');
  postsDiv.innerHTML = '';

  if (data) {
    data.forEach(post => {
      const div = document.createElement('div');
      div.className = 'post';
      div.textContent = post.content;
      postsDiv.appendChild(div);
    });
  }
}

loadPosts();

// Submit post
async function submitPost() {
  const content = document.getElementById('postContent').value;
  if (!content) return;

  const { error } = await supabase.from('posts').insert([{ content }]);
  if (!error) {
    document.getElementById('postContent').value = '';
    loadPosts();
  }
}

// Admin login
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (data.session) {
    document.getElementById('loginMessage').textContent = '✅ Login successful!';
    document.getElementById('postForm').classList.remove('hidden');
  } else {
    document.getElementById('loginMessage').textContent = '❌ Login failed.';
  }
});
