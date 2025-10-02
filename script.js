// 🔧 Replace with your Supabase project details
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const postsDiv = document.getElementById("posts");
const addBtn = document.getElementById("add-btn");

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
    div.innerHTML = `<strong>${post.title}</strong><br>${post.description || ""}`;
    postsDiv.appendChild(div);
  });
}

// Add post
addBtn.onclick = async () => {
  const title = prompt("Enter post title:");
  if (!title) return;
  const desc = prompt("Enter description:");
  let { error } = await supabaseClient.from("items").insert([{ title, description: desc }]);
  if (error) {
    alert("Error adding post: " + error.message);
    console.error(error);
  } else {
    loadPosts();
  }
};

// Initial load
loadPosts();
