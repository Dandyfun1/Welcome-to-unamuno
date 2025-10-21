const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
let loggedIn=false;

document.addEventListener('DOMContentLoaded', async ()=>{
  ['#post-panel-drag','#calendar-panel-drag','#admin-panel-drag'].forEach(enableDrag);

  // Buttons
  $('#login-btn')?.addEventListener('click', login);
  $('#logout-btn')?.addEventListener('click', logout);
  $('#create-post-btn')?.addEventListener('click', ()=>$('#post-panel-drag').classList.remove('hidden'));
  $('#create-event-btn')?.addEventListener('click', ()=>$('#calendar-panel-drag').classList.remove('hidden'));
  $('#open-settings-btn')?.addEventListener('click', ()=>$('#admin-panel-drag').classList.remove('hidden'));
  $('#admin-close')?.addEventListener('click', ()=>$('#admin-panel-drag').classList.add('hidden'));
  $('#save-changes')?.addEventListener('click', saveSettings);
  $('#search-btn')?.addEventListener('click', searchPosts);
  $('#search-input')?.addEventListener('keyup', e=>{if(e.key==='Enter') searchPosts();});

  await init();
});

function enableDrag(panelSelector){
  const panel=$(panelSelector);
  const handle=panel.querySelector('.drag-handle');
  let offsetX,offsetY,dragging=false;

  handle.addEventListener('mousedown',e=>{
    dragging=true;
    offsetX=e.clientX-panel.offsetLeft;
    offsetY=e.clientY-panel.offsetTop;
    handle.style.cursor='grabbing';
  });

  document.addEventListener('mousemove',e=>{
    if(dragging){
      panel.style.left=(e.clientX-offsetX)+'px';
      panel.style.top=(e.clientY-offsetY)+'px';
    }
  });

  document.addEventListener('mouseup',e=>{
    dragging=false;
    handle.style.cursor='grab';
  });
}

async function init(){
  const {data} = await supabase.auth.getSession();
  loggedIn=!!data?.session;
  updateAuthUI();
  await loadAll();

  supabase.channel('unamuno_ch')
    .on('postgres_changes',{event:'*',schema:'public',table:'items'},()=>loadItems())
    .on('postgres_changes',{event:'*',schema:'public',table:'calendar_events'},()=>loadEvents())
    .subscribe();
}

function updateAuthUI(){
  $('#login-area')?.classList.toggle('hidden', loggedIn);
  $('#controls-area')?.classList.toggle('hidden', !loggedIn);
}

async function loadAll(){ await Promise.all([loadSiteSettings(), loadItems(), loadEvents()]); }

async function loadSiteSettings(){
  const {data} = await supabase.from('site_settings').select('*').eq('id','00000000-0000-0000-0000-000000000001').maybeSingle();
  if(data){
    $('#site-title').textContent=data.title||'UNAMUNO';
    $('#site-sub').textContent=data.description||'';
    $('#edit-title').value=data.title||'';
    $('#edit-sub').value=data.description||'';
    $('#edit-accent').value=data.accent||'#16a34a';
    $('#edit-logo').value=data.logo_url||'';
    $('#edit-hero').value=data.hero_url||'';
    if(data.logo_url) $('#site-logo').src=data.logo_url;
    document.documentElement.style.setProperty('--accent',data.accent||'#16a34a');
  }
}

async function saveSettings(){
  if(!loggedIn)return alert('Solo admin');
  const title=$('#edit-title').value||'UNAMUNO';
  const description=$('#edit-sub').value||'';
  const accent=$('#edit-accent').value||'#16a34a';
  const logo=$('#edit-logo').value||null;
  const hero=$('#edit-hero').value||null;

  const {error}=await supabase.from('site_settings').upsert([{
    id:'00000000-0000-0000-0000-000000000001', title, description, accent, logo_url:logo, hero_url:hero
  }]);
  if(error) return alert(error.message);
  document.documentElement.style.setProperty('--accent',accent);
  await loadSiteSettings();
  toast('Configuración guardada');
}

async function login(){
  const email=($('#pw-input').value||'').trim();
  if(!email) return alert('Ingrese email');
  const password=prompt('Contraseña:');
  if(!password) return;
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error) return alert(error.message);
  loggedIn=!!data.session;
  updateAuthUI();
  await loadAll();
  toast('Sesión iniciada');
}

async function logout(){
  await supabase.auth.signOut();
  loggedIn=false;
  updateAuthUI();
  toast('Sesión cerrada');
}

// ---------------- Posts ----------------
async function loadItems(){
  const {data}=await supabase.from('items').select('*').order('pinned',{ascending:false}).order('created_at',{ascending:false});
  renderItems(data||[]);
}

function renderItems(items=[]){
  const container=$('#items-list');
  container.innerHTML='';
  items.forEach(i=>{
    const div=document.createElement('div');
    div.className='post';
    div.innerHTML=`
      ${i.thumbnail_url?`<img src="${i.thumbnail_url}"/>`:''}
      <div><strong>${i.title}</strong><br/><small>${i.username}</small></div>
      ${loggedIn?`
      <div class="post-actions">
        <button data-id="${i.id}" class="edit-post">Editar</button>
        <button data-id="${i.id}" class="delete-post">Eliminar</button>
        <button data-id="${i.id}" data-pinned="${i.pinned}" class="pin-post">${i.pinned?'Desanclar':'Anclar'}</button>
      </div>`:''}
    `;
    container.appendChild(div);
  });

  container.querySelectorAll('.edit-post').forEach(b=>b.addEventListener('click', e=>editPost(e.target.dataset.id)));
  container.querySelectorAll('.delete-post').forEach(b=>b.addEventListener('click', e=>deletePost(e.target.dataset.id)));
  container.querySelectorAll('.pin-post').forEach(b=>b.addEventListener('click', e=>togglePin(e.target.dataset.id,e.target)));
}

async function editPost(id){ /* Implement modal */ }
async function deletePost(id){ 
  if(!loggedIn) return;
  if(!confirm('Eliminar publicación?')) return;
  await supabase.from('items').delete().eq('id',id);
  toast('Publicación eliminada');
  loadItems();
}
async function togglePin(id,btn){
  if(!loggedIn) return;
  const pinned=btn.dataset.pinned==='true';
  await supabase.from('items').update({pinned:!pinned}).eq('id',id);
  loadItems();
}

async function searchPosts(){
  const q=($('#search-input').value||'').trim();
  if(!q) return loadItems();
  const {data}=await supabase.from('items').select('*')
    .or(`title.ilike.%${q}%,username.ilike.%${q}%`)
    .order('pinned',{ascending:false})
    .order('created_at',{ascending:false});
  renderItems(data||[]);
}

// ---------------- Events ----------------
async function loadEvents(){ /* implement calendar */ }
async function editEvent(id){ /* implement calendar edit */ }
async function deleteEvent(id){ /* implement calendar delete */ }

// ---------------- Toast ----------------
function toast(msg){
  const t=$('#toast');
  t.textContent=msg;
  t.classList.remove('hidden');
  setTimeout(()=>t.classList.add('hidden'),3000);
}
