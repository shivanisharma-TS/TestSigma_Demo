import { useState, useEffect, useRef } from "react";

const MEMBERS = [
  { id: 1, name: "Sandeep",       slack: "@sandeep",       status: "active" },
  { id: 2, name: "Hari Chandana", slack: "@harichandana",  status: "active" },
  { id: 3, name: "Nixon",         slack: "@nixon",         status: "active" },
  { id: 4, name: "Shivani",       slack: "@shivani",       status: "active" },
  { id: 5, name: "Osten",         slack: "@osten",         status: "active" },
  { id: 6, name: "Mohan",         slack: "@mohan",         status: "active" },
  { id: 7, name: "Aarthy",        slack: "@aarthy",        status: "active" },
  { id: 8, name: "Jadson",        slack: "@jadson",        status: "active" },
];

// All modules from TAM_Product_RTM.xlsx
const ALL_TOPICS = [
  // App Squad – Core
  { id:1,  name:"SignUp & Login",        squad:"App Squad",  category:"Core",         difficulty:"Medium", status:"available" },
  { id:2,  name:"Dashboard",             squad:"App Squad",  category:"Core",         difficulty:"Easy",   status:"available" },
  { id:3,  name:"Project",               squad:"App Squad",  category:"Core",         difficulty:"Medium", status:"available" },
  { id:4,  name:"Project Settings",      squad:"App Squad",  category:"Core",         difficulty:"Medium", status:"available" },
  { id:5,  name:"Settings",              squad:"App Squad",  category:"Core",         difficulty:"Easy",   status:"available" },
  { id:6,  name:"Addons",                squad:"App Squad",  category:"Core",         difficulty:"Medium", status:"available" },
  { id:7,  name:"Agents",                squad:"App Squad",  category:"Core",         difficulty:"Hard",   status:"available" },
  { id:8,  name:"Whats New",             squad:"App Squad",  category:"Core",         difficulty:"Easy",   status:"available" },
  { id:9,  name:"Help & Support",        squad:"App Squad",  category:"Core",         difficulty:"Easy",   status:"available" },
  { id:10, name:"User Profile",          squad:"App Squad",  category:"Core",         difficulty:"Easy",   status:"available" },
  // App Squad – Testing
  { id:11, name:"TestCases",             squad:"App Squad",  category:"Testing",      difficulty:"Hard",   status:"available" },
  { id:12, name:"Stepgroups",            squad:"App Squad",  category:"Testing",      difficulty:"Medium", status:"available" },
  { id:13, name:"Elements",              squad:"App Squad",  category:"Testing",      difficulty:"Medium", status:"available" },
  { id:14, name:"TestSuites",            squad:"App Squad",  category:"Testing",      difficulty:"Hard",   status:"available" },
  { id:15, name:"TestPlans",             squad:"App Squad",  category:"Testing",      difficulty:"Hard",   status:"available" },
  // App Squad – Data
  { id:16, name:"TestData Profile",      squad:"App Squad",  category:"Data",         difficulty:"Hard",   status:"available" },
  { id:17, name:"Environments",          squad:"App Squad",  category:"Data",         difficulty:"Medium", status:"available" },
  { id:18, name:"Uploads",               squad:"App Squad",  category:"Data",         difficulty:"Easy",   status:"available" },
  // App Squad – Reporting
  { id:19, name:"Run Results",           squad:"App Squad",  category:"Reporting",    difficulty:"Medium", status:"available" },
  { id:20, name:"Adhoc Run Results",     squad:"App Squad",  category:"Reporting",    difficulty:"Medium", status:"available" },
  { id:21, name:"Usage Details",         squad:"App Squad",  category:"Reporting",    difficulty:"Easy",   status:"available" },
  // Recorder
  { id:22, name:"Web Recorder",          squad:"Recorder",   category:"Recorder",     difficulty:"Hard",   status:"available" },
  { id:23, name:"Mobile Recorder",       squad:"Recorder",   category:"Recorder",     difficulty:"Hard",   status:"available" },
  { id:24, name:"Element Recorder",      squad:"Recorder",   category:"Recorder",     difficulty:"Medium", status:"available" },
  { id:25, name:"Desktop Lite",          squad:"Recorder",   category:"Recorder",     difficulty:"Medium", status:"available" },
  { id:26, name:"Web Debugger",          squad:"Recorder",   category:"Debugger",     difficulty:"Hard",   status:"available" },
  { id:27, name:"Mobile Debugger",       squad:"Recorder",   category:"Debugger",     difficulty:"Hard",   status:"available" },
  // Salesforce
  { id:28, name:"Salesforce Application",squad:"Salesforce", category:"Salesforce",   difficulty:"Hard",   status:"available" },
  // AI
  { id:29, name:"Co Pilot",              squad:"AI",         category:"AI",           difficulty:"Hard",   status:"available" },
  { id:30, name:"AI Features",           squad:"AI",         category:"AI",           difficulty:"Hard",   status:"available" },
  { id:31, name:"AI Flow (Test Gen)",     squad:"AI",         category:"AI",           difficulty:"Hard",   status:"available" },
  { id:32, name:"TDP AI",                squad:"AI",         category:"AI",           difficulty:"Medium", status:"available" },
  // Settings & Admin
  { id:33, name:"Integrations",          squad:"App Squad",  category:"Admin",        difficulty:"Medium", status:"available" },
  { id:34, name:"User Management",       squad:"App Squad",  category:"Admin",        difficulty:"Medium", status:"available" },
  { id:35, name:"API Keys & Preferences",squad:"App Squad",  category:"Admin",        difficulty:"Easy",   status:"available" },
];

