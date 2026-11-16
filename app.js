(() => {
  const KEY = "focusfarm-local-v1";
  const defaults = {tasks:[],notes:[],sessions:[],tags:["Design","Coding","Study","Reading"],settings:{focus:25,short:5,long:15,longEvery:4}};
  let data = load();
  let mode = "focus", running = false, endAt = null, remaining = data.settings.focus*60, tickHandle = null, sessionNoteId = null, taskFilter = "all", editingNoteId = null;
  const $ = id => document.getElementById(id);
  const today = () => new Date().toISOString().slice(0,10);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random().toString(16).slice(2));
  function load(){try{return {...structuredClone(defaults),...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return structuredClone(defaults)}}
  function save(){localStorage.setItem(KEY,JSON.stringify(data));}
  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200)}
  function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function dateLabel(d){return new Date(d+"T12:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short"})}
  function mins(n){return Math.floor(n/60)+"h "+String(n%60).padStart(2,"0")+"m"}
  function setView(v){document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id==="view-"+v));document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===v));window.scrollTo({top:0,behavior:"smooth"});if(v==="analytics")renderAnalytics();if(v==="tasks")renderTasks();if(v==="notes")renderNotes()}
  document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
  $("todayLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"}).toUpperCase();

  const durations=()=>({focus:data.settings.focus,short:data.settings.short,long:data.settings.long});
  function persistTimer(){localStorage.setItem(KEY+"_timer",JSON.stringify({running,mode,endAt}));}
  function paintTimer(){
    const m=Math.floor(remaining/60),s=remaining%60;
    $("minutes").textContent=String(m).padStart(2,"0");$("seconds").textContent=String(s).padStart(2,"0");
    const total=durations()[mode]*60;$("progressBar").style.width=(100*(1-remaining/total))+"%";
    $("startBtn").textContent=running?"PAUSE SESSION":"START "+(mode==="focus"?"FOCUS":"BREAK");
    $("modeLabel").textContent=mode==="focus"?"FOCUS SESSION":mode==="short"?"SHORT BREAK":"LONG BREAK";
    $("timerHint").textContent=running?"Stay with this one thing.":"Stay with one thing at a time.";
  }
  function stopTick(){if(tickHandle)clearInterval(tickHandle);tickHandle=null}
  function switchMode(next){stopTick();running=false;mode=next;remaining=durations()[mode]*60;endAt=null;persistTimer();paintTimer();document.querySelectorAll(".mode-tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));}
  function startTick(){running=true;endAt=Date.now()+remaining*1000;persistTimer();stopTick();tickHandle=setInterval(()=>{remaining=Math.max(0,Math.ceil((endAt-Date.now())/1000));paintTimer();if(remaining<=0)completeTimer()},250);paintTimer()}
  function toggleTimer(){if(running){remaining=Math.max(0,Math.ceil((endAt-Date.now())/1000));running=false;endAt=null;persistTimer();stopTick();paintTimer()}else startTick()}
  function resetTimer(){running=false;endAt=null;persistTimer();stopTick();remaining=durations()[mode]*60;paintTimer()}
  function completeTimer(){
    stopTick();running=false;endAt=null;
    if(mode==="focus"){
      const raw=$("sessionTags").value.split(",").map(x=>x.trim()).filter(Boolean);
      raw.forEach(t=>{if(!data.tags.some(x=>x.toLowerCase()===t.toLowerCase()))data.tags.push(t)});
      data.sessions.unshift({id:uid(),date:today(),duration:durations().focus,completedAt:new Date().toISOString(),taskId:$("sessionTask").value||null,taskTitle:$("sessionTask").selectedOptions[0]?.textContent||"",goal:$("sessionGoal").value.trim(),issue:$("sessionIssue").value.trim(),tags:raw});
      save();renderAll();toast("Focus session completed. Nice work.");
      $("sessionGoal").value="";$("sessionIssue").value="";$("sessionTags").value="";
      const next=(data.sessions.filter(x=>new Date(x.date+"T12:00:00").getDay()===new Date().getDay()).length%data.settings.longEvery===0)?"long":"short";
      switchMode(next);
    }else{toast("Break complete. Ready when you are.");switchMode("focus")}
  }
  document.querySelectorAll(".mode-tab").forEach(b=>b.addEventListener("click",()=>switchMode(b.dataset.mode)));
  $("startBtn").addEventListener("click",toggleTimer);$("resetBtn").addEventListener("click",resetTimer);
  $("skipBtn").addEventListener("click",()=>{if(mode==="focus"){toast("Session skipped — no focus time recorded.");switchMode("short")}else switchMode("focus")});
  $("settingsBtn").addEventListener("click",()=>{$("focusDuration").value=data.settings.focus;$("shortDuration").value=data.settings.short;$("longDuration").value=data.settings.long;$("longEvery").value=data.settings.longEvery;$("settingsDialog").showModal()});
  $("saveSettingsBtn").addEventListener("click",()=>{data.settings={focus:clamp($("focusDuration").value,1,180),short:clamp($("shortDuration").value,1,60),long:clamp($("longDuration").value,1,90),longEvery:clamp($("longEvery").value,2,8)};save();switchMode(mode);$("settingsDialog").close();toast("Timer settings saved.")});
  function clamp(v,min,max){return Math.max(min,Math.min(max,parseInt(v,10)||min))}
  function renderTaskOptions(){const select=$("sessionTask"),old=select.value;select.innerHTML='<option value="">Choose a task (optional)</option>'+data.tasks.filter(t=>!t.done).map(t=>`<option value="${esc(t.id)}">${esc(t.title)}</option>`).join("");if(data.tasks.some(t=>t.id===old&&!t.done))select.value=old}
  function renderTasks(){
    const list=$("taskList");let arr=[...data.tasks];
    if(taskFilter==="today")arr=arr.filter(t=>t.date===today());
    if(taskFilter==="active")arr=arr.filter(t=>!t.done);
    if(taskFilter==="done")arr=arr.filter(t=>t.done);
    arr.sort((a,b)=>Number(a.done)-Number(b.done)||({high:0,normal:1,low:2}[a.priority]-({high:0,normal:1,low:2}[b.priority])));
    list.innerHTML=arr.map(t=>`<div class="task-row ${t.done?"done":""}"><input class="task-check" type="checkbox" data-check="${esc(t.id)}" ${t.done?"checked":""} aria-label="Complete task"><div class="task-content"><div class="task-name">${esc(t.title)}</div><div class="task-meta"><span>${t.date?dateLabel(t.date):"NO DATE"}</span>${t.tag?`<span>${esc(t.tag)}</span>`:""}</div></div><span class="priority ${t.priority}">${esc(t.priority)}</span><button class="delete-task" data-delete-task="${esc(t.id)}" aria-label="Delete task">×</button></div>`).join("");
    $("taskEmpty").classList.toggle("show",arr.length===0);
    list.querySelectorAll("[data-check]").forEach(el=>el.addEventListener("change",()=>{const t=data.tasks.find(x=>x.id===el.dataset.check);if(t){t.done=el.checked;t.completedAt=el.checked?new Date().toISOString():null;save();renderAll()}}));
    list.querySelectorAll("[data-delete-task]").forEach(el=>el.addEventListener("click",()=>{data.tasks=data.tasks.filter(x=>x.id!==el.dataset.deleteTask);save();renderAll()}));
    renderTaskOptions();
  }
  $("taskFilters").addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;taskFilter=b.dataset.filter;document.querySelectorAll(".filter-tab").forEach(x=>x.classList.toggle("active",x===b));renderTasks()});
  $("addTaskBtn").addEventListener("click",()=>{$("taskForm").classList.toggle("hidden");$("taskTitle").focus()});
  $("taskForm").addEventListener("submit",e=>{e.preventDefault();const title=$("taskTitle").value.trim();if(!title)return;data.tasks.unshift({id:uid(),title,date:$("taskDate").value||today(),tag:$("taskTag").value.trim(),priority:$("taskPriority").value,done:false,createdAt:new Date().toISOString()});save();e.target.reset();$("taskForm").classList.add("hidden");renderAll();toast("Task added.")});

  function renderNotes(){
    $("notesGrid").innerHTML=[...data.notes].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(n=>`<article class="note-card" data-open-note="${esc(n.id)}"><h3>${esc(n.title||"Untitled note")}</h3><p>${esc(n.body||"No content yet.")}</p><div class="note-date">UPDATED ${dateLabel(n.updatedAt.slice(0,10)).toUpperCase()}</div></article>`).join("");
    $("notesEmpty").classList.toggle("show",data.notes.length===0);
    document.querySelectorAll("[data-open-note]").forEach(el=>el.addEventListener("click",()=>openNote(el.dataset.openNote)));
  }
  function openNote(id=null){editingNoteId=id;const n=data.notes.find(x=>x.id===id);$("noteDialogTitle").textContent=n?"Edit note":"New note";$("noteTitle").value=n?.title||"";$("noteBody").value=n?.body||"";$("deleteNoteBtn").style.visibility=n?"visible":"hidden";$("noteDialog").showModal()}
  $("newNoteBtn").addEventListener("click",()=>openNote());$("saveNoteBtn").addEventListener("click",()=>{const title=$("noteTitle").value.trim(),body=$("noteBody").value.trim();if(!title&&!body){$("noteDialog").close();return}const now=new Date().toISOString();if(editingNoteId){const n=data.notes.find(x=>x.id===editingNoteId);n.title=title;n.body=body;n.updatedAt=now}else data.notes.unshift({id:uid(),title,body,createdAt:now,updatedAt:now});save();$("noteDialog").close();renderNotes();toast("Note saved locally.")});
  $("deleteNoteBtn").addEventListener("click",()=>{if(!editingNoteId)return;data.notes=data.notes.filter(n=>n.id!==editingNoteId);save();$("noteDialog").close();renderNotes();toast("Note deleted.")});

  function renderAnalytics(){
    const start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-6);
    const days=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d.toISOString().slice(0,10)});
    const sessions=data.sessions.filter(s=>days.includes(s.date));const total=sessions.reduce((a,s)=>a+s.duration,0);
    $("weekMinutes").textContent=mins(total);$("weekSessions").textContent=sessions.length;$("weekTasks").textContent=data.tasks.filter(t=>t.done&&t.completedAt&&new Date(t.completedAt)>=start).length;
    const vals=days.map(d=>sessions.filter(s=>s.date===d).reduce((a,s)=>a+s.duration,0)),max=Math.max(25,...vals);
    $("weekChart").innerHTML=days.map((d,i)=>`<div class="bar-column"><span class="bar-min">${vals[i]||0}</span><div class="bar-track"><div class="bar-fill" style="height:${vals[i]/max*100}%"></div></div><span class="bar-label">${new Date(d+"T12:00:00").toLocaleDateString(undefined,{weekday:"short"}).toUpperCase()}</span></div>`).join("");
    const tags={};data.sessions.forEach(s=>(s.tags||[]).forEach(t=>tags[t]=(tags[t]||0)+s.duration));const tagArr=Object.entries(tags).sort((a,b)=>b[1]-a[1]);
    $("tagBreakdown").innerHTML=tagArr.length?tagArr.map(([t,v])=>`<div class="tag-row"><span>${esc(t)}</span><strong>${mins(v)}</strong><div class="tag-line"><span style="width:${v/tagArr[0][1]*100}%"></span></div></div>`).join(""):'<p class="muted">Complete a tagged focus session to see your breakdown.</p>';
    $("sessionHistory").innerHTML=data.sessions.slice(0,8).map(s=>`<div class="history-row"><div>${esc(s.goal||"Focus session")}<br><span>${dateLabel(s.date)}${s.tags?.length?" · "+esc(s.tags.join(", ")):""}</span></div><strong>${s.duration} MIN</strong><span>${new Date(s.completedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span></div>`).join("")||'<p class="muted">Your completed sessions will appear here.</p>';
  }
  function renderHome(){
    const ds=data.sessions.filter(s=>s.date===today());$("todayFocus").innerHTML=ds.reduce((a,s)=>a+s.duration,0)+'<span> min</span>';$("todaySessions").textContent=ds.length;$("todayTasks").textContent=data.tasks.filter(t=>t.done&&t.completedAt?.slice(0,10)===today()).length;
  }
  function renderAll(){renderTasks();renderNotes();renderHome();renderAnalytics()}
  $("exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="focus-farm-backup-"+today()+".json";a.click();URL.revokeObjectURL(a.href);toast("Backup exported.")});
  $("importBtn").addEventListener("click",()=>$("importFile").click());
  $("importFile").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!Array.isArray(x.tasks)||!Array.isArray(x.sessions)||!Array.isArray(x.notes))throw Error();data={...structuredClone(defaults),...x};save();renderAll();switchMode("focus");toast("Backup imported.")}catch{toast("That backup file is not valid.")}e.target.value=""});
  // Recover a running timer after refresh using an absolute end timestamp.
  try{const saved=JSON.parse(localStorage.getItem(KEY+"_timer")||"null");if(saved?.running&&saved.endAt>Date.now()){mode=saved.mode;remaining=Math.ceil((saved.endAt-Date.now())/1000);startTick()} }catch{}
  const oldSave=save;save=function(){oldSave();persistTimer()};
  window.addEventListener("beforeunload",()=>localStorage.setItem(KEY+"_timer",JSON.stringify({running,mode,endAt})));
  renderAll();paintTimer();
  if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}))}

  // Native PWA install prompt (Android/Chromium); iOS gets Add to Home Screen steps.
  let deferredInstallPrompt = null;
  const installBtn = $("installBtn");
  const installDialog = $("installDialog");
  const installSteps = $("installSteps");
  const installAction = $("installAction");
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  function setInstalledState(){
    if(isStandalone()){installBtn.textContent="✓ APP INSTALLED";installBtn.classList.add("installed");installBtn.disabled=true;}
  }
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();deferredInstallPrompt=event;
    installBtn.textContent="↓ INSTALL APP";installBtn.classList.remove("installed");installBtn.disabled=false;
  });
  window.addEventListener("appinstalled",()=>{deferredInstallPrompt=null;setInstalledState();toast("Focus Farm installed.")});
  function showInstallHelp(){
    if(deferredInstallPrompt){
      installSteps.innerHTML="<ol><li>Tap <b>Install Focus Farm</b> below.</li><li>Confirm the installation prompt from your browser.</li><li>Open Focus Farm from your home screen.</li></ol>";
      installAction.hidden=false;installAction.textContent="INSTALL FOCUS FARM";
    }else if(/iphone|ipad|ipod/i.test(navigator.userAgent)){
      installSteps.innerHTML="<ol><li>Open this website in <b>Safari</b>.</li><li>Tap the <b>Share</b> icon.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b> to install Focus Farm.</li></ol>";
      installAction.hidden=true;
    }else{
      installSteps.innerHTML="<ol><li>Open this website in <b>Chrome</b> or <b>Edge</b>.</li><li>Open the browser menu (⋮).</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Confirm to add Focus Farm to your device.</li></ol><p style='margin:12px 0 0;color:#999'>If the install option is missing, make sure the site is served over HTTPS and reload it once.</p>";
      installAction.hidden=true;
    }
    installDialog.showModal();
  }
  installBtn.addEventListener("click",()=>{
    if(isStandalone()){toast("Focus Farm is already installed.");return}
    showInstallHelp();
  });
  installAction.addEventListener("click",async()=>{
    if(!deferredInstallPrompt){showInstallHelp();return}
    deferredInstallPrompt.prompt();
    const choice=await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    installDialog.close();
    if(choice?.outcome==="accepted"){toast("Installing Focus Farm…")}
    else{toast("You can install Focus Farm any time.")}
  });
  setInstalledState();
})();