const SUPABASE_URL="https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";
const supabase = supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
let loggedIn=false;

document.addEventListener('DOMContentLoaded',()=>{

  // Login / Logout
  $('#login-btn').addEventListener('click',login);
  $('#logout-btn').addEventListener('click',logout);

  // Modals
  $('#create-post-btn').addEventListener('click',()=>$('#modal-backdrop').classList.remove('hidden'));
  $('#post-cancel').addEventListener('click',()=>$('#modal-backdrop').classList.add('hidden'));
  $('#post-submit').addEventListener('click',submitPost);

  $('#open-settings-btn').addEventListener('click',()=>$('#settings-backdrop').classList.remove('hidden'));
  $('#revert-changes').addEventListener('click',()=>$('#settings-backdrop').classList.add('hidden'));
  $('#save-changes').addEventListener('click',saveSettings);

  loadAll();
});

// ---------- Auth ----------
async function login(){
  const email=($('#email-input').value||'').trim();
  if(!email)return alert('Ingrese email');
  const password=prompt('Contraseña:');
  if(!password)return;
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error)return alert(error.message);
  loggedIn=!!data.session;
  updateAuthUI();
}

async function logout(){
  await supabase.auth.signOut();
  loggedIn=false;
  updateAuthUI();
}

function updateAuthUI(){
  $('#login-area').classList.toggle('hidden',loggedIn);
  $('#user-area').classList.toggle('hidden',!loggedIn);
  $('#create-post-btn').classList.toggle('hidden',!loggedIn);
  $('#open-settings-btn').classList.toggle('hidden',!loggedIn);
  if(loggedIn)$('#user-email').textContent=$('#email-input').value;
  else $('#user-email').textContent='';
}

// ---------- Load Data ----------
async function loadAll(){
  await Promise.all([loadSiteSettings(),loadItems(),loadEvents()]);
}

async function loadSiteSettings(){
  const {data}=await supabase.from('site_settings').select('*').eq('id','00000000-0000-0000-0000-000000000001').maybeSingle();
  if(data){
    $('#site-title').textContent=data.title||'UNAMUNO';
    $('#site-sub').textContent=data.description||'';
    $('#edit-title').value=data.title||'';
    $('#edit-sub').value=data.description||'';
    $('#edit-accent').value=data.accent||'#16a34a';
    if(data.logo_url)$('#site-logo').src=data.logo_url;
    if(data.hero_url)document.querySelector('.hero').style.backgroundImage=`url(${data.hero_url})`;
    document.documentElement.style.setProperty('--accent',data.accent||'#16a34a');
  }
}

async function loadItems(){
  const {data}=await supabase.from('items').select('*').order('pinned',{ascending:false}).order('created_at',{ascending:false});
  renderItems(data||[]);
}

async function loadEvents(){
  const {data}=await supabase.from('calendar_events').select('*').order('start_time',{ascending:true});
  const container=$('#upcoming-events');
  container.innerHTML='';
  (data||[]).forEach(ev=>{
    const div=document.createElement('div');
    div.className='post';
    div.innerHTML=`<strong>${ev.title}</strong> <small>${new Date(ev.start_time).toLocaleString()}</small>`;
    container.appendChild(div);
  });
}

// ---------- Post Submit ----------
async function submitPost(){
  const title=$('#post-title').value.trim();
  const username=$('#post-username').value.trim()||'Anon';
  const thumbnail=$('#post-thumbnail').value.trim()||null;
  if(!title)return alert('Título requerido');
  const {error}=await supabase.from('items').insert([{title,username,thumbnail_url:thumbnail}]);
  if(error)return alert(error.message);
  toast('Publicación creada');
  $('#modal-backdrop').classList.add('hidden');
  $('#post-title').value='';$('#post-username').value='';$('#post-thumbnail').value='';
  await loadItems();
}

// ---------- Save Site Settings ----------
async function saveSettings(){
  const title=$('#edit-title').value||'UNAMUNO';
  const description=$('#edit-sub').value||'';
  const accent=$('#edit-accent').value||'#16a34a';
  const logo=$('#edit-logo').value||null;
  const hero=$('#edit-hero').value||null;
  const {error}=await supabase.from('site_settings').upsert([{
    id:'00000000-0000-0000-0000-000000000001',
    title,description,accent,logo_url:logo,hero_url:hero
  }]);
  if(error)return alert(error.message);
  document.documentElement.style.setProperty('--accent',accent);
  toast('Configuración guardada');
  $('#settings-backdrop').classList.add('hidden');
}

// ---------- Toast ----------
function toast(msg){
  const t=$('#toast');
  t.textContent=msg;
  t.classList.remove('hidden');
  setTimeout(()=>t.classList.add('hidden'),2500);
}

// ---------- Render Items ----------
function renderItems(items=[]){
  const container=$('#items-list');
  container.innerHTML='';
  items.forEach(i=>{
    const div=document.createElement('div');
    div.className='post';
    div.innerHTML=`
      ${i.thumbnail_url?`<img src="${i.thumbnail_url}" />`:''}
      <div><strong>${i.title}</strong><br/><small>${i.username}</small></div>
    `;
    container.appendChild(div);
  });
}
