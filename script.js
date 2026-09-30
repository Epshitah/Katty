const genres=[
["Romance","https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=700&q=80"],
["Heartbreak","https://images.unsplash.com/photo-1494774157365-9e04c6720e47?auto=format&fit=crop&w=700&q=80"],
["Drama","https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=80"],
["Family","https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=700&q=80"],
["Inspirational","https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=700&q=80"],
["Mystery","https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=700&q=80"],
["Comedy","https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=700&q=80"],
["Tragedy","https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80"],
["Thriller","https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80"],
["Horror","https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=700&q=80"],
["Suspense","https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=700&q=80"],
["Fantasy","https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80"],
["Science Fiction","https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=700&q=80"],
["Historical","https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=700&q=80"],
["Friendship","https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=700&q=80"],
["Cultural","https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=700&q=80"],
["Life Stories","https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=700&q=80"],
["Adventure","https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=80"],
["Motivation","https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=700&q=80"],
["Faith","https://images.unsplash.com/photo-1473177104440-ffee2f376098?auto=format&fit=crop&w=700&q=80"]
];

const fallbackStories=[
["A Story Waiting to Be Told","Life Stories","Stories added through the author studio will appear here.","https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80"],
["Where the Heart Leads","Romance","A beautiful place for an emotional story to appear.","https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=80"],
["After the Storm","Drama","Powerful stories about life, courage and change.","https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80"]
];

const genreBox=document.querySelector("#genres");
const storyBox=document.querySelector("#stories");
const empty=document.querySelector("#empty");
let allStories=[];
let currentUser=null;

genreBox.innerHTML=genres.map(g=>`<button class="genre" style="background-image:url('${g[1]}')" data-g="${g[0]}"><b>${g[0]}</b></button>`).join("");

function storyCard(s){
  const cover=s.cover || "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80";
  return `<article class="card">
    <div class="cover" style="background-image:url('${escapeHtml(cover)}')"></div>
    <div class="body">
      <div class="genre-name">${escapeHtml(s.genre||"Story")}</div>
      <h3 class="title">${escapeHtml(s.title)}</h3>
      <p class="desc">${escapeHtml(s.description||"An Epshitah Stories story.")}</p>
      <button class="read" data-story-id="${s.id}">READ STORY</button>
    </div>
  </article>`;
}

function render(list){
  empty.hidden=list.length>0;
  storyBox.innerHTML=list.map(storyCard).join("");
  storyBox.querySelectorAll(".read").forEach(btn=>{
    btn.onclick=()=>openStory(btn.dataset.storyId);
  });
}

async function loadStories(q="",genre=""){
  try{
    const params=new URLSearchParams();
    if(q)params.set("q",q);
    if(genre)params.set("genre",genre);
    const r=await fetch("/api/stories?"+params.toString());
    if(!r.ok)throw new Error();
    const data=await r.json();
    allStories=data.stories||[];
    render(allStories);
  }catch(e){
    if(!q&&!genre){
      allStories=fallbackStories.map((s,i)=>({id:"demo-"+i,title:s[0],genre:s[1],description:s[2],cover:s[3],demo:true}));
      render(allStories);
    }else render([]);
  }
}

let searchTimer;
document.querySelector("#search").addEventListener("input",e=>{
  clearTimeout(searchTimer);
  const q=e.target.value.trim();
  searchTimer=setTimeout(()=>loadStories(q),180);
});

document.querySelector("#all").onclick=()=>{
  document.querySelector("#search").value="";
  loadStories();
  document.querySelector(".stories").scrollIntoView({behavior:"smooth"});
};

document.querySelectorAll(".genre").forEach(x=>x.onclick=()=>{
  document.querySelector("#search").value="";
  loadStories("",x.dataset.g);
  document.querySelector(".stories").scrollIntoView({behavior:"smooth"});
});

async function openStory(id){
  if(String(id).startsWith("demo-")){
    alert("This is a preview. Published stories added from the Author Studio will open here.");
    return;
  }

  try{
    const r=await fetch("/api/stories/"+encodeURIComponent(id));
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||"Story could not be opened.");
    showReader(data.story);
  }catch(e){
    alert(e.message);
  }
}

