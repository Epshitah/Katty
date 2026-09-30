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

const stories=[
["A Story Waiting to Be Told","Life Stories","This space will showcase stories added through the author studio.","https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80"],
["Where the Heart Leads","Romance","A beautiful place for an emotional story to appear.","https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=80"],
["After the Storm","Drama","A place for powerful stories about life, courage and change.","https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80"]
];

const genreBox=document.querySelector("#genres");
const storyBox=document.querySelector("#stories");
const empty=document.querySelector("#empty");

genreBox.innerHTML=genres.map(g=>`<button class="genre" style="background-image:url('${g[1]}')" data-g="${g[0]}"><b>${g[0]}</b></button>`).join("");

function render(list){
  empty.hidden=list.length>0;
  storyBox.innerHTML=list.map(s=>`<article class="card"><div class="cover" style="background-image:url('${s[3]}')"></div><div class="body"><div class="genre-name">${s[1]}</div><h3 class="title">${s[0]}</h3><p class="desc">${s[2]}</p><a class="read" href="#" onclick="return false">READ STORY</a></div></article>`).join("");
}
render(stories);

document.querySelector("#search").addEventListener("input",e=>{
  let q=e.target.value.toLowerCase().trim();
  render(!q?stories:stories.filter(s=>s.join(" ").toLowerCase().includes(q)));
});

document.querySelector("#all").onclick=()=>genreBox.scrollIntoView({behavior:"smooth"});

document.querySelectorAll(".genre").forEach(x=>x.onclick=()=>{
  document.querySelector("#search").value=x.dataset.g;
  document.querySelector("#search").dispatchEvent(new Event("input"));
  document.querySelector(".stories").scrollIntoView({behavior:"smooth"});
});

/* ---------- AUTH ---------- */

const authStyle=document.createElement("style");
authStyle.textContent=`
.auth-overlay{position:fixed;inset:0;background:rgba(30,16,48,.62);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999}
.auth-box{width:min(430px,100%);background:#fff;border-radius:24px;padding:30px;box-shadow:0 25px 70px rgba(30,16,48,.28);position:relative}
.auth-close{position:absolute;right:18px;top:14px;border:0;background:none;font-size:28px;color:#777;cursor:pointer}
.auth-logo{font-weight:800;letter-spacing:1px;color:#5b2a86;text-align:center;margin-bottom:5px}
.auth-title{text-align:center;color:#24152f;font-size:27px;margin:5px 0 8px}
.auth-sub{text-align:center;color:#777;font-size:14px;margin-bottom:22px}
.auth-form label{display:block;font-size:13px;font-weight:700;color:#4a3a55;margin:13px 0 6px}
.auth-form input{width:100%;padding:13px 14px;border:1px solid #ddd4e6;border-radius:12px;font-size:15px;outline:none}
.auth-form input:focus{border-color:#7b4ba5;box-shadow:0 0 0 3px rgba(123,75,165,.10)}
.pass-wrap{position:relative}.pass-wrap input{padding-right:48px}
.pass-eye{position:absolute;right:10px;top:7px;border:0;background:none;font-size:20px;padding:7px;cursor:pointer;color:#6a5875}
.auth-submit{width:100%;border:0;border-radius:12px;padding:14px;margin-top:20px;background:#5b2a86;color:white;font-weight:800;font-size:15px;cursor:pointer}
.auth-submit:disabled{opacity:.65}
.auth-switch{text-align:center;margin:18px 0 0;color:#777;font-size:14px}
.auth-switch button{border:0;background:none;color:#5b2a86;font-weight:800;cursor:pointer}
.auth-error{background:#fff0f0;color:#a33333;border-radius:10px;padding:10px 12px;font-size:13px;margin-top:12px;display:none}
.auth-success{background:#effaf2;color:#24733c;border-radius:10px;padding:10px 12px;font-size:13px;margin-top:12px;display:none}
.user-menu{color:#5b2a86;font-weight:700}
.user-logout{margin-left:12px}
`;
document.head.appendChild(authStyle);

let currentUser=null;

