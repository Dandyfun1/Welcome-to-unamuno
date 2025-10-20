// Supabase
const SUPABASE_URL = 'https://ddpqzpexcktjtzaqradg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let isAdmin=false;

// Helpers
const el=id=>document.getElementById(id);
const show=msg=>alert(msg);

// Site settings
async function loadSiteSettings(){
  const { data,error } = await supabase.from('site_settings').select('*').eq('id','00000000-0000-0000-0000-000000000001').single();
  if(error){console.error(error.message);return;}
  const s=data||{};
  el('site-title').textContent=s.title||'UNAMUNO';
  el('site-description').textContent=s.description||'';
  if(s.logo_url) el('site-logo').src=s.logo_url;
  if(s.accent) document.documentElement.style.setProperty('--accent',s.accent);
}
loadSiteSettings();

// POSTS
async function loadPosts(){
  const { data,error } = await supabase.from('items').select('*').order('pinned',{ascending:false}).order('created_at',{ascending:false});
  if(error){console.error(error.message);return;}
  const container=el('posts'); container.innerHTML='';
  data.forEach(post=>{
    const div=document.createElement('div'); div.className='post';
    div.innerHTML=`<h3>${post.title}</h3>
      ${post.link?`<a href="${post.link}" target="_blank">Link</a>`:''}
      ${post.thumbnail_url?`<img src="${post.thumbnail_url}" alt="thumbnail">`:''}
      <small>${new Date(post.created_at).toLocaleString()}</small>`;
    if(isAdmin){
      div.innerHTML+=`<div style="margin-top:8px;">
        <button onclick="editPost('${post.id}')" class="btn">Edit</button>
        <button onclick="deletePost('${post.id}')" class="btn" style="background:#ef4444;">Delete</button>
      </div>`;
    }
    container.appendChild(div);
  });
}

// Create / Update post
async function createPost(){
  const title=el('post-title').value.trim();
  const link=el('post-link').value.trim();
  const thumb=el('post-thumbnail').value.trim();
  const pinned=el('post-pinned').checked;
  if(!title) return show('Enter title.');
  const { error } = await supabase.from('items').insert([{title,link,thumbnail_url:thumb,pinned}]);
  if(error){console.error(error.message);return show(`Failed: ${error.message}`);}
  resetPanel(); loadPosts();
}

async function updatePost(){
  const id=el('editing-post-id').value;
  const title=el('post-title').value.trim();
  const link=el('post-link').value.trim();
  const thumb=el('post-thumbnail').value.trim();
  const pinned=el('post-pinned').checked;
  if(!id||!title) return show('Enter title.');
  const { error } = await supabase.from('items').update({title,link,thumbnail_url:thumb,pinned}).eq('id',id);
  if(error){console.error(error.message);return show(`Failed: ${error.message}`);}
  resetPanel(); loadPosts();
}

function editPost(id){
  supabase.from('items').select('*').eq('id',id).then(({data})=>{
    const p=data[0];
    el('post-title').value=p.title;
    el('post-link').value=p.link||'';
    el('post-thumbnail').value=p.thumbnail_url||'';
    el('post-pinned').checked=p.pinned;
    el('editing-post-id').value=p.id;
    el('create-post-btn').style.display='none';
    el('update-post-btn').style.display='block';
    el('post-panel').style.display='flex';
  });
}

async function deletePost(id){
  if(!confirm('Delete post?')) return;
  const { error } = await supabase.from('items').delete().eq('id',id);
  if(error){console.error(error.message);return show(`Failed: ${error.message}`);}
  loadPosts();
}

function resetPanel(){
  el('post-title').value=''; el('post-link').value=''; el('post-thumbnail').value='';
  el('post-pinned').checked=false; el('editing-post-id').value='';
  el('create-post-btn').style.display='block';
  el('update-post-btn').style.display='none';
  el('post-panel').style.display='none';
}

// CALENDAR
async function loadCalendar(){
  const { data,error } = await supabase.from('calendar_events').select('*').order('event_date',{ascending:true});
  if(error){console.error(error.message);return;}
  const container=el('calendar'); container.innerHTML='';
  data.forEach(ev=>{
    const div=document.createElement('div'); div.className='calendar-event';
    div.innerHTML=`<b>${ev.title}</b> — ${ev.event_date}<br><small>${ev.note||''}</small>`;
    if(isAdmin){
      div.innerHTML+=`<div style="margin-top:8px;">
        <button onclick="deleteEvent('${ev.id}')" class="btn" style="background:#ef4444;">Delete</button>
      </div>`;
    }
    container.appendChild(div);
  });
}

async function createEvent(){
  const date=el('event-date').value;
  const title=el('event-title').value.trim();
  const note=el('event-note').value.trim();
  if(!date||!title) return show('Fill date and title.');
  const { error } = await supabase.from('calendar_events').insert([{event_date:date,title,note}]);
  if(error){console.error(error.message);return show(`Failed: ${error.message}`);}
  el('event-date').value=''; el('event-title').value=''; el('event-note').value='';
  loadCalendar();
}

async function deleteEvent(id){
  if(!confirm('Delete event?')) return;
  const { error } = await supabase.from('calendar_events').delete().eq('id',id);
  if(error){console.error(error.message);return show(`Failed: ${error.message}`);}
  loadCalendar();
}

// ADMIN LOGIN
el('admin-login-btn').addEventListener('click',()=>{el('admin-login-panel').style.display='flex';});
el('close-admin-login').addEventListener('click',()=>{el('admin-login-panel').style.display='none';});

el('admin-login-submit').addEventListener('click',async()=>{
  const username=el('admin-username').value.trim();
  const password=el('admin-password').value.trim();
  if(!username||!password)return show('Enter credentials.');
  const { data,error } = await supabase.from('admins').select('*').eq('username',username).eq('password',password).single();
  if(error||!data){return show('Invalid credentials');}
  isAdmin=true;
  el('admin-login-panel').style.display='none';
  loadPosts();
  loadCalendar();
  show('Admin logged in!');
});

// INIT
document.addEventListener('DOMContentLoaded',()=>{
  loadPosts(); loadCalendar();
  el('create-post-btn').addEventListener('click',createPost);
  el('update-post-btn').addEventListener('click',updatePost);
  el('create-event-btn').addEventListener('click',createEvent);
  el('open-panel-btn').addEventListener('click',()=>{el('post-panel').style.display='flex';});
  el('close-panel').addEventListener('click',()=>{el('post-panel').style.display='none';});
  dragElement(el('post-panel'));
  dragElement(el('admin-login-panel'));
});

// Draggable panel
function dragElement(elmnt){
  let pos1=0,pos2=0,pos3=0,pos4=0;
  const header=elmnt.querySelector('.panel-header');
  if(header){header.onmousedown=dragMouseDown;} else {elmnt.onmousedown=dragMouseDown;}
  function dragMouseDown(e){
    e=e||window.event; e.preventDefault();
    pos3=e.clientX; pos4=e.clientY;
    document.onmouseup=closeDragElement;
    document.onmousemove=elementDrag;
  }
  function elementDrag(e){
    e=e||window.event; e.preventDefault();
    pos1=pos3-e.clientX; pos2=pos4-e.clientY;
    pos3=e.clientX; pos4=e.clientY;
    elmnt.style.top=(elmnt.offsetTop-pos2)+'px';
    elmnt.style.left=(elmnt.offsetLeft-pos1)+'px';
  }
  function closeDragElement(){document.onmouseup=null;document.onmousemove=null;}
}