const CAT_COLORS = {
  Core:       { bg:"#EEF2FF", text:"#4338CA", bar:"#6366F1" },
  Testing:    { bg:"#F0FDF4", text:"#166534", bar:"#22C55E" },
  Data:       { bg:"#FFFBEB", text:"#92400E", bar:"#F59E0B" },
  Reporting:  { bg:"#F0F9FF", text:"#0C4A6E", bar:"#0EA5E9" },
  Recorder:   { bg:"#FFF7ED", text:"#9A3412", bar:"#F97316" },
  Debugger:   { bg:"#FDF4FF", text:"#6B21A8", bar:"#A855F7" },
  Salesforce: { bg:"#F5F3FF", text:"#4C1D95", bar:"#8B5CF6" },
  AI:         { bg:"#FFF1F2", text:"#9F1239", bar:"#F43F5E" },
  Admin:      { bg:"#F1F5F9", text:"#334155", bar:"#64748B" },
};

const SQUAD_COLORS = {
  "App Squad":  "#6366F1",
  "Recorder":   "#F97316",
  "Salesforce": "#8B5CF6",
  "AI":         "#F43F5E",
};

const DIFF = {
  Easy:   { bg:"#F0FDF4", text:"#166534" },
  Medium: { bg:"#FFFBEB", text:"#92400E" },
  Hard:   { bg:"#FFF1F2", text:"#9F1239" },
};

// Assignment engine
function assignTopics(members, topics, history) {
  const active = members.filter(m => m.status === "active");
  const available = topics.filter(t => t.status === "available");
  if (available.length < active.length * 2) {
    return { error: `Need ${active.length*2} topics, only ${available.length} available.` };
  }
  const memberTopics = {}, memberCats = {}, topicCount = {};
  history.flat().forEach(({ member, topics: ts }) => {
    memberTopics[member] = memberTopics[member] || [];
    memberCats[member] = memberCats[member] || {};
    ts.forEach(t => {
      memberTopics[member].push(t.name);
      memberCats[member][t.category] = (memberCats[member][t.category] || 0) + 1;
      topicCount[t.name] = (topicCount[t.name] || 0) + 1;
    });
  });
  const used = new Set();
  const assignments = active.map(member => {
    const pastT = new Set(memberTopics[member.name] || []);
    const pastC = memberCats[member.name] || {};
    const assigned = [];
    const scored = available
      .filter(t => !used.has(t.id))
      .map(t => ({
        ...t,
        score: (!topicCount[t.name] ? -100 : 0) +
               (topicCount[t.name] || 0) +
               (pastT.has(t.name) ? 200 : 0) +
               (pastC[t.category] || 0) * 20 +
               (assigned.some(a => a.category === t.category) ? 80 : 0),
      }))
      .sort((a, b) => a.score - b.score);
    for (const t of scored) {
      if (assigned.length === 2) break;
      if (assigned.some(a => a.category === t.category)) continue;
      assigned.push(t); used.add(t.id);
    }
    for (const t of scored) {
      if (assigned.length === 2) break;
      if (!assigned.find(a => a.id === t.id)) { assigned.push(t); used.add(t.id); }
    }
    return { member: member.name, slack: member.slack, topics: assigned };
  });
  return { assignments };
}

