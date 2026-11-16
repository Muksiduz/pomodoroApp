(() => {
  const KEY = "focusfarm-local-v1";
  const defaults = {tasks:[],notes:[],sessions:[],habits:[],goals:[],weights:[],weightTarget:null,tags:["Design","Coding","Study","Reading"],settings:{focus:25,short:5,long:15,longEvery:4}};
  let data = load(); data.habits = data.habits || []; data.goals=data.goals||[]; data.weights=data.weights||[];
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
  function setView(v){document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id==="view-"+v));document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===v));window.scrollTo({top:0,behavior:"smooth"});if(v==="analytics")renderAnalytics();if(v==="tasks")renderTasks();if(v==="notes")renderNotes();if(v==="habits")renderHabits();if(v==="goals")renderGoals()}
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

  // Habit tracker: monthly check-in calendar + a private note for each habit/day.
  let selectedHabitId=null, habitMonth=new Date(), habitNoteDate=null;
  const dayKey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  function habitById(id){return data.habits.find(h=>h.id===id)}
  function habitDay(h,d){return h.days?.[dayKey(d)]||{done:false,note:""}}
  function renderHabits(){
    const list=$("habitList");
    list.innerHTML=data.habits.map(h=>{
      const count=Object.values(h.days||{}).filter(x=>x.done).length;
      return `<button class="habit-choice ${h.id===selectedHabitId?"active":""}" data-habit="${esc(h.id)}"><span class="habit-emoji">${esc(h.icon||"✦")}</span><span><span>${esc(h.name)}</span><small>${count} check-ins</small></span><span class="habit-arrow">›</span></button>`;
    }).join("");
    $("habitCount").textContent=data.habits.length+" HABITS";
    list.querySelectorAll("[data-habit]").forEach(b=>b.addEventListener("click",()=>{selectedHabitId=b.dataset.habit;habitMonth=new Date();renderHabits()}));
    const h=habitById(selectedHabitId);
    if(!h){$("habitDetail").innerHTML='<div class="habit-empty"><div class="empty-mark">05</div><h3>Choose a habit to begin.</h3><p>Create a habit, then mark each day and leave a note about how it went.</p></div>';return}
    const monthStart=new Date(habitMonth.getFullYear(),habitMonth.getMonth(),1);
    const monthEnd=new Date(habitMonth.getFullYear(),habitMonth.getMonth()+1,0);
    const offset=(monthStart.getDay()+6)%7;
    const monthName=monthStart.toLocaleDateString(undefined,{month:"long",year:"numeric"});
    const monthDone=Object.entries(h.days||{}).filter(([k,v])=>k.startsWith(dayKey(monthStart).slice(0,7))&&v.done).length;
    const allDone=Object.values(h.days||{}).filter(x=>x.done).length;
    let cells="";
    ["M","T","W","T","F","S","S"].forEach(d=>cells+=`<div class="habit-weekday">${d}</div>`);
    for(let i=0;i<offset;i++)cells+='<div class="habit-day empty"></div>';
    for(let n=1;n<=monthEnd.getDate();n++){
      const d=new Date(monthStart.getFullYear(),monthStart.getMonth(),n),key=dayKey(d),entry=habitDay(h,d);
      cells+=`<button class="habit-day ${entry.done?"done":""} ${entry.note?"has-note":""} ${key===today()?"today":""}" data-habit-day="${key}" title="${key}${entry.note?" · Has note":""}">${n}</button>`;
    }
    const streak=(()=>{let n=0,d=new Date();while(habitDay(h,d).done){n++;d.setDate(d.getDate()-1)}return n})();
    $("habitDetail").innerHTML=`
      <div class="habit-detail-head"><div><h2 class="habit-detail-title">${esc(h.icon||"✦")} ${esc(h.name)}</h2><div class="habit-detail-sub">A gentle record of showing up.</div></div><div class="habit-actions"><button class="soft-button" id="deleteHabitBtn">DELETE</button></div></div>
      <div class="habit-summary"><div class="habit-chip">This month <strong>${monthDone}</strong></div><div class="habit-chip">All time <strong>${allDone}</strong></div><div class="habit-chip">Current streak <strong>${streak}</strong></div></div>
      <div class="habit-calendar-wrap"><div class="habit-calendar"><div class="habit-month"><button class="soft-button" id="prevHabitMonth">‹</button>　${monthName}　<button class="soft-button" id="nextHabitMonth">›</button></div>${cells}</div></div>
      <div class="habit-calendar-legend"><span>Completed</span><span>Not completed</span><span>Dot = note saved</span></div>
      <div class="habit-day-entry"><div class="habit-day-entry-head"><h4 id="habitEntryTitle">Select a day to reflect</h4><button class="soft-button" id="writeHabitNote">＋ WRITE NOTE</button></div><p id="habitEntryText">Tap a date on the calendar to mark it complete or leave a note about what happened.</p></div>`;
    $("prevHabitMonth").addEventListener("click",()=>{habitMonth=new Date(habitMonth.getFullYear(),habitMonth.getMonth()-1,1);renderHabits()});
    $("nextHabitMonth").addEventListener("click",()=>{habitMonth=new Date(habitMonth.getFullYear(),habitMonth.getMonth()+1,1);renderHabits()});
    $("deleteHabitBtn").addEventListener("click",()=>{if(!confirm("Delete this habit and its journal entries?"))return;data.habits=data.habits.filter(x=>x.id!==h.id);selectedHabitId=data.habits[0]?.id||null;save();renderHabits()});
    document.querySelectorAll("[data-habit-day]").forEach(b=>b.addEventListener("click",()=>{
      const key=b.dataset.habitDay,entry=h.days?.[key]||{done:false,note:""};
      h.days=h.days||{};h.days[key]={...entry,done:!entry.done};save();renderHabits();showHabitEntry(key);
    }));
    $("writeHabitNote").addEventListener("click",()=>{habitNoteDate=habitNoteDate||today();openHabitNote(h.id,habitNoteDate)});
    const todayEntry=h.days?.[today()]; if(todayEntry)showHabitEntry(today());
  }
  function showHabitEntry(key){
    const h=habitById(selectedHabitId);if(!h)return;habitNoteDate=key;
    const entry=h.days?.[key]||{done:false,note:""};
    $("habitEntryTitle").textContent=new Date(key+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"});
    $("habitEntryText").textContent=(entry.done?"✓ Completed this habit. ":"Not marked complete. ")+(entry.note||"No note yet — add a reflection if you like.");
  }
  function openHabitNote(id,key){
    const h=habitById(id);if(!h)return;habitNoteDate=key;
    const entry=h.days?.[key]||{done:false,note:""};
    $("habitNoteHeading").textContent=new Date(key+"T12:00:00").toLocaleDateString(undefined,{day:"numeric",month:"long",year:"numeric"});
    $("habitNotePrompt").textContent=(h.icon||"✦")+" "+h.name+" · "+(entry.done?"Marked complete":"Not completed yet");
    $("habitDayNote").value=entry.note||"";
    $("habitNoteDialog").showModal();
  }
  $("addHabitBtn").addEventListener("click",()=>{$("habitForm").classList.toggle("hidden");$("habitName").focus()});
  $("habitForm").addEventListener("submit",e=>{
    e.preventDefault();const name=$("habitName").value.trim();if(!name)return;
    const h={id:uid(),name,icon:$("habitIcon").value.trim()||"✦",createdAt:new Date().toISOString(),days:{}};
    data.habits.unshift(h);selectedHabitId=h.id;habitMonth=new Date();save();e.target.reset();e.target.classList.add("hidden");renderHabits();toast("Habit created. Start with today.");
  });
  $("saveHabitDay").addEventListener("click",()=>{
    const h=habitById(selectedHabitId);if(!h||!habitNoteDate)return;
    h.days=h.days||{};h.days[habitNoteDate]=h.days[habitNoteDate]||{done:false,note:""};
    h.days[habitNoteDate].note=$("habitDayNote").value.trim();save();$("habitNoteDialog").close();renderHabits();showHabitEntry(habitNoteDate);toast("Habit journal entry saved.");
  });
  $("clearHabitDay").addEventListener("click",()=>{
    const h=habitById(selectedHabitId);if(!h||!habitNoteDate)return;
    h.days=h.days||{};h.days[habitNoteDate]=h.days[habitNoteDate]||{done:false,note:""};h.days[habitNoteDate].note="";save();$("habitNoteDialog").close();renderHabits();showHabitEntry(habitNoteDate);
  });

  // Goal tracker + weight journal. Photo/video files live in IndexedDB, not localStorage.
  const MEDIA_DB="focusfarm-media-db",MEDIA_STORE="goalMedia";
  function mediaDb(){
    return new Promise((resolve,reject)=>{
      if(!("indexedDB" in window)){reject(new Error("IndexedDB is not available in this browser."));return}
      const req=indexedDB.open(MEDIA_DB,1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(MEDIA_STORE)){const store=db.createObjectStore(MEDIA_STORE,{keyPath:"id"});store.createIndex("goalId","goalId",{unique:false})}};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
  }
  async function mediaPut(item){const db=await mediaDb();return new Promise((resolve,reject)=>{const tx=db.transaction(MEDIA_STORE,"readwrite");tx.objectStore(MEDIA_STORE).put(item);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
  async function mediaGetAll(){const db=await mediaDb();return new Promise((resolve,reject)=>{const tx=db.transaction(MEDIA_STORE,"readonly"),req=tx.objectStore(MEDIA_STORE).getAll();req.onsuccess=()=>{db.close();resolve(req.result||[])};req.onerror=()=>{db.close();reject(req.error)}})}
  async function mediaDelete(id){const db=await mediaDb();return new Promise((resolve,reject)=>{const tx=db.transaction(MEDIA_STORE,"readwrite");tx.objectStore(MEDIA_STORE).delete(id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
  async function mediaDeleteGoal(goalId){const all=await mediaGetAll();for(const item of all.filter(x=>x.goalId===goalId))await mediaDelete(item.id)}
  function fmtNum(n){return Number(n).toLocaleString(undefined,{maximumFractionDigits:2})}
  function renderGoals(){
    const grid=$("goalGrid");
    grid.innerHTML=data.goals.map(g=>{
      const pct=g.target>0?Math.max(0,Math.min(100,g.current/g.target*100)):0;
      return `<article class="goal-card" data-goal-card="${esc(g.id)}">
        <div class="goal-card-head"><div><h3>${esc(g.title)}</h3><div class="goal-card-meta">${g.due?"DUE "+dateLabel(g.due):"ONGOING"}${g.unit?" · "+esc(g.unit):""}</div></div><button class="weight-delete" data-delete-goal="${esc(g.id)}" title="Delete goal">×</button></div>
        <div class="goal-progress-track"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
        <div class="goal-progress-label"><span>${fmtNum(g.current)} / ${fmtNum(g.target)} ${esc(g.unit||"")}</span><strong>${Math.round(pct)}%</strong></div>
        <div class="goal-card-actions"><button class="soft-button" data-update-goal="${esc(g.id)}">UPDATE PROGRESS</button><label class="soft-button" for="media-${esc(g.id)}">＋ ADD PHOTOS / VIDEOS</label><input class="goal-media-input" id="media-${esc(g.id)}" data-goal-media="${esc(g.id)}" type="file" accept="image/*,video/*" multiple></div>
        <div class="goal-media" data-media-list="${esc(g.id)}"></div>
      </article>`;
    }).join("");
    $("goalEmpty").classList.toggle("show",data.goals.length===0);
    grid.querySelectorAll("[data-delete-goal]").forEach(b=>b.addEventListener("click",async()=>{const g=data.goals.find(x=>x.id===b.dataset.deleteGoal);if(!g||!confirm("Delete this goal and its attached media?"))return;await mediaDeleteGoal(g.id).catch(()=>{});data.goals=data.goals.filter(x=>x.id!==g.id);save();renderGoals()}));
    grid.querySelectorAll("[data-update-goal]").forEach(b=>b.addEventListener("click",()=>{const g=data.goals.find(x=>x.id===b.dataset.updateGoal);if(!g)return;const value=prompt("Enter your current progress"+(g.unit?" ("+g.unit+")":""),g.current);if(value===null)return;const n=Number(value);if(!Number.isFinite(n)||n<0){toast("Enter a valid progress amount.");return}g.current=n;save();renderGoals()}));
    grid.querySelectorAll("[data-goal-media]").forEach(input=>input.addEventListener("change",async()=>{
      const goalId=input.dataset.goalMedia,files=[...input.files||[]];
      for(const file of files){
        if(!file.type.startsWith("image/")&&!file.type.startsWith("video/"))continue;
        try{await mediaPut({id:uid(),goalId,name:file.name,type:file.type,blob:file,createdAt:new Date().toISOString()})}
        catch(e){toast("Could not save media. Device storage may be full.");break}
      }
      input.value="";await renderGoalMedia(goalId);toast("Media saved on this device.");
    }));
    data.goals.forEach(g=>renderGoalMedia(g.id));
    renderWeight();
  }
  async function renderGoalMedia(goalId){
    const host=document.querySelector(`[data-media-list="${CSS.escape(goalId)}"]`);if(!host)return;
    try{
      const items=(await mediaGetAll()).filter(x=>x.goalId===goalId).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
      host.innerHTML="";
      items.forEach(item=>{
        const url=URL.createObjectURL(item.blob),wrap=document.createElement("div");wrap.className="goal-media-item";
        const el=document.createElement(item.type.startsWith("video/")?"video":"img");
        el.src=url;if(el.tagName==="VIDEO"){el.controls=true;el.preload="metadata"}else{el.alt=item.name}
        const del=document.createElement("button");del.className="media-remove";del.textContent="×";del.title="Remove media";
        del.addEventListener("click",async()=>{await mediaDelete(item.id);URL.revokeObjectURL(url);renderGoalMedia(goalId)});
        wrap.append(el,del);host.append(wrap);
      });
      if(!items.length)host.innerHTML='<div class="goal-media-empty">Your photos and videos will appear here.</div>';
    }catch{host.innerHTML='<div class="goal-media-empty">Local media storage is unavailable in this browser.</div>'}
  }
  $("addGoalBtn").addEventListener("click",()=>{$("goalForm").classList.toggle("hidden");$("goalTitle").focus()});
  $("goalForm").addEventListener("submit",e=>{
    e.preventDefault();const title=$("goalTitle").value.trim(),target=Number($("goalTarget").value),current=Number($("goalCurrent").value||0);
    if(!title||!Number.isFinite(target)||target<=0||!Number.isFinite(current)||current<0){toast("Add a goal and a valid target.");return}
    data.goals.unshift({id:uid(),title,target,current,unit:$("goalUnit").value.trim(),due:$("goalDate").value,createdAt:new Date().toISOString()});
    save();e.target.reset();e.target.classList.add("hidden");renderGoals();toast("Goal created.");
  });
  function renderWeight(){
    const entries=[...data.weights].sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt));
    const latest=entries[entries.length-1],first=entries[0];
    $("currentWeight").textContent=latest?fmtNum(latest.value)+" kg":"—";
    $("weightChange").textContent=entries.length>1?((latest.value-first.value)>0?"+":"")+(latest.value-first.value).toFixed(1)+" kg since first entry":"Add your first entry";
    $("weightTarget").value=data.weightTarget??"";
    const chart=$("weightChart");
    if(entries.length===0){chart.innerHTML='<p class="muted">Your chart will appear after your first weigh-in.</p>'}
    else if(entries.length===1){chart.innerHTML=`<div class="single-weight-point"><strong>${fmtNum(latest.value)} kg</strong><span>First weigh-in · ${dateLabel(latest.date)}</span></div>`}
    else{
      const values=entries.map(x=>x.value),min=Math.min(...values,data.weightTarget||Infinity),max=Math.max(...values,data.weightTarget||-Infinity),range=Math.max(1,max-min),w=640,h=190,pad=24;
      const pts=values.map((v,i)=>({x:pad+i*(w-2*pad)/(values.length-1),y:h-pad-(v-min)/range*(h-2*pad)}));
      const line=pts.map(p=>p.x+","+p.y).join(" "),area=`${pad},${h-pad} ${line} ${w-pad},${h-pad}`;
      const targetLine=data.weightTarget?`<line x1="${pad}" y1="${h-pad-(data.weightTarget-min)/range*(h-2*pad)}" x2="${w-pad}" y2="${h-pad-(data.weightTarget-min)/range*(h-2*pad)}" stroke="#b99b7d" stroke-dasharray="5 5"/><text x="${w-pad}" y="${h-pad-(data.weightTarget-min)/range*(h-2*pad)-7}" text-anchor="end" fill="#a48c73" font-size="10">Target ${fmtNum(data.weightTarget)} kg</text>`:"";
      chart.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Weight trend chart"><defs><linearGradient id="weightFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#a88b6d" stop-opacity=".28"/><stop offset="100%" stop-color="#a88b6d" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#weightFill)"/>${targetLine}<polyline points="${line}" fill="none" stroke="#92765e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#fff" stroke="#92765e" stroke-width="2"><title>${entries[i].date}: ${fmtNum(entries[i].value)} kg</title></circle>`).join("")}<text x="${pad}" y="${h-3}" fill="#a48f7a" font-size="10">${dateLabel(entries[0].date)}</text><text x="${w-pad}" y="${h-3}" text-anchor="end" fill="#a48f7a" font-size="10">${dateLabel(entries[entries.length-1].date)}</text></svg>`;
    }
    $("weightRange").textContent=entries.length+" ENTRIES";
    $("weightHistory").innerHTML=[...entries].reverse().slice(0,12).map(x=>`<div class="weight-history-row"><div>${dateLabel(x.date)}<br><span>${esc(x.note||"Weight check-in")}</span></div><strong>${fmtNum(x.value)} KG</strong><button class="weight-delete" data-delete-weight="${esc(x.id)}" title="Delete entry">×</button></div>`).join("")||'<p class="muted">No weigh-ins yet.</p>';
    $("weightHistory").querySelectorAll("[data-delete-weight]").forEach(b=>b.addEventListener("click",()=>{data.weights=data.weights.filter(x=>x.id!==b.dataset.deleteWeight);save();renderWeight()}));
  }
  $("weightDate").value=today();
  $("weightForm").addEventListener("submit",e=>{
    e.preventDefault();const value=Number($("weightValue").value),date=$("weightDate").value;
    if(!Number.isFinite(value)||value<=0||value>500||!date){toast("Enter a valid weight and date.");return}
    data.weights.push({id:uid(),value,date,note:$("weightNote").value.trim(),createdAt:new Date().toISOString()});
    save();$("weightValue").value="";$("weightNote").value="";renderWeight();toast("Weight entry saved locally.");
  });
  $("saveWeightTarget").addEventListener("click",()=>{const v=$("weightTarget").value.trim();if(!v){data.weightTarget=null;save();renderWeight();return}const n=Number(v);if(!Number.isFinite(n)||n<=0||n>500){toast("Enter a valid target weight.");return}data.weightTarget=n;save();renderWeight();toast("Weight target saved.")});
  function renderHome(){
    const ds=data.sessions.filter(s=>s.date===today());$("todayFocus").innerHTML=ds.reduce((a,s)=>a+s.duration,0)+'<span> min</span>';$("todaySessions").textContent=ds.length;$("todayTasks").textContent=data.tasks.filter(t=>t.done&&t.completedAt?.slice(0,10)===today()).length;
  }
  function renderAll(){renderTasks();renderNotes();renderHome();renderAnalytics();if(selectedHabitId)renderHabits();renderGoals()}
  function blobToDataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob)})}
  function dataURLToBlob(url){const [head,body]=url.split(",");const mime=(head.match(/data:(.*?);base64/)||[])[1]||"application/octet-stream";const raw=atob(body),arr=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);return new Blob([arr],{type:mime})}
  $("exportBtn").addEventListener("click",async()=>{try{const media=await mediaGetAll();const backup={...data,media:await Promise.all(media.map(async m=>({id:m.id,goalId:m.goalId,name:m.name,type:m.type,createdAt:m.createdAt,data:await blobToDataURL(m.blob)})))};const blob=new Blob([JSON.stringify(backup)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="focus-farm-backup-"+today()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("Backup exported with local media.")}catch(e){toast("Could not export. Media may exceed available memory.")}});
  $("importBtn").addEventListener("click",()=>$("importFile").click());
  $("importFile").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!Array.isArray(x.tasks)||!Array.isArray(x.sessions)||!Array.isArray(x.notes))throw Error();const media=x.media||[];delete x.media;data={...structuredClone(defaults),...x};save();for(const m of media){if(m.data)await mediaPut({id:m.id||uid(),goalId:m.goalId,name:m.name,type:m.type,createdAt:m.createdAt,blob:dataURLToBlob(m.data)})}renderAll();switchMode("focus");toast("Backup imported with media.")}catch(err){console.error(err);toast("That backup file could not be imported.")}e.target.value=""});
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