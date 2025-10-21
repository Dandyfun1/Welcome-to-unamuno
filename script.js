const SUPABASE_URL="https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ"; // Replace with your Supabase anon key
const supabase=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

const $=s=>document.querySelector(s);
let loggedIn=false;
let posts=[]; // Will fetch from Supabase later

document.addEventListener('DOMContentLoaded',()=>{
  enableDrag('#post-panel');
  enableDrag('#admin-panel');

  // Buttons
  $('#login-btn').addEventListener('click',login);
  $('#logout-btn').addEventListener('click',logout);
  $('#create-post-btn').addEventListener('click',()=>$('#post-panel').classList.remove('hidden'));
  $('#post-close').addEventListener('click',()=>$('#post-panel').classList.add('hidden'));
  $('#open-settings-btn').addEventListener('click',()=>$('#admin-panel').classList.remove('hidden'));
  $('#admin-close').addEventListener('click',()=>$('#admin-panel').classList.add('hidden'));
  $('#save-changes').addEventListener('click',saveSettings);
  $('#post-submit').addEventListener('click',createPost);

  checkSession();
  loadPosts();
});

function enableDrag(panelSelector){
  const panel=$(panelSelector);
  const handle=panel.querySelector('.drag-handle');
  let offsetX,offsetY,dragging=false;
  handle.addEventListener('mousedown',e=>{dragging=true;offsetX=e.clientX-panel.offsetLeft;offsetY=e.clientY-panel.offsetTop;handle.style.cursor='grabbing';});
  document.addEventListener('mousemove',e=>{if(dragging){panel.style.left=(e.clientX-offsetX)+'px';panel.style.top=(e.clientY-offsetY)+'px';}});
  document.addEventListener('mouseup',e=>{dragging=false;handle.style.cursor='grab';});
}

// ---------------- Auth ----------------
async function checkSession(){
  const {data}=await supabase.auth.getSession();
  if(data.session){
    loggedIn=true;
    updateAuthUI();
  }
}

async function login(){
  const email=($('#pw-input').value||'').trim();
  if(!email) return alert('Ingrese email');
  const password=prompt('Contraseña:');
  if(!password) return;

  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error) return alert('Error: '+error.message);
  if(data.session){
    loggedIn=true;
    updateAuthUI();
    toast('Sesión iniciada');
  } else {
    alert('No se pudo iniciar sesión');
  }
}

async function logout(){
  await supabase.auth.signOut();
  loggedIn=false;
  updateAuthUI();
  toast('Sesión cerrada');
}

function updateAuthUI(){
  $('#login-area').classList.toggle('hidden',loggedIn);
  $('#controls-area').classList.toggle('hidden',!loggedIn);
}

// ---------------- Posts ----------------
async function loadPosts(){
  const {data,error}=await supabase.from('items').select('*').order('created_at',{ascending:false});
  if(error) return toast('Error cargando publicaciones');
  posts=data||[];
  renderPosts();
}

async function createPost(){
  const title=($('#post-title').value||'').trim();
  const username=($('#post-username').value||'Anon').trim();
  if(!title) return alert('Ingrese título');

  const {error}=await supabase.from('items').insert([{title,username}]);
  if(error) return toast('Error al crear publicación');
  
  $('#post-panel').classList.add('hidden');
  $('#post-title').value=''; $('#post-username').value='';
  toast('Publicación creada');
  loadPosts();
}

function renderPosts(){
  const container=$('#posts-list');
  container.innerHTML='';
  posts.forEach(p=>{
    const div=document.createElement('div');
    div.className='post';
    div.innerHTML=`<strong>${p.title}</strong><br/><small>${p.username}</small>`;
    container.appendChild(div);
  });
}

// ---------------- Settings ----------------
async function saveSettings(){
  const title=$('#edit-title').value||'UNAMUNO';
  const accent=$('#edit-accent').value||'#16a34a';

  const {error}=await supabase.from('site_settings').upsert([{
    id:'00000000-0000-0000-0000-000000000001',
    title,
    accent
  }]);

  if(error) return toast('Error guardando configuración');
  $('#site-title').textContent=title;
  document.documentElement.style.setProperty('--accent',accent);
  $('#admin-panel').classList.add('hidden');
  toast('Configuración guardada');
}

// ---------------- Toast ----------------
function toast(msg){
  const t=$('#toast');
  t.textContent=msg;
  t.classList.remove('hidden');
  setTimeout(()=>t.classList.add('hidden'),2000);
}