function authOverlay(mode){
  document.querySelector(".auth-overlay")?.remove();

  const isLogin=mode==="login";
  const overlay=document.createElement("div");
  overlay.className="auth-overlay";
  overlay.innerHTML=`
    <div class="auth-box">
      <button class="auth-close" aria-label="Close">×</button>
      <div class="auth-logo">EPSHITAH STORIES</div>
      <h2 class="auth-title">${isLogin?"Welcome Back":"Create Your Account"}</h2>
      <p class="auth-sub">${isLogin?"Log in to continue reading.":"Join Epshitah Stories and enjoy your reading journey."}</p>

      <form class="auth-form">
        ${isLogin?"":`<label>Full name</label><input id="authName" type="text" autocomplete="name" required>`}
        <label>Email</label>
        <input id="authEmail" type="email" autocomplete="email" required>
        <label>Password</label>
        <div class="pass-wrap">
          <input id="authPassword" type="password" minlength="6" autocomplete="${isLogin?"current-password":"new-password"}" required>
          <button type="button" class="pass-eye" id="passEye">👁</button>
        </div>
        <div class="auth-error" id="authError"></div>
        <div class="auth-success" id="authSuccess"></div>
        <button class="auth-submit" type="submit">${isLogin?"LOG IN":"CREATE ACCOUNT"}</button>
      </form>

      <p class="auth-switch">${isLogin?"Don't have an account?":"Already have an account?"}
        <button type="button" id="authSwitch">${isLogin?"Sign up":"Log in"}</button>
      </p>
    </div>`;

  document.body.appendChild(overlay);

  overlay.querySelector(".auth-close").onclick=()=>overlay.remove();
  overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});

  overlay.querySelector("#passEye").onclick=()=>{
    const p=overlay.querySelector("#authPassword");
    p.type=p.type==="password"?"text":"password";
  };

  overlay.querySelector("#authSwitch").onclick=()=>authOverlay(isLogin?"signup":"login");

  overlay.querySelector("form").onsubmit=async e=>{
    e.preventDefault();
    const form=e.currentTarget;
    const submit=form.querySelector(".auth-submit");
    const error=overlay.querySelector("#authError");
    const success=overlay.querySelector("#authSuccess");
    error.style.display="none";
    success.style.display="none";
    submit.disabled=true;
    submit.textContent="PLEASE WAIT...";

    const payload={
      email:overlay.querySelector("#authEmail").value.trim(),
      password:overlay.querySelector("#authPassword").value
    };
    if(!isLogin) payload.name=overlay.querySelector("#authName").value.trim();

    try{
      const response=await fetch(isLogin?"/api/login":"/api/register",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||"Something went wrong. Please try again.");

      currentUser=data.user;
      overlay.remove();
      updateHeader();

      if(!isLogin){
        alert("Your account has been created successfully. Welcome to Epshitah Stories!");
      }
    }catch(err){
      error.textContent=err.message;
      error.style.display="block";
    }finally{
      submit.disabled=false;
      submit.textContent=isLogin?"LOG IN":"CREATE ACCOUNT";
    }
  };
}

function updateHeader(){
  const nav=document.querySelector("header nav");
  if(!nav)return;

  if(currentUser){
    nav.innerHTML=`<span class="user-menu">Hi, ${escapeHtml(currentUser.name)}</span><a href="#" class="user-logout" id="logout">Log out</a>`;
    document.querySelector("#logout").onclick=async e=>{
      e.preventDefault();
      await fetch("/api/logout",{method:"POST"});
      currentUser=null;
      updateHeader();
    };
  }else{
    nav.innerHTML=`<a href="#" id="login">Log in</a><a class="signup" href="#" id="signup">Sign up</a>`;
    document.querySelector("#login").onclick=e=>{e.preventDefault();authOverlay("login")};
    document.querySelector("#signup").onclick=e=>{e.preventDefault();authOverlay("signup")};
  }
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

updateHeader();

(async()=>{
  try{
    const response=await fetch("/api/me");
    if(!response.ok)return;
    const data=await response.json();
    if(data.user){
      currentUser=data.user;
      updateHeader();
    }
  }catch(e){}
})();

document.querySelector("#year").textContent=new Date().getFullYear();
