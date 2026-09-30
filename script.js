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
const genreBox=document.querySelector("#genres"), storyBox=document.querySelector("#stories"), empty=document.querySelector("#empty");
genreBox.innerHTML=genres.map(g=>`<button class="genre" style="background-image:url('${g[1]}')" data-g="${g[0]}"><b>${g[0]}</b></button>`).join("");
function render(list){empty.hidden=list.length>0;storyBox.innerHTML=list.map(s=>`<article class="card"><div class="cover" style="background-image:url('${s[3]}')"></div><div class="body"><div class="genre-name">${s[1]}</div><h3 class="title">${s[0]}</h3><p class="desc">${s[2]}</p><a class="read" href="#" onclick="return false">READ STORY</a></div></article>`).join("")}
render(stories);
document.querySelector("#search").addEventListener("input",e=>{let q=e.target.value.toLowerCase().trim();render(!q?stories:stories.filter(s=>s.join(" ").toLowerCase().includes(q)))});
document.querySelector("#all").onclick=()=>genreBox.scrollIntoView({behavior:"smooth"});
document.querySelectorAll(".genre").forEach(x=>x.onclick=()=>{document.querySelector("#search").value=x.dataset.g;document.querySelector("#search").dispatchEvent(new Event("input"));document.querySelector(".stories").scrollIntoView({behavior:"smooth"})});
document.querySelector("#login").onclick=e=>{e.preventDefault();alert("Login will be connected in the next stage.")};
document.querySelector("#signup").onclick=e=>{e.preventDefault();alert("Sign up will be connected in the next stage.")};
document.querySelector("#year").textContent=new Date().getFullYear();