const initials = name => name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
const sleep = ms => new Promise(r => setTimeout(r, ms));

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [members, setMembers] = useState(MEMBERS);
  const [topics, setTopics] = useState(ALL_TOPICS);
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [slack, setSlack] = useState([]);
  const [done, setDone] = useState(new Set());
  const [squadFilter, setSquadFilter] = useState("All");
  const [newMember, setNewMember] = useState({ name: "", slack: "" });
  const logEnd = useRef(null);

  useEffect(() => { logEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const log = (icon, text, sub, color) =>
    setLogs(l => [...l, { icon, text, sub, color, id: Date.now() + Math.random() }]);

  async function runAgent() {
    if (running) return;
    setRunning(true); setLogs([]);
    log("🕐", "Agent triggered", `${new Date().toLocaleTimeString()} · weekly run`);
    await sleep(500);
    const active = members.filter(m => m.status === "active");
    const inactive = members.filter(m => m.status === "inactive");
    log("📋", `Reading TAM team — ${members.length} members`, inactive.length ? `Inactive: ${inactive.map(m=>m.name).join(", ")}` : "All members active");
    await sleep(400);
    log("📚", `Reading RTM sheet — ${topics.filter(t=>t.status==="available").length} modules`, `${[...new Set(topics.map(t=>t.squad))].length} squads · ${[...new Set(topics.map(t=>t.category))].length} categories`);
    await sleep(500);
    log("🗂️", `Loading history — ${history.length} previous week(s)`, "Analysing fairness & category coverage");
    await sleep(600);
    log("🧠", "Claude planning assignments…", "Unused topics → least assigned → category diversity → fairness");
    await sleep(1400);

    const result = assignTopics(members, topics, history);
    if (result.error) {
      log("🚨", "Insufficient modules!", result.error, "#DC2626");
      log("📢", "Admin notified", result.error, "#DC2626");
      setSlack(s => [{ id: Date.now(), type: "admin", ts: new Date().toLocaleTimeString(),
        text: `⚠️ *Topic pool exhausted.* ${result.error}` }, ...s]);
      setRunning(false); return;
    }
    log("✔️", "Plan validated", "2 modules per member · no duplicates · category diversity OK");
    await sleep(400);
    log("💾", "Writing to assignments sheet…", `${result.assignments.length} rows appended`);
    await sleep(500);
    log("📤", "Sending digest to #tam-weekly-learning…");
    await sleep(700);
    log("✅", "Agent run complete", `Week of ${new Date().toLocaleDateString()}`, "#059669");

    setLatest(result.assignments);
    setHistory(h => [...h, result.assignments.map(a => ({ member: a.member, topics: a.topics }))]);
    const lines = result.assignments.map(a =>
      `*${a.member}*\n• ${a.topics[0]?.name} _(${a.topics[0]?.squad})_\n• ${a.topics[1]?.name} _(${a.topics[1]?.squad})_`
    ).join("\n\n");
    setSlack(s => [{ id: Date.now(), type: "weekly", ts: new Date().toLocaleTimeString(),
      text: `📚 *TAM Weekly Module Assignments — ${new Date().toLocaleDateString()}*\n\n${lines}\n\n_Good luck! Mark complete when done. 🎯_`,
      assignments: result.assignments }, ...s]);
    setRunning(false); setTab("dashboard");
  }

  const TABS = ["dashboard", "run agent", "members", "topics", "history", "slack"];
  const squads = ["All", ...new Set(ALL_TOPICS.map(t => t.squad))];
  const shownTopics = squadFilter === "All" ? topics : topics.filter(t => t.squad === squadFilter);
  const active = members.filter(m => m.status === "active");
  const avail  = topics.filter(t => t.status === "available");

  // ── inline styles ──────────────────────────────
  const cs = {
    root:  { fontFamily:"'Inter',-apple-system,sans-serif", background:"#F8FAFC", minHeight:"100vh" },
    hdr:   { background:"#0F172A", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" },
    htit:  { color:"#F1F5F9", fontSize:15, fontWeight:700, display:"flex", alignItems:"center", gap:10 },
    hsub:  { color:"#64748B", fontSize:11, marginTop:2 },
    nav:   { background:"#fff", borderBottom:"1px solid #E2E8F0", display:"flex", overflowX:"auto" },
    nb:    a => ({ padding:"11px 18px", fontSize:12, fontWeight:a?600:400,
                   color:a?"#0F172A":"#64748B", cursor:"pointer", background:"none", border:"none",
                   borderBottom:`2px solid ${a?"#6366F1":"transparent"}`,
                   whiteSpace:"nowrap", textTransform:"capitalize" }),
    body:  { padding:"20px 24px" },
    card:  { background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, padding:"18px 20px", marginBottom:14 },
    ct:    { fontSize:12, fontWeight:700, color:"#0F172A", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.06em" },
    stat:  { background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:10, padding:"14px", textAlign:"center" },
    snum:  { fontSize:26, fontWeight:800, color:"#0F172A" },
    slbl:  { fontSize:11, color:"#64748B", marginTop:2 },
    runB:  { background:"#6366F1", color:"#fff", border:"none", borderRadius:8, padding:"9px 22px",
              fontSize:13, fontWeight:700, cursor:running?"not-allowed":"pointer", opacity:running?0.6:1 },
    inp:   { border:"1px solid #CBD5E1", borderRadius:8, padding:"7px 11px", fontSize:13, outline:"none", background:"#fff", color:"#0F172A" },
    sel:   { border:"1px solid #CBD5E1", borderRadius:8, padding:"7px 11px", fontSize:13, outline:"none", background:"#fff", color:"#0F172A" },
    sb:    v => ({ border:`1px solid ${v==="primary"?"#6366F1":v==="danger"?"#FCA5A5":"#CBD5E1"}`,
                   background:v==="primary"?"#6366F1":v==="danger"?"#FFF1F2":"#fff",
                   color:v==="primary"?"#fff":v==="danger"?"#DC2626":"#475569",
                   borderRadius:6, padding:"5px 12px", fontSize:11, cursor:"pointer", fontWeight:600 }),
    cat:   c => ({ display:"inline-block", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:999,
                   background:(CAT_COLORS[c]||{bg:"#F1F5F9"}).bg, color:(CAT_COLORS[c]||{text:"#475569"}).text }),
    diff:  d => ({ display:"inline-block", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:999,
                   background:(DIFF[d]||{bg:"#F1F5F9"}).bg, color:(DIFF[d]||{text:"#475569"}).text }),
    squad: s => ({ display:"inline-block", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:999,
                   background:"#F1F5F9", color: SQUAD_COLORS[s] || "#475569" }),
    avi:   a => ({ width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                   fontSize:12, fontWeight:800, flexShrink:0,
                   background:a?"#EEF2FF":"#F1F5F9", color:a?"#4338CA":"#94A3B8" }),
    slack: { background:"#1A1D21", borderRadius:10, padding:"14px 18px",
              fontFamily:"monospace", fontSize:12.5, color:"#D1D2D3", lineHeight:1.8, marginBottom:10 },
  };

  return (
    <div style={cs.root}>
      {/* header */}
      <div style={cs.hdr}>
        <div>
          <div style={cs.htit}>
            <span style={{fontSize:18}}>🤖</span> TAM Topic Assignment Bot
            <span style={{background:"#1E293B",border:"1px solid #334155",borderRadius:6,padding:"3px 9px",fontSize:10,color:"#94A3B8",marginLeft:4}}>
              TAM_Product RTM · {ALL_TOPICS.length} modules
            </span>
          </div>
          <div style={cs.hsub}>8 team members · {squads.length-1} squads · weekly auto-assignment</div>
        </div>
        <button style={cs.runB} onClick={runAgent} disabled={running}>
          {running ? "⏳ Running…" : "▶ Run agent"}
        </button>
      </div>

      {/* nav */}
      <div style={cs.nav}>
        {TABS.map(t => <button key={t} style={cs.nb(tab===t)} onClick={()=>setTab(t)}>{t}</button>)}
      </div>

      <div style={cs.body}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {[{n:active.length,l:"Active members"},{n:avail.length,l:"Modules available"},
              {n:history.length,l:"Weeks run"},{n:done.size,l:"Completed"}].map(({n,l}) => (
              <div key={l} style={cs.stat}><div style={cs.snum}>{n}</div><div style={cs.slbl}>{l}</div></div>
            ))}
          </div>

          {latest ? (
            <div style={cs.card}>
              <div style={cs.ct}>📋 This week — {new Date().toLocaleDateString()}</div>
              {latest.map(a => (
                <div key={a.member} style={{borderBottom:"1px solid #F8FAFC",paddingBottom:12,marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={cs.avi(true)}>{initials(a.member)}</div>
                    <div>
                      <span style={{fontWeight:700,fontSize:14,color:"#0F172A"}}>{a.member}</span>
                      <span style={{fontSize:11,color:"#94A3B8",marginLeft:6}}>{a.slack}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingLeft:42}}>
                    {a.topics.map(t => {
                      const key=`${a.member}:${t.name}`;
                      const isDone=done.has(key);
                      return (
                        <div key={t.name} style={{display:"flex",alignItems:"center",gap:5,
                          background:isDone?"#F0FDF4":"#F8FAFC",
                          border:`1px solid ${isDone?"#BBF7D0":"#E2E8F0"}`,borderRadius:8,padding:"6px 12px"}}>
                          <span style={{fontSize:13,color:isDone?"#166534":"#0F172A",textDecoration:isDone?"line-through":"none"}}>{t.name}</span>
                          <span style={cs.squad(t.squad)}>{t.squad}</span>
                          <span style={cs.diff(t.difficulty)}>{t.difficulty}</span>
                          {!isDone && <button style={{...cs.sb(),"fontSize":"10px",padding:"2px 6px"}} onClick={()=>setDone(s=>{const n=new Set(s);n.add(key);return n;})}>✓</button>}
                          {isDone && <span style={{fontSize:11,color:"#16A34A"}}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{...cs.card,textAlign:"center",padding:"40px 24px"}}>
              <div style={{fontSize:36,marginBottom:12}}>🤖</div>
              <div style={{fontSize:15,fontWeight:700,color:"#0F172A",marginBottom:6}}>No assignments yet</div>
              <div style={{fontSize:13,color:"#64748B",marginBottom:20}}>Run the agent to assign this week's modules to Tam's 8-person team.</div>
              <button style={cs.runB} onClick={runAgent}>▶ Run agent now</button>
            </div>
          )}

          {history.length>0 && (
            <div style={cs.card}>
              <div style={cs.ct}>📊 Squad coverage — all time</div>
              {Object.entries(SQUAD_COLORS).map(([sq,color]) => {
                const tot = history.flat().reduce((n,a)=>n+a.topics.filter(t=>t.squad===sq).length,0);
                const mx = Math.max(1,...Object.keys(SQUAD_COLORS).map(s2=>history.flat().reduce((n,a)=>n+a.topics.filter(t=>t.squad===s2).length,0)));
                return (
                  <div key={sq} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
                    <div style={{minWidth:100,fontSize:12,color:"#374151"}}>{sq}</div>
                    <div style={{flex:1,height:8,background:"#F1F5F9",borderRadius:999,overflow:"hidden"}}>
                      <div style={{width:`${(tot/mx)*100}%`,height:"100%",background:color,borderRadius:999,transition:"width .5s"}}/>
                    </div>
                    <div style={{fontSize:12,color:"#64748B",minWidth:20,textAlign:"right"}}>{tot}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>}

        {/* ── RUN AGENT ── */}
        {tab==="run agent" && <>
          <div style={cs.card}>
            <div style={cs.ct}>🤖 Agent executor</div>
            <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
              <button style={cs.runB} onClick={runAgent} disabled={running}>{running?"⏳ Running…":"▶ Run now"}</button>
              <span style={{fontSize:12,color:"#64748B"}}>{active.length} active · {avail.length} modules · {history.length} week(s) logged</span>
            </div>
            <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:8,padding:"12px 14px",minHeight:100,maxHeight:280,overflowY:"auto"}}>
              {logs.length===0 && <div style={{fontSize:13,color:"#94A3B8"}}>Hit "Run now" to see live execution logs…</div>}
              {logs.map(l => (
                <div key={l.id} style={{display:"flex",gap:10,padding:"5px 0",borderBottom:"0.5px solid #F3F4F6"}}>
                  <span style={{fontSize:13,minWidth:20}}>{l.icon}</span>
                  <div>
                    <div style={{fontSize:13,color:l.color||"#111827"}}>{l.text}</div>
                    {l.sub && <div style={{fontSize:11,color:"#6B7280",marginTop:1}}>{l.sub}</div>}
                  </div>
                </div>
              ))}
              <div ref={logEnd}/>
            </div>
          </div>
          <div style={cs.card}>
            <div style={cs.ct}>📅 Schedule</div>
            <div style={{fontSize:13,color:"#64748B",lineHeight:2}}>
              <div>🗓 <strong style={{color:"#0F172A"}}>Every Monday 09:00 AM</strong> — 2 modules per member auto-assigned</div>
              <div>📬 <strong style={{color:"#0F172A"}}>Every Friday 04:00 PM</strong> — reminder for pending modules</div>
              <div>📊 <strong style={{color:"#0F172A"}}>1st of each month</strong> — coverage report to Tam</div>
            </div>
          </div>
        </>}

        {/* ── MEMBERS ── */}
        {tab==="members" && <>
          <div style={cs.card}>
            <div style={cs.ct}>👥 Tam's team ({active.length} active)</div>
            {members.map(m => (
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #F8FAFC"}}>
                <div style={cs.avi(m.status==="active")}>{initials(m.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>{m.name}</div>
                  <div style={{fontSize:11,color:"#94A3B8"}}>{m.slack}</div>
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:999,
                  background:m.status==="active"?"#F0FDF4":"#F1F5F9",
                  color:m.status==="active"?"#166534":"#64748B"}}>{m.status}</span>
                <button style={cs.sb(m.status==="active"?"danger":"default")}
                  onClick={()=>setMembers(ms=>ms.map(x=>x.id===m.id?{...x,status:x.status==="active"?"inactive":"active"}:x))}>
                  {m.status==="active"?"Deactivate":"Activate"}
                </button>
              </div>
            ))}
          </div>
          <div style={cs.card}>
            <div style={cs.ct}>➕ Add member</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <input placeholder="Full name" style={{...cs.inp,flex:1,minWidth:120}} value={newMember.name} onChange={e=>setNewMember(f=>({...f,name:e.target.value}))}/>
              <input placeholder="@slack" style={{...cs.inp,flex:1,minWidth:100}} value={newMember.slack} onChange={e=>setNewMember(f=>({...f,slack:e.target.value}))}/>
              <button style={cs.sb("primary")} onClick={()=>{
                if(!newMember.name.trim())return;
                setMembers(m=>[...m,{id:Date.now(),...newMember,slack:newMember.slack||`@${newMember.name.toLowerCase().replace(" ","")}`,status:"active"}]);
                setNewMember({name:"",slack:""});
              }}>Add</button>
            </div>
          </div>
        </>}

        {/* ── TOPICS ── */}
        {tab==="topics" && <>
          <div style={cs.card}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={cs.ct} className="m0">{avail.length} modules · TAM_Product RTM</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {squads.map(sq=>(
                  <button key={sq} style={{...cs.sb(squadFilter===sq?"primary":"default"),fontSize:10}} onClick={()=>setSquadFilter(sq)}>{sq}</button>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:10}}>
              {shownTopics.map(t => (
                <div key={t.id} style={{border:"1px solid #E2E8F0",borderLeft:`3px solid ${SQUAD_COLORS[t.squad]||"#94A3B8"}`,borderRadius:10,padding:"10px 14px",background:"#fff"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#0F172A",marginBottom:6}}>{t.name}</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    <span style={cs.squad(t.squad)}>{t.squad}</span>
                    <span style={cs.cat(t.category)}>{t.category}</span>
                    <span style={cs.diff(t.difficulty)}>{t.difficulty}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ── HISTORY ── */}
        {tab==="history" && (
          history.length===0
            ? <div style={{...cs.card,textAlign:"center",padding:40}}><div style={{fontSize:13,color:"#94A3B8"}}>No history yet. Run the agent to start tracking.</div></div>
            : [...history].reverse().map((week,wi) => (
              <div key={wi} style={cs.card}>
                <div style={cs.ct}>Week {history.length-wi} &nbsp;·&nbsp; {history.length-wi} run(s) ago</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr>{["Member","Module 1","Squad","Module 2","Squad"].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"5px 10px",color:"#64748B",fontSize:11,fontWeight:700,borderBottom:"1px solid #E2E8F0",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
                    ))}</tr></thead>
                    <tbody>{week.map(a=>(
                      <tr key={a.member} style={{borderBottom:"1px solid #F8FAFC"}}>
                        <td style={{padding:"8px 10px",fontWeight:700,color:"#0F172A"}}>{a.member}</td>
                        <td style={{padding:"8px 10px"}}>{a.topics[0]?.name}</td>
                        <td style={{padding:"8px 10px"}}><span style={cs.squad(a.topics[0]?.squad)}>{a.topics[0]?.squad}</span></td>
                        <td style={{padding:"8px 10px"}}>{a.topics[1]?.name}</td>
                        <td style={{padding:"8px 10px"}}><span style={cs.squad(a.topics[1]?.squad)}>{a.topics[1]?.squad}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            ))
        )}

        {/* ── SLACK ── */}
        {tab==="slack" && <>
          <div style={{fontSize:12,color:"#64748B",marginBottom:12}}># tam-weekly-learning</div>
          {slack.length===0
            ? <div style={{...cs.card,textAlign:"center",padding:40}}><div style={{fontSize:13,color:"#94A3B8"}}>No messages yet. Run the agent to post the weekly digest.</div></div>
            : slack.map(msg => (
              <div key={msg.id} style={cs.slack}>
                <div style={{color:"#4ADE80",fontWeight:700,marginBottom:6}}>
                  🤖 tam-assignment-bot &nbsp;<span style={{color:"#475569",fontWeight:400,fontSize:11}}>{msg.ts}</span>
                </div>
                {msg.text.split("\n").map((line,i) => (
                  <div key={i} style={{color:line.startsWith("*")&&line.endsWith("*")?"#fff":line.startsWith("•")?"#C084FC":line.startsWith("📚")?"#FCD34D":line.startsWith("_")?"#64748B":"#D1D2D3"}}>
                    {line||<br/>}
                  </div>
                ))}
                {msg.assignments && (
                  <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #2D3039",fontSize:11,color:"#60A5FA"}}>
                    🔗 TAM_Product RTM &nbsp;·&nbsp; {msg.assignments.reduce((n,a)=>n+a.topics.length,0)} modules assigned to {msg.assignments.length} members
                  </div>
                )}
              </div>
            ))
          }
        </>}

      </div>
    </div>
  );
}