function showReader(story){
  document.querySelector(".reader-overlay")?.remove();

  const chapters=parseChapters(story.content||"");
  const overlay=document.createElement("div");
  overlay.className="reader-overlay";
  overlay.innerHTML=`
    <div class="reader-page">
      <div class="reader-top">
        <button class="reader-back">← EPSHITAH STORIES</button>
      </div>
      <div class="reader-heading">
        <div class="reader-cover" style="background-image:url('${escapeHtml(story.cover||"https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80")}')"></div>
        <div><div class="reader-genre">${escapeHtml(story.genre||"Story")}</div><h1>${escapeHtml(story.title)}</h1><p>${escapeHtml(story.description||"")}</p></div>
      </div>
      <div class="reader-divider"></div>
      <div class="chapter-label" id="chapterLabel"></div>
      <article class="reader-text" id="readerText"></article>
      <div class="reader-nav">
        <button id="prevChapter">← Previous</button>
        <button id="nextChapter">Next →</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.body.style.overflow="hidden";

  let chapterIndex=0;
  const label=overlay.querySelector("#chapterLabel");
  const text=overlay.querySelector("#readerText");
  const prev=overlay.querySelector("#prevChapter");
  const next=overlay.querySelector("#nextChapter");

  function displayChapter(){
    const c=chapters[chapterIndex];
    label.textContent=c.title;
    text.innerHTML=c.body.split(/\n\s*\n/).map(p=>`<p>${escapeHtml(p).replace(/\n/g,"<br>")}</p>`).join("");
    prev.disabled=chapterIndex===0;
    next.disabled=chapterIndex===chapters.length-1;
    window.scrollTo(0,0);
  }

  prev.onclick=()=>{if(chapterIndex>0){chapterIndex--;displayChapter();}};
  next.onclick=()=>{if(chapterIndex<chapters.length-1){chapterIndex++;displayChapter();}};

  overlay.querySelector(".reader-back").onclick=()=>{
    overlay.remove();
    document.body.style.overflow="";
  };

  displayChapter();
}

function parseChapters(content){
  const lines=content.replace(/\r/g,"").split("\n");
  const result=[];
  let current={title:"Chapter 1",body:""};

  for(const line of lines){
    const trimmed=line.trim();
    if(/^chapter\s+\d+/i.test(trimmed)){
      if(current.body.trim())result.push({...current,body:current.body.trim()});
      current={title:trimmed,body:""};
    }else{
      current.body+=line+"\n";
    }
  }
  if(current.body.trim()||!result.length)result.push({...current,body:current.body.trim()});
  return result;
}

const readerStyle=document.createElement("style");
readerStyle.textContent=`
.reader-overlay{position:fixed;inset:0;z-index:10000;background:#faf8fc;overflow-y:auto}
.reader-page{max-width:900px;margin:0 auto;padding:20px 22px 70px;color:#2b2033}
.reader-top{padding:5px 0 25px}.reader-back{border:0;background:none;color:#5b2a86;font-weight:800;font-size:14px;cursor:pointer}
.reader-heading{display:flex;gap:24px;align-items:center}.reader-cover{width:145px;height:190px;flex:none;background-size:cover;background-position:center;border-radius:16px;box-shadow:0 10px 30px rgba(50,20,70,.15)}
.reader-genre{text-transform:uppercase;letter-spacing:1.5px;color:#79509a;font-size:12px;font-weight:800}.reader-heading h1{font-size:38px;margin:7px 0 10px}.reader-heading p{color:#706674;line-height:1.6}
.reader-divider{height:1px;background:#e4dce9;margin:32px 0}.chapter-label{text-align:center;color:#5b2a86;font-weight:800;font-size:16px;margin-bottom:24px}.reader-text{font-family:Georgia,serif;font-size:19px;line-height:1.9;max-width:720px;margin:auto;color:#3b303f}.reader-text p{margin:0 0 22px}
.reader-nav{max-width:720px;margin:40px auto 0;display:flex;justify-content:space-between;gap:15px}.reader-nav button{border:1px solid #d8cce0;background:white;color:#5b2a86;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}.reader-nav button:disabled{opacity:.35;cursor:not-allowed}
@media(max-width:600px){.reader-page{padding:16px 17px 55px}.reader-heading{align-items:flex-start}.reader-cover{width:100px;height:135px;border-radius:12px}.reader-heading h1{font-size:27px}.reader-heading p{font-size:13px}.reader-text{font-size:18px;line-height:1.85}.reader-nav button{padding:11px 13px}.reader-divider{margin:25px 0}}
`;
document.head.appendChild(readerStyle);

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

/* ---------- AUTH ---------- */
const authStyle=document.createElement("style");
authStyle.textContent=`
.auth-overlay{position:fixed;inset:0;background:rgba(30,16,48,.62);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999}
.auth-box{width:min(430px,100%);background:#fff;border-radius:24px;padding:30px;box-shadow:0 25px 70px rgba(30,16,48,.28);position:relative}
.auth-close{position:absolute;right:18px;top:14px;border:0;background:none;font-size:28px;color:#777;cursor:pointer}
.auth-logo{font-weight:800;letter-spacing:1px;color:#5b2a86;text-align:center;margin-bottom:5px}.auth-title{text-align:center;color:#24152f;font-size:27px;margin:5px 0 8px}.auth-sub{text-align:center;color:#777;font-size:14px;margin-bottom:22px}
.auth-form label{display:block;font-size:13px;font-weight:700;color:#4a3a55;margin:13px 0 6px}.auth-form input{width:100%;padding:13px 14px;border:1px solid #ddd4e6;border-radius:12px;font-size:15px;outline:none}.auth-form input:focus{border-color:#7b4ba5;box-shadow:0 0 0 3px rgba(123,75,165,.10)}
.pass-wrap{position:relative}.pass-wrap input{padding-right:48px}.pass-eye{position:absolute;right:10px;top:7px;border:0;background:none;font-size:20px;padding:7px;cursor:pointer;color:#6a5875}
.auth-submit{width:100%;border:0;border-radius:12px;padding:14px;margin-top:20px;background:#5b2a86;color:white;font-weight:800;font-size:15px;cursor:pointer}.auth-submit:disabled{opacity:.65}
.auth-switch{text-align:center;margin:18px 0 0;color:#777;font-size:14px}.auth-switch button{border:0;background:none;color:#5b2a86;font-weight:800;cursor:pointer}
.auth-error{background:#fff0f0;color:#a33333;border-radius:10px;padding:10px 12px;font-size:13px;margin-top:12px;display:none}
.user-menu{color:#5b2a86;font-weight:700}.user-logout{margin-left:12px}
`;
document.head.appendChild(authStyle);

function authOverlay(mode){
  document.querySelector(".auth-overlay")?.remove();
  const isLogin=mode==="login";
  const overlay=document.createElement("div");
  overlay.className="auth-overlay";
  overlay.innerHTML=`<div class="auth-box">
    <button class="auth-close">×</button><div class="auth-logo">EPSHITAH STORIES</div>
    <h2 class="auth-title">${isLogin?"Welcome Back":"Create Your Account"}</h2>
    <p class="auth-sub">${isLogin?"Log in to continue reading.":"Join Epshitah Stories and enjoy your reading journey."}</p>
    <form class="auth-form">
      ${isLogin?"":`<label>Full name</label><input id="authName" type="text" autocomplete="name" required>`}
      <label>Email</label><input id="authEmail" type="email" autocomplete="email" required>
      <label>Password</label><div class="pass-wrap"><input id="authPassword" type="password" minlength="6" required><button type="button" class="pass-eye">👁</button></div>
      <div class="auth-error" id="authError"></div><button class="auth-submit" type="submit">${isLogin?"LOG IN":"CREATE ACCOUNT"}</button>
    </form>
    <p class="auth-switch">${isLogin?"Don't have an account?":"Already have an account?"} <button type="button" id="authSwitch">${isLogin?"Sign up":"Log in"}</button></p>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector(".auth-close").onclick=()=>overlay.remove();
  overlay.querySelector("#authSwitch").onclick=()=>authOverlay(isLogin?"signup":"login");
  overlay.querySelector(".pass-eye").onclick=()=>{const p=overlay.querySelector("#authPassword");p.type=p.type==="password"?"text":"password"};
  overlay.querySelector("form").onsubmit=async e=>{
    e.preventDefault();const submit=e.currentTarget.querySelector(".auth-submit"),error=overlay.querySelector("#authError");
    error.style.display="none";submit.disabled=true;submit.textContent="PLEASE WAIT...";
    const payload={email:overlay.querySelector("#authEmail").value.trim(),password:overlay.querySelector("#authPassword").value};
    if(!isLogin)payload.name=overlay.querySelector("#authName").value.trim();
    try{const r=await fetch(isLogin?"/api/login":"/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Something went wrong.");currentUser=d.user;overlay.remove();updateHeader();
      if(!isLogin)alert("Your account has been created successfully. Welcome to Epshitah Stories!");
    }catch(err){error.textContent=err.message;error.style.display="block"}finally{submit.disabled=false;submit.textContent=isLogin?"LOG IN":"CREATE ACCOUNT"}
  };
}

function updateHeader(){
  const nav=document.querySelector("header nav");if(!nav)return;
  if(currentUser){nav.innerHTML=`<span class="user-menu">Hi, ${escapeHtml(currentUser.name)}</span><a href="#" class="user-logout" id="logout">Log out</a>`;
    document.querySelector("#logout").onclick=async e=>{e.preventDefault();await fetch("/api/logout",{method:"POST"});currentUser=null;updateHeader()};
  }else{nav.innerHTML=`<a href="#" id="login">Log in</a><a class="signup" href="#" id="signup">Sign up</a>`;
    document.querySelector("#login").onclick=e=>{e.preventDefault();authOverlay("login")};document.querySelector("#signup").onclick=e=>{e.preventDefault();authOverlay("signup")}}
}

updateHeader();
(async()=>{try{const r=await fetch("/api/me");if(r.ok){const d=await r.json();if(d.user){currentUser=d.user;updateHeader()}}}catch(e){}})();

loadStories();
document.querySelector("#year").textContent=new Date().getFullYear();
