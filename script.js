// 🔧 Replace with your Supabase project details
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const postsDiv = document.getElementById("posts");
const addBtn = document.getElementById("add-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const statusSpan = document.getElementById("status");

let loggedIn = false;

// Load posts
async function loadPosts() {
  let { data, error } = await supabaseClient
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading posts:", error);
    return;
  }

  postsDiv.innerHTML = "";
  data.forEach(post => {
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `
      <strong>${post.title}</strong><br>${post.description || ""}
      ${loggedIn ? `<br><button class="danger" data-id="${post.id}">Delete</button>` : ""}
    `;
    postsDiv.appendChild(div);
  });

  if (loggedIn) {
    document.querySelectorAll(".danger").forEach(btn => {
      btn.onclick = async e => {
        const id = e.target.getAttribute("data-id");
        if (confirm("Delete this post?")) {
          const { error } = await supabaseClient.from("items").delete().eq("id", id);
          if (error) {
            alert("Delete failed:\n" + JSON.stringify(error, null, 2));
          }
          loadPosts();
        }
      };
    });
  }
}

// Add post (public)
addBtn.onclick = async () => {
  const title = prompt("Enter post title:");
  if (!title) return;
  const desc = prompt("Enter description:");
  let { error } = await supabaseClient.from("items").insert([{ title, description: desc }]);
  if (error) {
    alert("Error adding post:\n" + JSON.stringify(error, null, 2));
  } else {
    loadPosts();
  }
};

// Login
loginBtn.onclick = async () => {
  const email = prompt("Enter your admin email:");
  const password = prompt("Enter your password:");
  if (!email || !password) return;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  
  if (error) {
    alert("Login failed:\n" + JSON.stringify(error, null, 2));
    console.error("Login error:", error);
    return;
  }

  if (data.session) {
    loggedIn = true;
    statusSpan.textContent = "Admin";
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    loadPosts();
  } else {
    alert("Login failed: No session returned");
    console.warn("Login response:", data);
  }
};

// Logout
logoutBtn.onclick = async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    alert("Logout error:\n" + JSON.stringify(error, null, 2));
    console.error("Logout error:", error);
  }
  loggedIn = false;
  statusSpan.textContent = "Public";
  loginBtn.style.display = "inline-block";
  logoutBtn.style.display = "none";
  loadPosts();
};

// Check session on load
supabaseClient.auth.getSession().then(({ data }) => {
  loggedIn = !!data.session;
  statusSpan.textContent = loggedIn ? "Admin" : "Public";
  loginBtn.style.display = loggedIn ? "none" : "inline-block";
  logoutBtn.style.display = loggedIn ? "inline-block" : "none";
  loadPosts();
});
