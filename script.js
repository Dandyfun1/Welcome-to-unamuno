// -------------------- Supabase Setup --------------------
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ"; // replace with your Supabase anon key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -------------------- DOM Elements --------------------
const loginArea = document.getElementById('login-area');
const adminPanel = document.getElementById('admin-panel');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');

// -------------------- Event Listeners --------------------
loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);

// -------------------- Functions --------------------
async function login() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) return alert('Enter email and password');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Login error: ' + error.message);

  if (data.session) {
    showAdminPanel();
  } else {
    alert('Login failed. Check credentials.');
  }
}

async function logout() {
  await supabase.auth.signOut();
  adminPanel.style.display = 'none';
  logoutBtn.style.display = 'none';
  loginArea.style.display = 'block';
}

function showAdminPanel() {
  loginArea.style.display = 'none';
  adminPanel.style.display = 'block';
  logoutBtn.style.display = 'inline-block';
}

// -------------------- Check Session on Page Load --------------------
(async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    showAdminPanel();
  }
})();
