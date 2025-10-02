// 🔧 Replace with your Supabase project details
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
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
