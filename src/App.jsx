import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const SUPABASE_URL = "https://lbqscxwfttiduofjjmyt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicXNjeHdmdHRpZHVvZmpqbXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzUwNTksImV4cCI6MjA5NDAxMTA1OX0.pPFtxoO5UhRt_UFxJxFOy8zbwLK4OXnk6lxRUGhZack";
const GCAL_URL = "https://script.google.com/macros/s/AKfycbyFyUmXAmlQCuZHgtAKu_0Zc_b3eEDf_u32oCYdNqLAK6t3ktlNktf2tJ-hPhvXgq8N9w/exec";
const hdrs = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
async function sb(table, method = "GET", body = null, query = "") { const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, { method, headers: hdrs, ...(body ? { body: JSON.stringify(body) } : {}) }); if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`); const t = await res.text(); return t ? JSON.parse(t) : null; }
async function sbMoneyman(query = "") { const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions${query}`, { headers: { ...hdrs, "Accept-Profile": "moneyman" } }); if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`); const t = await res.text(); return t ? JSON.parse(t) : null; }
async function addToCalendar(title, start, desc = "") { try { const r = await fetch(GCAL_URL, { method: "POST", body: JSON.stringify({ title, start, description: desc, duration: 30 }) }); return (await r.json()).success; } catch { return false; } }

const STATUSES = [{ id: "new", label: "ליד חדש", color: "#8B5CF6", bg: "#8B5CF615" }, { id: "in_progress", label: "בתהליך", color: "#3B82F6", bg: "#3B82F615" }, { id: "frozen", label: "בהקפאה", color: "#64748B", bg: "#64748B15" }, { id: "closed", label: "נסגר ✓", color: "#10B981", bg: "#10B98115" }, { id: "lost", label: "לא נסגר", color: "#EF4444", bg: "#EF444415" }];
const BOARD_STATUSES = STATUSES.filter(s => s.id !== "new");
const SERVICES = ["הקלטה", "מיקס", "הפקה", "הפקה - אפיק", "לייב סשן", "פודקאסט", "צילום קורס", "השכרת חלל", "בית ריק", "ייעוץ אומנותי - נימשי", "ייעוץ אומנותי - אפיק", "אחר"];
const SOURCES = ["אינסטגרם", "המלצה", "גוגל", "פייסבוק", "אתר", "שיווק אקטיבי", "ממומן - מטא", "הכירות קודמת", "חוזר/ת", "אחר"];
const TASK_TYPES = [{ id: "followup", label: "פולואפ", icon: "📞" }, { id: "call", label: "שיחה", icon: "☎️" }, { id: "prep", label: "הכנת חומרים", icon: "📦" }, { id: "export", label: "ייצוא", icon: "📤" }, { id: "other", label: "אחר", icon: "📌" }];
const INTERACTION_TYPES = [{ id: "call", label: "שיחה" }, { id: "followup", label: "פולואפ" }, { id: "meeting", label: "פגישה" }, { id: "quote", label: "הצעת מחיר" }, { id: "note", label: "הערה" }];
const TEMPS = [{ id: "hot", label: "חם", color: "#EF4444", emoji: "🔥" }, { id: "warm", label: "פושר", color: "#F59E0B", emoji: "🌤" }, { id: "cold", label: "קר", color: "#06B6D4", emoji: "❄️" }];
const CLIENT_STATUSES = [{ id: "working", label: "בעבודה", color: "#3B82F6" }, { id: "completed", label: "הסתיים", color: "#10B981" }];

function fmtDate(d) { return d ? new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short" }) : ""; }
function fmtDateFull(d) { return d ? new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : ""; }
function daysAgo(d) { if (!d) return ""; const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return diff === 0 ? "היום" : diff === 1 ? "אתמול" : diff < 0 ? `בעוד ${Math.abs(diff)} ימים` : `לפני ${diff} ימים`; }
function waUrl(phone) { const c = phone.replace(/\D/g, "").replace(/^0/, "972"); return `https://wa.me/${c}`; }

let _showToast = () => {};
function Toast({ message, type }) { if (!message) return null; return <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: type === "success" ? "#10B981" : "#EF4444", color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 200, direction: "rtl", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>{message}</div>; }
function useToast() { const [t, setT] = useState({ message: "", type: "" }); _showToast = (m, tp = "success") => { setT({ message: m, type: tp }); setTimeout(() => setT({ message: "", type: "" }), 3000); }; return t; }
async function sendToCal(title, date, desc) { const ok = await addToCalendar(title, date, desc); _showToast(ok ? "✓ נוסף ליומן" : "שגיאה", ok ? "success" : "error"); }

const I = {
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  cal: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  bell: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  wa: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  ig: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  link: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
};

function Modal({ children, onClose }) { return <div style={S.overlay} onClick={onClose}><div style={S.modal} onClick={e => e.stopPropagation()}>{children}</div></div>; }

function ContactBtns({ lead }) { return (<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{lead.phone && <a href={waUrl(lead.phone)} target="_blank" rel="noreferrer" style={{ ...S.contactBtn, background: "#25D36620", color: "#25D366" }}>{I.wa} WhatsApp</a>}{lead.phone && <a href={`tel:${lead.phone}`} style={{ ...S.contactBtn, background: "#3B82F620", color: "#3B82F6" }}>📞 {lead.phone}</a>}{lead.email && <a href={`mailto:${lead.email}`} style={{ ...S.contactBtn, background: "#8B5CF620", color: "#8B5CF6" }}>✉️ {lead.email}</a>}{lead.instagram && <a href={`https://instagram.com/${lead.instagram.replace("@","")}`} target="_blank" rel="noreferrer" style={{ ...S.contactBtn, background: "#E1306C20", color: "#E1306C" }}>{I.ig} {lead.instagram}</a>}</div>); }

function LeadForm({ onSave, onClose, initial }) {
  const isEdit = !!initial;
  const [f, setF] = useState(initial || { name:"",phone:"",email:"",instagram:"",service:"",source:"",notes:"",amount:"",status:"new",created_at:"" });
  const [addFollowup,setAddFollowup] = useState(!isEdit);
  const [followupDays,setFollowupDays] = useState(2);
  const ref = useRef(); useEffect(()=>{ref.current?.focus();},[]);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const submit=()=>{if(!f.name.trim())return;const dd=new Date();dd.setDate(dd.getDate()+followupDays);dd.setHours(10,0,0,0);const data={...f,name:f.name.trim(),amount:f.amount?Number(f.amount):0};if(f.created_at)data.created_at=new Date(f.created_at+"T12:00:00").toISOString();else delete data.created_at;onSave(data,!isEdit&&addFollowup?{title:"פולואפ",type:"followup",due_date:dd.toISOString(),completed:false}:null);onClose();};
  return(<Modal onClose={onClose}><div style={S.mHead}><h2 style={S.mTitle}>{isEdit?"עריכת ליד":"ליד חדש"}</h2><button style={S.iconBtn} onClick={onClose}>{I.x}</button></div><div style={S.grid2}><div style={S.full}><label style={S.lbl}>שם *</label><input ref={ref} style={S.inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="שם" onKeyDown={e=>e.key==="Enter"&&submit()}/></div><div><label style={S.lbl}>טלפון</label><input style={S.inp} value={f.phone} onChange={e=>set("phone",e.target.value)} placeholder="050-0000000" dir="ltr"/></div><div><label style={S.lbl}>אימייל</label><input style={S.inp} value={f.email} onChange={e=>set("email",e.target.value)} placeholder="email@example.com" dir="ltr"/></div><div><label style={S.lbl}>אינסטגרם</label><input style={S.inp} value={f.instagram||""} onChange={e=>set("instagram",e.target.value)} placeholder="@username" dir="ltr"/></div><div><label style={S.lbl}>שירות</label><select style={S.inp} value={f.service} onChange={e=>set("service",e.target.value)}><option value="">בחר...</option>{SERVICES.map(s=><option key={s}>{s}</option>)}</select></div><div><label style={S.lbl}>מקור</label><select style={S.inp} value={f.source} onChange={e=>set("source",e.target.value)}><option value="">בחר...</option>{SOURCES.map(s=><option key={s}>{s}</option>)}</select></div><div><label style={S.lbl}>סטטוס</label><select style={S.inp} value={f.status||"new"} onChange={e=>set("status",e.target.value)}>{STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></div><div><label style={S.lbl}>סכום (₪)</label><input style={S.inp} type="number" value={f.amount} onChange={e=>set("amount",e.target.value)} dir="ltr"/></div><div><label style={S.lbl}>תאריך{isEdit?"":" (ברירת מחדל: היום)"}</label><input style={S.inp} type="date" value={f.created_at||""} onChange={e=>set("created_at",e.target.value)} dir="ltr"/></div><div style={S.full}><label style={S.lbl}>הערות</label><textarea style={{...S.inp,minHeight:50,resize:"vertical"}} value={f.notes} onChange={e=>set("notes",e.target.value)}/></div>{!isEdit&&<div style={{...S.full,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,paddingTop:8,borderTop:"1px solid #334155"}}><label style={{...S.lbl,display:"flex",alignItems:"center",gap:8,cursor:"pointer",margin:0}}><input type="checkbox" checked={addFollowup} onChange={e=>setAddFollowup(e.target.checked)} style={{accentColor:"#8B5CF6",width:16,height:16}}/>צור פולואפ</label>{addFollowup&&<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:13,color:"#94A3B8"}}>בעוד</span><input type="number" value={followupDays} onChange={e=>setFollowupDays(Number(e.target.value))} style={{...S.inp,width:50,textAlign:"center",padding:"4px 6px"}} min={1} dir="ltr"/><span style={{fontSize:13,color:"#94A3B8"}}>ימים</span></div>}</div>}</div><div style={S.mFoot}><button style={S.btn2} onClick={onClose}>ביטול</button><button style={S.btn1} onClick={submit} disabled={!f.name.trim()}>{isEdit?"שמור שינויים":"שמור ליד"}</button></div></Modal>);
}

function TaskForm({ leadId, leadName, onSave, onClose }) {
  const [f,setF]=useState({title:"",type:"followup",due_date:"",due_time:"10:00"});const [addToCal,setAddToCal]=useState(true);const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const submit=()=>{if(!f.title.trim()||!f.due_date)return;const dt=new Date(`${f.due_date}T${f.due_time||"10:00"}`);onSave({lead_id:leadId,title:f.title.trim(),type:f.type,due_date:dt.toISOString(),completed:false},addToCal);onClose();};
  return(<Modal onClose={onClose}><div style={S.mHead}><h2 style={S.mTitle}>משימה{leadName?` — ${leadName}`:""}</h2><button style={S.iconBtn} onClick={onClose}>{I.x}</button></div><div style={{display:"flex",flexDirection:"column",gap:10}}><div><label style={S.lbl}>תיאור *</label><input style={S.inp} value={f.title} onChange={e=>set("title",e.target.value)} placeholder="למשל: לחזור ללקוח" onKeyDown={e=>e.key==="Enter"&&submit()}/></div><div style={S.grid2}><div><label style={S.lbl}>סוג</label><select style={S.inp} value={f.type} onChange={e=>set("type",e.target.value)}>{TASK_TYPES.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}</select></div><div><label style={S.lbl}>תאריך *</label><input style={S.inp} type="date" value={f.due_date} onChange={e=>set("due_date",e.target.value)} dir="ltr"/></div><div><label style={S.lbl}>שעה</label><input style={S.inp} type="time" value={f.due_time} onChange={e=>set("due_time",e.target.value)} dir="ltr"/></div></div><label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#94A3B8",cursor:"pointer",paddingTop:4,borderTop:"1px solid #334155"}}><input type="checkbox" checked={addToCal} onChange={e=>setAddToCal(e.target.checked)} style={{accentColor:"#3B82F6",width:16,height:16}}/>הוסף ליומן</label></div><div style={S.mFoot}><button style={S.btn2} onClick={onClose}>ביטול</button><button style={S.btn1} onClick={submit} disabled={!f.title.trim()||!f.due_date}>שמור</button></div></Modal>);
}

function PodcastSessions({leadId,sessions,packages,onAdd,onUpdate,onDelete,onAddPackage,onUpdatePackage,onDeletePackage}){
  const [adding,setAdding]=useState(false);
  const [f,setF]=useState({session_date:"",guest_name:"",notes:"",duration_minutes:""});
  const [newHours,setNewHours]=useState(10);
  const [editId,setEditId]=useState(null);
  const [ef,setEf]=useState({});
  const leadPkgs=packages.filter(p=>p.lead_id===leadId).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const activePkg=leadPkgs.find(p=>p.is_active);
  const inactivePkgs=leadPkgs.filter(p=>!p.is_active);
  const activeSessions=activePkg?sessions.filter(s=>s.package_id===activePkg.id).sort((a,b)=>new Date(a.session_date||0)-new Date(b.session_date||0)):[];
  const totalMin=activeSessions.reduce((s,x)=>s+(x.duration_minutes||0),0);
  const totalHrs=activePkg?Number(activePkg.total_hours)*60:0;
  const pct=totalHrs>0?Math.min(100,Math.round((totalMin/totalHrs)*100)):0;

  const save=()=>{if(!f.session_date||!activePkg)return;onAdd({lead_id:leadId,package_id:activePkg.id,session_date:f.session_date,guest_name:f.guest_name,exported:false,notes:f.notes,duration_minutes:f.duration_minutes?Number(f.duration_minutes):0});setF({session_date:"",guest_name:"",notes:"",duration_minutes:""});setAdding(false);};
  const closePkg=()=>{if(activePkg&&confirm("לסגור חבילה?"))onUpdatePackage(activePkg.id,{is_active:false});};
  const openPkg=()=>{onAddPackage({lead_id:leadId,total_hours:newHours,is_active:true});};
  const fmtMin=(m)=>{const h=Math.floor(m/60);const mm=m%60;return h>0?`${h}:${String(mm).padStart(2,"0")} שעות`:`${mm} דק׳`;};

  return(<div style={{marginTop:10}}>
    {!activePkg?<div style={{textAlign:"center",padding:12}}><div style={{fontSize:13,color:"#64748B",marginBottom:8}}>אין חבילה פעילה</div><div style={{display:"flex",gap:6,justifyContent:"center",alignItems:"center"}}><input type="number" value={newHours} onChange={e=>setNewHours(Number(e.target.value))} style={{...S.inp,width:60,textAlign:"center",padding:"4px 6px"}} min={1} dir="ltr"/><span style={{fontSize:12,color:"#94A3B8"}}>שעות</span><button style={S.btn1} onClick={openPkg}>פתח חבילה חדשה</button></div></div>:(
    <>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <span style={{fontSize:13,fontWeight:700}}>🎙 חבילה פעילה — {activePkg.total_hours} שעות</span>
      <div style={{display:"flex",gap:4}}><button style={{...S.btn1,padding:"3px 10px",fontSize:11}} onClick={()=>setAdding(true)}>{I.plus} סשן</button><button style={{...S.btn2,padding:"3px 10px",fontSize:11}} onClick={closePkg}>סגור חבילה</button><button style={{...S.iconBtn,color:"#EF4444"}} onClick={()=>{if(confirm("בטוחים שרוצים למחוק חבילה?"))onDeletePackage(activePkg.id);}}>{I.trash}</button></div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
      <div style={{flex:1,height:8,background:"#1E293B",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct>=90?"#EF4444":pct>=70?"#F59E0B":"#10B981",borderRadius:4,transition:"width 0.3s"}}/></div>
      <span style={{fontSize:12,color:"#94A3B8",whiteSpace:"nowrap"}}>{fmtMin(totalMin)} / {activePkg.total_hours} שעות ({pct}%)</span>
    </div>
    {adding&&<div style={{display:"flex",gap:4,marginBottom:6,flexWrap:"wrap"}}><input style={{...S.inp,width:100,padding:"4px 6px",fontSize:12}} type="date" value={f.session_date} onChange={e=>setF(p=>({...p,session_date:e.target.value}))} dir="ltr"/><input style={{...S.inp,width:70,padding:"4px 6px",fontSize:12}} type="number" value={f.duration_minutes} onChange={e=>setF(p=>({...p,duration_minutes:e.target.value}))} placeholder="דק׳" dir="ltr"/><input style={{...S.inp,flex:1,padding:"4px 6px",fontSize:12,minWidth:70}} value={f.guest_name} onChange={e=>setF(p=>({...p,guest_name:e.target.value}))} placeholder="אורח/ת"/><input style={{...S.inp,flex:1,padding:"4px 6px",fontSize:12,minWidth:70}} value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="הערה"/><button style={{...S.btn1,padding:"4px 10px",fontSize:11}} onClick={save}>שמור</button><button style={{...S.btn2,padding:"4px 10px",fontSize:11}} onClick={()=>setAdding(false)}>ביטול</button></div>}
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      {activeSessions.map((s,i)=>{const isEd=editId===s.id;return(<div key={s.id} style={{display:"flex",gap:6,alignItems:"center",background:"#0F172A",borderRadius:6,padding:"6px 10px",fontSize:12}}><span style={{color:"#64748B",minWidth:20}}>{i+1}.</span>{isEd?<><input style={{...S.inp,width:95,padding:"3px 5px",fontSize:11}} type="date" value={ef.session_date||""} onChange={e=>setEf(p=>({...p,session_date:e.target.value}))} dir="ltr"/><input style={{...S.inp,width:45,padding:"3px 5px",fontSize:11}} type="number" value={ef.duration_minutes||""} onChange={e=>setEf(p=>({...p,duration_minutes:e.target.value}))} placeholder="דק׳" dir="ltr"/><input style={{...S.inp,flex:1,padding:"3px 5px",fontSize:11,minWidth:50}} value={ef.guest_name||""} onChange={e=>setEf(p=>({...p,guest_name:e.target.value}))} placeholder="אורח/ת"/><input style={{...S.inp,flex:1,padding:"3px 5px",fontSize:11,minWidth:50}} value={ef.notes||""} onChange={e=>setEf(p=>({...p,notes:e.target.value}))} placeholder="הערה"/><button onClick={()=>{onUpdate(s.id,{session_date:ef.session_date,duration_minutes:ef.duration_minutes?Number(ef.duration_minutes):0,guest_name:ef.guest_name,notes:ef.notes});setEditId(null);}} style={{...S.iconBtn,color:"#10B981"}}>{I.check}</button><button onClick={()=>setEditId(null)} style={{...S.iconBtn,color:"#64748B"}}>{I.x}</button></>:<><span style={{minWidth:65,color:"#94A3B8"}}>{s.session_date?fmtDate(s.session_date):"—"}</span><span style={{minWidth:45,color:"#3B82F6",fontWeight:600}}>{s.duration_minutes?fmtMin(s.duration_minutes):"—"}</span><span style={{flex:1}}>{s.guest_name||"—"}</span><button onClick={()=>onUpdate(s.id,{exported:!s.exported})} style={{...S.iconBtn,color:s.exported?"#10B981":"#475569",fontSize:12}}>{s.exported?"✓ יוצא":"ייצוא"}</button><button onClick={()=>onUpdate(s.id,{edited:!s.edited})} style={{...S.iconBtn,color:s.edited?"#8B5CF6":"#475569",fontSize:12}}>{s.edited?"✓ עריכה":"עריכה"}</button><span style={{flex:1,color:"#64748B",fontSize:11}}>{s.notes}</span><button onClick={()=>{setEditId(s.id);setEf({session_date:s.session_date||"",duration_minutes:s.duration_minutes||"",guest_name:s.guest_name||"",notes:s.notes||""});}} style={{...S.iconBtn,color:"#64748B"}}>{I.edit}</button><button onClick={()=>{if(confirm("למחוק?"))onDelete(s.id);}} style={{...S.iconBtn,color:"#64748B"}}>{I.trash}</button></>}</div>)})}
      {activeSessions.length===0&&<div style={{fontSize:12,color:"#334155",textAlign:"center",padding:10}}>אין סשנים עדיין</div>}
    </div>
    </>)}
    {inactivePkgs.length>0&&<div style={{marginTop:12}}><div style={{fontSize:13,fontWeight:700,marginBottom:6,color:"#94A3B8"}}>📦 חבילות קודמות ({inactivePkgs.length})</div>{inactivePkgs.map(pkg=>{const pkgSessions=sessions.filter(s=>s.package_id===pkg.id).sort((a,b)=>new Date(a.session_date||0)-new Date(b.session_date||0));const pkgMin=pkgSessions.reduce((s,x)=>s+(x.duration_minutes||0),0);return(<details key={pkg.id} style={{background:"#0F172A",borderRadius:8,marginBottom:4,overflow:"hidden"}}><summary style={{padding:"8px 12px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#94A3B8",display:"flex",alignItems:"center",gap:8}}><span style={{flex:1}}>חבילה — {pkg.total_hours} שעות | נוצלו: {fmtMin(pkgMin)} | {pkgSessions.length} סשנים</span><span style={{fontSize:11,color:"#475569"}}>{pkg.created_at?fmtDate(pkg.created_at):""}</span></summary><div style={{padding:"4px 12px 8px"}}>{pkgSessions.map((s,i)=><div key={s.id} style={{display:"flex",gap:8,alignItems:"center",fontSize:11,color:"#64748B",padding:"3px 0",borderTop:i>0?"1px solid #1E293B":"none"}}><span style={{minWidth:18}}>{i+1}.</span><span style={{minWidth:60}}>{s.session_date?fmtDate(s.session_date):""}</span><span style={{minWidth:45,color:"#3B82F6"}}>{s.duration_minutes?fmtMin(s.duration_minutes):""}</span><span style={{flex:1}}>{s.guest_name||"—"}</span><span style={{color:s.exported?"#10B981":"#475569"}}>{s.exported?"✓ יוצא":"—"}</span><span style={{color:s.edited?"#8B5CF6":"#475569"}}>{s.edited?"✓ עריכה":"—"}</span>{s.notes&&<span style={{flex:1,fontSize:10}}>{s.notes}</span>}</div>)}{pkgSessions.length===0&&<div style={{fontSize:11,color:"#334155",padding:4}}>אין סשנים</div>}<div style={{display:"flex",gap:4,marginTop:6}}><button onClick={()=>{if(!activePkg)onUpdatePackage(pkg.id,{is_active:true});else alert("יש כבר חבילה פעילה — סגור אותה קודם");}} style={{...S.btn2,padding:"3px 10px",fontSize:11}}>פתח חבילה</button><button onClick={()=>{if(confirm("בטוחים שרוצים למחוק חבילה?"))onDeletePackage(pkg.id);}} style={{...S.iconBtn,color:"#EF4444",fontSize:11}}>{I.trash} מחק</button></div></div></details>);})}</div>}
  </div>);
}

function LeadDetail({lead,interactions,tasks,sessions,packages,onBack,onUpdate,onDelete,onAddInteraction,onUpdateInteraction,onDeleteInteraction,onAddTask,onUpdateTask,onToggleTask,onDeleteTask,onAddSession,onUpdateSession,onDeleteSession,onAddPackage,onUpdatePackage,onDeletePackage}){
  const [noteText,setNoteText]=useState("");const [noteType,setNoteType]=useState("note");const [noteDate,setNoteDate]=useState(new Date().toISOString().split("T")[0]);const [showTaskForm,setShowTaskForm]=useState(false);const [showEditForm,setShowEditForm]=useState(false);const [editingInteraction,setEditingInteraction]=useState(null);const [editInterText,setEditInterText]=useState("");const [editingTask,setEditingTask]=useState(null);const [editTaskText,setEditTaskText]=useState("");const [showPackage,setShowPackage]=useState(packages.some(p=>p.lead_id===lead.id));
  const addNote=async()=>{if(!noteText.trim())return;await onAddInteraction({lead_id:lead.id,text:noteText.trim(),type:noteType,date:new Date(noteDate+"T12:00:00").toISOString()});setNoteText("");setNoteDate(new Date().toISOString().split("T")[0]);};
  const leadTasks=tasks.filter(t=>t.lead_id===lead.id).sort((a,b)=>new Date(a.due_date)-new Date(b.due_date));const leadInter=interactions.filter(i=>i.lead_id===lead.id).sort((a,b)=>new Date(b.date)-new Date(a.date));const temp=TEMPS.find(t=>t.id===lead.temperature);
  return(<div style={S.detail}><div style={S.detailTop}><button style={S.backBtn} onClick={onBack}>{I.back} חזרה</button><div style={{display:"flex",gap:6}}><button style={{...S.iconBtn,color:"#8B5CF6"}} onClick={()=>setShowEditForm(true)}>{I.edit}</button><button style={{...S.iconBtn,color:"#EF4444"}} onClick={()=>{if(confirm("למחוק?")){onDelete(lead.id);onBack();}}}>{I.trash}</button></div></div>
  {showEditForm&&<LeadForm initial={{name:lead.name,phone:lead.phone||"",email:lead.email||"",instagram:lead.instagram||"",service:lead.service||"",source:lead.source||"",notes:lead.notes||"",amount:lead.amount||0,status:lead.status||"new",created_at:lead.created_at?lead.created_at.split("T")[0]:""}} onSave={(d)=>{onUpdate(lead.id,d);setShowEditForm(false);}} onClose={()=>setShowEditForm(false)}/>}
  <div style={S.detailCard}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><h2 style={{fontSize:22,fontWeight:800,margin:"0 0 10px"}}>{lead.name}</h2>{temp&&<span style={{fontSize:20}} title={temp.label}>{temp.emoji}</span>}</div>
  <ContactBtns lead={lead}/>
  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{lead.service&&<span style={S.chip}>{lead.service}</span>}{lead.source&&<span style={S.chip}>{lead.source}</span>}{lead.amount>0&&<span style={{color:"#10B981",fontWeight:700,fontSize:14}}>₪{lead.amount.toLocaleString()}</span>}</div>
  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{STATUSES.map(s=><button key={s.id} onClick={()=>onUpdate(lead.id,{status:s.id})} style={{border:"none",padding:"5px 14px",borderRadius:20,fontSize:13,cursor:"pointer",fontFamily:"inherit",background:lead.status===s.id?s.color:s.bg,color:lead.status===s.id?"#fff":s.color,fontWeight:lead.status===s.id?700:500}}>{s.label}</button>)}</div>
  {lead.status==="in_progress"&&<div style={{display:"flex",gap:4,marginBottom:8,alignItems:"center"}}><span style={{fontSize:12,color:"#64748B",marginLeft:6}}>טמפרטורה:</span>{TEMPS.map(t=><button key={t.id} onClick={()=>onUpdate(lead.id,{temperature:lead.temperature===t.id?"":t.id})} style={{border:"none",padding:"3px 10px",borderRadius:12,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:lead.temperature===t.id?t.color:"#1E293B",color:lead.temperature===t.id?"#fff":"#64748B"}}>{t.emoji} {t.label}</button>)}</div>}
  {lead.status==="closed"&&<div style={{display:"flex",gap:4,marginBottom:8,alignItems:"center"}}><span style={{fontSize:12,color:"#64748B",marginLeft:6}}>סטטוס לקוח:</span>{CLIENT_STATUSES.map(cs=><button key={cs.id} onClick={()=>onUpdate(lead.id,{client_status:lead.client_status===cs.id?"":cs.id})} style={{border:"none",padding:"3px 10px",borderRadius:12,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:lead.client_status===cs.id?cs.color:"#1E293B",color:lead.client_status===cs.id?"#fff":"#64748B"}}>{cs.label}</button>)}</div>}
  {lead.notes&&<p style={{fontSize:14,color:"#94A3B8",lineHeight:1.6,margin:"8px 0 0",padding:"8px 0 0",borderTop:"1px solid #1E293B"}}>{lead.notes}</p>}
  <div style={{display:"flex",gap:14,fontSize:12,color:"#475569",marginTop:8,paddingTop:8,borderTop:"1px solid #1E293B"}}><span>נוצר: {fmtDateFull(lead.created_at)}</span><span>עודכן: {daysAgo(lead.updated_at)}</span></div></div>
  {lead.service==="פודקאסט"&&lead.status==="closed"&&<div style={{...S.section,background:"#111827",borderRadius:10,padding:12,marginTop:12}}>{!showPackage?<button style={S.btn1} onClick={()=>setShowPackage(true)}>🎙 ניהול חבילות פודקאסט</button>:<PodcastSessions leadId={lead.id} sessions={sessions} packages={packages} onAdd={onAddSession} onUpdate={onUpdateSession} onDelete={onDeleteSession} onAddPackage={onAddPackage} onUpdatePackage={onUpdatePackage} onDeletePackage={onDeletePackage}/>}</div>}
  <div style={S.section}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={S.secTitle}>{I.cal} משימות ({leadTasks.length})</h3><button style={{...S.btn1,padding:"5px 12px",fontSize:12}} onClick={()=>setShowTaskForm(true)}>{I.plus} משימה</button></div><div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8}}>{leadTasks.map(t=>{const tt=TASK_TYPES.find(x=>x.id===t.type);const overdue=!t.completed&&new Date(t.due_date)<new Date();const isEd=editingTask===t.id;return(<div key={t.id} style={{display:"flex",alignItems:"center",gap:8,background:"#0F172A",borderRadius:8,padding:"8px 12px",opacity:t.completed?0.5:1,borderRight:`3px solid ${overdue?"#EF4444":t.completed?"#10B981":"#3B82F6"}`}}><button onClick={()=>onToggleTask(t.id,!t.completed)} style={{...S.iconBtn,color:t.completed?"#10B981":"#475569",flexShrink:0}}>{t.completed?I.check:<div style={{width:14,height:14,border:"2px solid #475569",borderRadius:3}}/>}</button>{isEd?<><input style={{...S.inp,flex:1,padding:"4px 8px",fontSize:13}} value={editTaskText} onChange={e=>setEditTaskText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){onUpdateTask(t.id,{title:editTaskText.trim()});setEditingTask(null);}if(e.key==="Escape")setEditingTask(null);}} autoFocus/><button onClick={()=>{onUpdateTask(t.id,{title:editTaskText.trim()});setEditingTask(null);}} style={{...S.iconBtn,color:"#10B981"}}>{I.check}</button><button onClick={()=>setEditingTask(null)} style={{...S.iconBtn,color:"#64748B"}}>{I.x}</button></>:<><span style={{fontSize:13,flex:1,textDecoration:t.completed?"line-through":"none"}}>{tt?.icon} {t.title}</span><span style={{fontSize:11,color:overdue?"#EF4444":"#475569",whiteSpace:"nowrap"}}>{fmtDate(t.due_date)}</span><button onClick={()=>sendToCal(`${lead.name} — ${t.title}`,t.due_date,`טלפון: ${lead.phone||""}`)} style={{...S.iconBtn,color:"#3B82F6"}}>{I.cal}</button><button onClick={()=>{setEditingTask(t.id);setEditTaskText(t.title);}} style={{...S.iconBtn,color:"#64748B"}}>{I.edit}</button><button onClick={()=>{if(confirm("למחוק?"))onDeleteTask(t.id);}} style={{...S.iconBtn,color:"#64748B"}}>{I.trash}</button></>}</div>);})}{leadTasks.length===0&&<p style={S.empty}>אין משימות</p>}</div></div>
  <div style={S.section}><h3 style={S.secTitle}>💬 אינטראקציות ({leadInter.length})</h3><div style={{display:"flex",gap:6,marginTop:8}}><select style={{...S.inp,width:85,padding:"6px 6px",fontSize:12}} value={noteType} onChange={e=>setNoteType(e.target.value)}>{INTERACTION_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select><input style={{...S.inp,width:110,padding:"6px 6px",fontSize:12}} type="date" value={noteDate} onChange={e=>setNoteDate(e.target.value)} dir="ltr"/><input style={{...S.inp,flex:1}} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="הוסף אינטראקציה..." onKeyDown={e=>e.key==="Enter"&&addNote()}/><button style={S.btn1} onClick={addNote} disabled={!noteText.trim()}>הוסף</button></div><div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8}}>{leadInter.map(i=>{const it=INTERACTION_TYPES.find(x=>x.id===i.type);const isEd=editingInteraction===i.id;return(<div key={i.id} style={{display:"flex",gap:8,alignItems:"center",background:"#0F172A",borderRadius:8,padding:"8px 12px"}}><span style={{fontSize:11,color:"#475569",whiteSpace:"nowrap",minWidth:55}}>{fmtDate(i.date)}</span>{it&&<span style={{fontSize:11,color:"#8B5CF6",background:"#8B5CF615",padding:"1px 6px",borderRadius:4,whiteSpace:"nowrap"}}>{it.label}</span>}{isEd?<><input style={{...S.inp,flex:1,padding:"4px 8px",fontSize:13}} value={editInterText} onChange={e=>setEditInterText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){onUpdateInteraction(i.id,{text:editInterText.trim()});setEditingInteraction(null);}if(e.key==="Escape")setEditingInteraction(null);}} autoFocus/><button onClick={()=>{onUpdateInteraction(i.id,{text:editInterText.trim()});setEditingInteraction(null);}} style={{...S.iconBtn,color:"#10B981"}}>{I.check}</button><button onClick={()=>setEditingInteraction(null)} style={{...S.iconBtn,color:"#64748B"}}>{I.x}</button></>:<><span style={{fontSize:13,lineHeight:1.5,flex:1}}>{i.text}</span><button onClick={()=>{setEditingInteraction(i.id);setEditInterText(i.text);}} style={{...S.iconBtn,color:"#64748B"}}>{I.edit}</button><button onClick={()=>{if(confirm("למחוק?"))onDeleteInteraction(i.id);}} style={{...S.iconBtn,color:"#64748B"}}>{I.trash}</button></>}</div>);})}{leadInter.length===0&&<p style={S.empty}>אין אינטראקציות</p>}</div></div>
  {showTaskForm&&<TaskForm leadId={lead.id} leadName={lead.name} onSave={async(t,cal)=>{await onAddTask(t);if(cal)sendToCal(`${lead.name} — ${t.title}`,t.due_date,`טלפון: ${lead.phone||""}`);setShowTaskForm(false);}} onClose={()=>setShowTaskForm(false)}/>}</div>);
}

function TasksView({tasks,leads,onToggle,onDelete}){const pending=tasks.filter(t=>!t.completed).sort((a,b)=>new Date(a.due_date)-new Date(b.due_date));const done=tasks.filter(t=>t.completed).sort((a,b)=>new Date(b.due_date)-new Date(a.due_date)).slice(0,10);const renderTask=t=>{const lead=leads.find(l=>l.id===t.lead_id);const tt=TASK_TYPES.find(x=>x.id===t.type);const overdue=!t.completed&&new Date(t.due_date)<new Date();return(<div key={t.id} style={{display:"flex",alignItems:"center",gap:8,background:"#0F172A",borderRadius:8,padding:"8px 12px",opacity:t.completed?0.5:1,borderRight:`3px solid ${overdue?"#EF4444":t.completed?"#10B981":"#3B82F6"}`}}><button onClick={()=>onToggle(t.id,!t.completed)} style={{...S.iconBtn,color:t.completed?"#10B981":"#475569",flexShrink:0}}>{t.completed?I.check:<div style={{width:14,height:14,border:"2px solid #475569",borderRadius:3}}/>}</button><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,textDecoration:t.completed?"line-through":"none"}}>{tt?.icon} {t.title}</div>{lead&&<div style={{fontSize:11,color:"#475569"}}>{lead.name}</div>}</div><span style={{fontSize:11,color:overdue?"#EF4444":"#475569",whiteSpace:"nowrap"}}>{daysAgo(t.due_date)}</span><button onClick={()=>sendToCal(lead?`${lead.name} — ${t.title}`:t.title,t.due_date,lead?`טלפון: ${lead.phone||""}`:"")} style={{...S.iconBtn,color:"#3B82F6"}}>{I.cal}</button><button onClick={()=>onDelete(t.id)} style={{...S.iconBtn,color:"#64748B"}}>{I.trash}</button></div>);};return(<div style={{padding:"8px 0 20px"}}><h3 style={{...S.secTitle,marginBottom:8}}>פתוחות ({pending.length})</h3><div style={{display:"flex",flexDirection:"column",gap:4}}>{pending.map(renderTask)}{pending.length===0&&<p style={S.empty}>אין משימות 🎉</p>}</div>{done.length>0&&<><h3 style={{...S.secTitle,marginTop:16,marginBottom:8,color:"#475569"}}>הושלמו</h3><div style={{display:"flex",flexDirection:"column",gap:4}}>{done.map(renderTask)}</div></>}</div>);}

function ClientsView({leads,onSelect}){const clients=leads.filter(l=>l.status==="closed");const [svcFilter,setSvcFilter]=useState("");const [csFilter,setCsFilter]=useState("");const [search,setSearch]=useState("");const filtered=clients.filter(c=>{if(svcFilter&&c.service!==svcFilter)return false;if(csFilter&&c.client_status!==csFilter)return false;if(search&&!c.name.includes(search)&&!c.phone?.includes(search))return false;return true;});return(<div style={{padding:"8px 0 20px"}}><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}><div style={S.searchBox}>{I.search}<input style={S.searchInp} value={search} onChange={e=>setSearch(e.target.value)} placeholder="חיפוש לקוח..."/></div></div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}><button style={!csFilter?S.filterOn:S.filterOff} onClick={()=>setCsFilter("")}>הכל ({clients.length})</button>{CLIENT_STATUSES.map(cs=>{const c=clients.filter(l=>l.client_status===cs.id).length;return <button key={cs.id} style={csFilter===cs.id?{...S.filterOn,background:cs.color}:S.filterOff} onClick={()=>setCsFilter(csFilter===cs.id?"":cs.id)}>{cs.label} ({c})</button>;})}<span style={{width:1,height:16,background:"#334155",margin:"0 2px"}}/>{SERVICES.map(svc=>{const c=clients.filter(l=>l.service===svc).length;if(c===0)return null;return <button key={svc} style={svcFilter===svc?S.filterOn:S.filterOff} onClick={()=>setSvcFilter(svcFilter===svc?"":svc)}>{svc} ({c})</button>;})}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>{filtered.map(c=>{const cs=CLIENT_STATUSES.find(x=>x.id===c.client_status);return(<div key={c.id} style={{...S.card,cursor:"pointer"}} onClick={()=>onSelect(c)}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:14,fontWeight:600}}>{c.name}</span>{cs&&<span style={{fontSize:10,background:cs.color+"20",color:cs.color,padding:"1px 8px",borderRadius:10,fontWeight:600}}>{cs.label}</span>}</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{c.service&&<span style={{fontSize:11,background:"#1E293B",color:"#94A3B8",padding:"1px 7px",borderRadius:4}}>{c.service}</span>}{c.amount>0&&<span style={{fontSize:11,color:"#10B981",fontWeight:600}}>₪{c.amount.toLocaleString()}</span>}</div>{c.phone&&<div style={{fontSize:11,color:"#475569",marginTop:4}}>{c.phone}</div>}</div>);})}</div>{filtered.length===0&&<p style={S.empty}>אין לקוחות</p>}</div>);}

function useNotifications(leads,tasks,interactions){return useMemo(()=>{const n=[];const now=Date.now();const twoDays=2*86400000;const oneWeek=7*86400000;const dismissed=JSON.parse(localStorage.getItem("princess_dismissed_notifs")||"{}");leads.filter(l=>l.status==="in_progress").forEach(l=>{const li=interactions.filter(i=>i.lead_id===l.id).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];const lt=tasks.filter(t=>t.lead_id===l.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];const la=Math.max(li?new Date(li.date).getTime():0,lt?new Date(lt.created_at).getTime():0,new Date(l.updated_at).getTime());if(now-la>twoDays)n.push({type:"lead",id:l.id,text:`${l.name} — ללא פעילות יומיים+`,leadId:l.id});});leads.filter(l=>l.status==="frozen").forEach(l=>{const dismissKey=`frozen_${l.id}`;const dismissedAt=dismissed[dismissKey]?new Date(dismissed[dismissKey]).getTime():0;if(now-dismissedAt>oneWeek){const hasTasks=tasks.some(t=>t.lead_id===l.id&&!t.completed);n.push({type:"frozen",id:l.id,text:`❄️ ${l.name} — בהקפאה${hasTasks?" (יש משימות פתוחות)":""}`,leadId:l.id,dismissKey});}});tasks.filter(t=>!t.completed).forEach(t=>{const cr=new Date(t.created_at).getTime();if(now-cr>twoDays&&new Date(t.due_date)<new Date()){const lead=leads.find(l=>l.id===t.lead_id);n.push({type:"task",id:t.id,text:`⏰ ${lead?.name||""} — ${t.title}`,leadId:t.lead_id});}});return n;},[leads,tasks,interactions]);}

function NotifPanel({notifs,onClose,onSelect}){const dismiss=(n)=>{if(n.dismissKey){const d=JSON.parse(localStorage.getItem("princess_dismissed_notifs")||"{}");d[n.dismissKey]=new Date().toISOString();localStorage.setItem("princess_dismissed_notifs",JSON.stringify(d));}onSelect(n.leadId);onClose();};return(<Modal onClose={onClose}><div style={S.mHead}><h2 style={S.mTitle}>🔔 התראות ({notifs.length})</h2><button style={S.iconBtn} onClick={onClose}>{I.x}</button></div><div style={{display:"flex",flexDirection:"column",gap:4}}>{notifs.map((n,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center",background:"#0F172A",borderRadius:8,padding:"10px 12px",cursor:"pointer",borderRight:`3px solid ${n.type==="lead"?"#F59E0B":n.type==="frozen"?"#64748B":"#EF4444"}`}} onClick={()=>dismiss(n)}><span style={{fontSize:14}}>{n.type==="lead"?"⚠️":n.type==="frozen"?"❄️":"⏰"}</span><span style={{fontSize:13,flex:1}}>{n.text}</span>{n.dismissKey&&<span style={{fontSize:10,color:"#475569"}}>לחץ להשתקה לשבוע</span>}</div>)}{notifs.length===0&&<p style={S.empty}>אין התראות 🎉</p>}</div></Modal>);}

const EXPENSE_CATS_HOME=["מזון","אוכל בחוץ","ביטוחים","פארם","משתנות","שכד","חשבונות בית","טיפול","כושר","העברות לאפיק/משותף"];
const EXPENSE_CATS_BIZ=["שכד אולפן","הלוואות וקרנות","תחזוקת רכב","דלק","תוכנות","ספקים","ציוד","הורדת אשראי","ריביות ועמלות","מעמ ומיסים","חשבונות עסק","שיווק","תחבצ וחניונים","לא תזרימי","אחר"];
const INCOME_CATS=["הכנסה","הכנסה בחוב","הכנסה עתידית","מתנה"];
const ALL_CATS=[...EXPENSE_CATS_HOME,...EXPENSE_CATS_BIZ,...INCOME_CATS];
const DOMAINS=[{id:"home",label:"בית"},{id:"biz",label:"עסק"},{id:"gift",label:"מתנה"}];

// Category → auto domain + VAT defaults
const CAT_DEFAULTS = {
  // בית — לא מוכר
  "מזון": { domain: "home", includes_vat: "כן", vat_deductible: "לא" },
  "אוכל בחוץ": { domain: "home", includes_vat: "כן", vat_deductible: "לא" },
  "פארם": { domain: "home", includes_vat: "כן", vat_deductible: "לא" },
  "משתנות": { domain: "home", includes_vat: "כן", vat_deductible: "לא" },
  "כושר": { domain: "home", includes_vat: "כן", vat_deductible: "לא" },
  "העברות לאפיק/משותף": { domain: "home", includes_vat: "לא", vat_deductible: "לא" },
  "שכד": { domain: "home", includes_vat: "לא", vat_deductible: "לא" },
  "חשבונות בית": { domain: "home", includes_vat: "כן", vat_deductible: "לא" },
  "ביטוחים": { domain: "home", includes_vat: "כן", vat_deductible: "לא" },
  // בית — מוכר למע״מ
  "טיפול": { domain: "home", includes_vat: "כן", vat_deductible: "כן" },
  // עסק — מוכר
  "שכד אולפן": { domain: "biz", includes_vat: "כן", vat_deductible: "כן" },
  "ספקים": { domain: "biz", includes_vat: "כן", vat_deductible: "כן" },
  "ציוד": { domain: "biz", includes_vat: "כן", vat_deductible: "כן" },
  "חשבונות עסק": { domain: "biz", includes_vat: "כן", vat_deductible: "כן" },
  // עסק — לא מוכר (חו״ל)
  "תוכנות": { domain: "biz", includes_vat: "לא", vat_deductible: "לא" },
  "שיווק": { domain: "biz", includes_vat: "לא", vat_deductible: "לא" },
  // עסק — רכב
  "דלק": { domain: "biz", includes_vat: "כן", vat_deductible: "רכב" },
  "תחזוקת רכב": { domain: "biz", includes_vat: "כן", vat_deductible: "רכב" },
  // עסק — לא מוכר
  "הלוואות וקרנות": { domain: "biz", includes_vat: "לא", vat_deductible: "לא" },
  "ריביות ועמלות": { domain: "biz", includes_vat: "לא", vat_deductible: "לא" },
  "תחבצ וחניונים": { domain: "biz", includes_vat: "כן", vat_deductible: "כן" },
  "מעמ ומיסים": { domain: "biz", includes_vat: "לא", vat_deductible: "לא" },
  "הורדת אשראי": { domain: "", includes_vat: "", vat_deductible: "" },
  "לא תזרימי": { domain: "", includes_vat: "", vat_deductible: "" },
  "אחר": { domain: "biz", includes_vat: "", vat_deductible: "" },
  // הכנסות
  "הכנסה": { domain: "biz", includes_vat: "כן", vat_deductible: "" },
  "הכנסה בחוב": { domain: "biz", includes_vat: "כן", vat_deductible: "" },
  "הכנסה עתידית": { domain: "biz", includes_vat: "כן", vat_deductible: "" },
  "מתנה": { domain: "gift", includes_vat: "לא", vat_deductible: "" },
};
const INCOME_SOURCES=["הקלטה","מיקס","הפקה","הפקה - אפיק","לייב סשן","פודקאסט","צילום קורס","השכרת חלל","בית ריק","ייעוץ אומנותי - נימשי","ייעוץ אומנותי - אפיק","בקליין","הופעות","שוכרי משנה","מיקסים","תמלוגים","אחר"];
const PAY_METHODS=["אשראי","העברה","מזומן","הוראת קבע","ביט","פייבוקס","אחר"];
const TXN_STATUSES=["שולם/התקבל","בחוב","עתידי"];

// Auto-categorization: business name → category map
const AUTO_CAT_MAP = {
  // דלק
  "דור אלון": "דלק", "פז ": "דלק", "סונול": "דלק", "דלק מנטה": "דלק", "דלק קמעונאות": "דלק", "תחנת דלק": "דלק", "ten ": "דלק", "yellow": "דלק", "אלון געש": "דלק", "טן-בית": "דלק", "דור - ": "דלק",
  // מזון
  "שופרסל": "מזון", "רמי לוי": "מזון", "מגה": "מזון", "ויקטורי": "מזון", "יוחננוף": "מזון", "אושר עד": "מזון", "חצי חינם": "מזון", "פרש מרקט": "מזון", "טיב טעם": "מזון", "יינות ביתן": "מזון", "am:pm": "מזון",
  "שאולי אקספרס": "מזון", "צרכנית עין איילה": "מזון", "סופר סופר": "מזון", "ע.ד הבשר": "מזון", "שדה ירוק": "מזון", "מינימרקט": "מזון", "מכלת": "מזון", "אטליז": "מזון", "דוריס קצבים": "מזון", "סטופ מרקט": "מזון", "שוק אבן יהודה": "מזון", "דבוש רוזנבומס": "מזון", "פרי אטיה": "מזון", "ניצת הדובדבן": "מזון",
  // אוכל בחוץ
  "מקדונלד": "אוכל בחוץ", "ארומה": "אוכל בחוץ", "קפה": "אוכל בחוץ", "מסעדה": "אוכל בחוץ", "מסעדת": "אוכל בחוץ", "פיצה": "אוכל בחוץ", "בורגר": "אוכל בחוץ", "סושי": "אוכל בחוץ", "wolt": "אוכל בחוץ", "תן ביס": "אוכל בחוץ",
  "פלאפל": "אוכל בחוץ", "שווארמה": "אוכל בחוץ", "חומוס": "אוכל בחוץ", "מאכלי קייס": "אוכל בחוץ", "גולדה": "אוכל בחוץ", "אוטלו ג'לטו": "אוכל בחוץ", "טאקו טיה": "אוכל בחוץ", "לאקי ציקן": "אוכל בחוץ", "בית רצון": "אוכל בחוץ", "דקן ניהול מסע": "אוכל בחוץ", "קשת טעמים": "אוכל בחוץ", "bbb": "אוכל בחוץ", "בייקרי": "אוכל בחוץ", "קופילאב": "אוכל בחוץ", "נאשה": "אוכל בחוץ", "sicafe": "אוכל בחוץ", "אלונית": "אוכל בחוץ",
  // פארם
  "סופר פארם": "פארם", "סופר - פארם": "פארם", "פארם": "פארם", "be ": "פארם", "dm drogerie": "פארם",
  // ביטוחים
  "הראל": "ביטוחים", "מגדל": "ביטוחים", "כלל ביטוח": "ביטוחים", "הפניקס": "ביטוחים", "ביטוח לאומי": "ביטוחים",
  // תוכנות
  "google": "תוכנות", "apple": "תוכנות", "spotify": "תוכנות", "netflix": "תוכנות", "adobe": "תוכנות", "amazon": "תוכנות", "microsoft": "תוכנות", "openai": "תוכנות", "anthropic": "תוכנות", "github": "תוכנות",
  "disney": "תוכנות", "claude ai": "תוכנות", "dropbox": "תוכנות", "ableton": "תוכנות", "universal audio": "תוכנות", "splice": "תוכנות", "paddle": "תוכנות", "samply": "תוכנות", "veed": "תוכנות",
  // שיווק
  "facebk": "שיווק", "ads4866": "שיווק",
  // תחבצ וחניונים
  "חניון": "תחבצ וחניונים", "חניה": "תחבצ וחניונים", "רב קו": "תחבצ וחניונים", "רכבת": "תחבצ וחניונים", "אגד": "תחבצ וחניונים", "דן ": "תחבצ וחניונים",
  "gett": "תחבצ וחניונים", "מנהרות הכרמל": "תחבצ וחניונים", "מ.תחבורה": "תחבצ וחניונים", "רב-פס": "תחבצ וחניונים",
  // תחזוקת רכב
  "טסט": "תחזוקת רכב", "מוסך": "תחזוקת רכב", "צמיגים": "תחזוקת רכב", "וי אס קאר": "תחזוקת רכב", "כיוון פרונט": "תחזוקת רכב", "ליברה": "תחזוקת רכב",
  // כושר
  "כושר": "כושר", "הולמס": "כושר", "gym": "כושר", "דקאתלון": "כושר",
  // הלוואות וקרנות
  "הלוואה": "הלוואות וקרנות", "אלטשולר שחם": "הלוואות וקרנות",
  // ריביות ועמלות
  "עמלת פעולה": "ריביות ועמלות", "דמי כרטיס": "ריביות ועמלות", "ריבית על מסגרת": "ריביות ועמלות", "ריבית בגין": "ריביות ועמלות", "זיכוי בגין הטבה": "ריביות ועמלות",
  // מעמ ומיסים
  "אגף המכס": "מעמ ומיסים", "מס הכנסה": "מעמ ומיסים",
  // ציוד
  "קול המוסיקה": "ציוד", "אייבורי": "ציוד", "רשת קאמרה": "ציוד", "קומפיוטר לייט": "ציוד", "ksp": "ציוד", "איקאה": "ציוד",
  // חשבונות
  "בזק": "חשבונות בית", "hot": "חשבונות עסק", "ש.א.מ": "חשבונות בית", "מרכז הגז": "חשבונות בית",
  // משתנות
  "bolt": "משתנות", "paybox": "משתנות", "giveback": "משתנות", "airalo": "משתנות", "הום סנטר": "משתנות", "הום סטופ": "משתנות", "אייס פולג": "משתנות",
  // תמלוגים
  'אקו"ם': "הכנסה",
};

function autoCategoryFromMap(description, learnedCats) {
  if (!description) return "";
  const desc = description.trim();
  if (learnedCats && learnedCats[desc]) return learnedCats[desc];
  const lower = desc.toLowerCase();
  for (const [key, cat] of Object.entries(AUTO_CAT_MAP)) {
    if (lower.includes(key.toLowerCase())) return cat;
  }
  return "";
}

function buildLearnedCats(meta, txns) {
  const map = {};
  meta.forEach(m => {
    if (m.category && m.unique_id) {
      const txn = txns.find(t => t.unique_id === m.unique_id);
      if (txn?.description) {
        const desc = txn.description.trim();
        if (!map[desc]) map[desc] = m.category;
      }
    }
  });
  return map;
}

/* ═══════════════════════════════════════════
   CASHFLOW VIEW — replaces old FinancesView
   ═══════════════════════════════════════════ */

function generateRecurringProjections(recurring) {
  const projections = [];
  const now = new Date();
  const defaultEnd = new Date("2026-12-31");
  for (const r of recurring) {
    if (!r.is_active) continue;
    const endDate = r.end_date ? new Date(r.end_date) : defaultEnd;
    const skips = (r.skip_months || "").split(",").map(s => s.trim()).filter(Boolean);
    let d = new Date(now.getFullYear(), now.getMonth(), r.day_of_month || 1);
    if (d < now) d.setMonth(d.getMonth() + 1);
    while (d <= endDate) {
      const monthKey = d.toISOString().slice(0, 7);
      if (!skips.includes(monthKey)) {
        projections.push({
          _type: "recurring",
          _recurringId: r.id,
          date: d.toISOString().slice(0, 10),
          description: r.description,
          amount: r.type === "expense" ? -Math.abs(r.amount) : Math.abs(r.amount),
          domain: r.domain || "",
          category: r.category || "",
          income_source: r.income_source || "",
          status: "עתידי",
        });
      }
      d = new Date(d);
      d.setMonth(d.getMonth() + 1);
    }
  }
  return projections;
}

function findPotentialMatches(bankTxns, projections) {
  const matches = [];
  for (const proj of projections) {
    const projMonth = proj.date.slice(0, 7);
    const projAmt = Math.abs(proj.amount);
    for (const bank of bankTxns) {
      const bankMonth = bank.activity_date?.slice(0, 7);
      if (bankMonth !== projMonth) continue;
      const bankAmt = Math.abs(bank.charged_amount);
      const diff = Math.abs(bankAmt - projAmt);
      if (diff / projAmt < 0.05 || diff < 5) {
        matches.push({ bank, proj });
        break;
      }
    }
  }
  return matches;
}

function LinkLeadModal({ leads, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const clients = leads.filter(l => l.status === "closed");
  const filtered = clients.filter(c => !search || c.name.includes(search));
  return (
    <Modal onClose={onClose}>
      <div style={S.mHead}><h2 style={S.mTitle}>קישור ללקוח</h2><button style={S.iconBtn} onClick={onClose}>{I.x}</button></div>
      <input style={{ ...S.inp, marginBottom: 8 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לקוח..." />
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflowY: "auto" }}>
        {filtered.map(c => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0F172A", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }} onClick={() => { onSelect(c.id); onClose(); }}>
            <span style={{ fontSize: 13 }}>{c.name}</span>
            {c.amount > 0 && <span style={{ fontSize: 11, color: "#10B981" }}>₪{c.amount.toLocaleString()}</span>}
          </div>
        ))}
        {filtered.length === 0 && <p style={S.empty}>אין לקוחות</p>}
      </div>
      <div style={S.mFoot}><button style={S.btn2} onClick={onClose}>ביטול</button></div>
    </Modal>
  );
}

function ManualTxnForm({ onSave, onClose }) {
  const [f, setF] = useState({ date: new Date().toISOString().split("T")[0], description: "", amount: "", type: "expense", domain: "", category: "", notes: "", includes_vat: "", vat_deductible: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const setCat = (cat) => { const d = CAT_DEFAULTS[cat]; setF(p => ({ ...p, category: cat, ...(d ? { domain: d.domain || p.domain, includes_vat: d.includes_vat || p.includes_vat, vat_deductible: d.vat_deductible || p.vat_deductible } : {}) })); };
  const setType = (t) => setF(p => ({ ...p, type: t, domain: t === "income" ? "biz" : p.domain }));
  const submit = () => { if (!f.description.trim() || !f.amount) return; onSave({ ...f, amount: Number(f.amount), status: "planned" }); onClose(); };
  return (
    <Modal onClose={onClose}>
      <div style={S.mHead}><h2 style={S.mTitle}>תנועה ידנית</h2><button style={S.iconBtn} onClick={onClose}>{I.x}</button></div>
      <div style={S.grid2}>
        <div><label style={S.lbl}>תאריך</label><input style={S.inp} type="date" value={f.date} onChange={e => set("date", e.target.value)} dir="ltr" /></div>
        <div><label style={S.lbl}>סוג</label><select style={S.inp} value={f.type} onChange={e => setType(e.target.value)}><option value="expense">הוצאה</option><option value="income">הכנסה</option></select></div>
        <div style={S.full}><label style={S.lbl}>תיאור *</label><input style={S.inp} value={f.description} onChange={e => set("description", e.target.value)} placeholder="תיאור התנועה" /></div>
        <div><label style={S.lbl}>סכום *</label><input style={S.inp} type="number" value={f.amount} onChange={e => set("amount", e.target.value)} dir="ltr" /></div>
        <div><label style={S.lbl}>תחום</label><select style={S.inp} value={f.domain} onChange={e => set("domain", e.target.value)}><option value="">—</option>{DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
        <div style={S.full}><label style={S.lbl}>קטגוריה</label><select style={S.inp} value={f.category} onChange={e => setCat(e.target.value)}><option value="">—</option>{(f.type === "income" ? INCOME_CATS : [...EXPENSE_CATS_HOME, ...EXPENSE_CATS_BIZ]).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label style={S.lbl}>כולל מע״מ</label><select style={S.inp} value={f.includes_vat} onChange={e => set("includes_vat", e.target.value)}><option value="">—</option><option value="כן">כן</option><option value="לא">לא</option></select></div>
        {f.includes_vat === "כן" && f.type === "expense" && <div><label style={S.lbl}>מוכר למע״מ</label><select style={S.inp} value={f.vat_deductible} onChange={e => set("vat_deductible", e.target.value)}><option value="">—</option><option value="כן">כן</option><option value="לא">לא</option><option value="רכב">רכב</option></select></div>}
        <div style={S.full}><label style={S.lbl}>הערות</label><input style={S.inp} value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="הערות" /></div>
      </div>
      <div style={S.mFoot}><button style={S.btn2} onClick={onClose}>ביטול</button><button style={S.btn1} onClick={submit} disabled={!f.description.trim() || !f.amount}>שמור</button></div>
    </Modal>
  );
}

function RecurringForm({ onSave, onClose, initial }) {
  const isEdit = !!initial;
  const [f, setF] = useState(initial ? { description: initial.description || "", amount: String(initial.amount || ""), type: initial.type || "expense", domain: initial.domain || "", category: initial.category || "", day_of_month: initial.day_of_month || 1, end_date: initial.end_date || "", income_source: initial.income_source || "", includes_vat: initial.includes_vat || "", vat_deductible: initial.vat_deductible || "" } : { description: "", amount: "", type: "expense", domain: "", category: "", day_of_month: 1, end_date: "", income_source: "", includes_vat: "", vat_deductible: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const setCat = (cat) => { const d = CAT_DEFAULTS[cat]; setF(p => ({ ...p, category: cat, ...(d ? { domain: d.domain || p.domain, includes_vat: d.includes_vat || p.includes_vat, vat_deductible: d.vat_deductible || p.vat_deductible } : {}) })); };
  const setType = (t) => setF(p => ({ ...p, type: t, domain: t === "income" ? "biz" : p.domain }));
  const submit = () => { if (!f.description.trim() || !f.amount) return; onSave({ ...f, amount: Number(f.amount), is_active: true, end_date: f.end_date || null }); onClose(); };
  return (
    <Modal onClose={onClose}>
      <div style={S.mHead}><h2 style={S.mTitle}>{isEdit ? "עריכת תנועה קבועה" : "תנועה קבועה חדשה"}</h2><button style={S.iconBtn} onClick={onClose}>{I.x}</button></div>
      <div style={S.grid2}>
        <div style={S.full}><label style={S.lbl}>תיאור *</label><input style={S.inp} value={f.description} onChange={e => set("description", e.target.value)} placeholder="למשל: שכ״ד, ביטוח, הלוואה" /></div>
        <div><label style={S.lbl}>סוג</label><select style={S.inp} value={f.type} onChange={e => setType(e.target.value)}><option value="expense">הוצאה</option><option value="income">הכנסה</option></select></div>
        <div><label style={S.lbl}>סכום *</label><input style={S.inp} type="number" value={f.amount} onChange={e => set("amount", e.target.value)} dir="ltr" /></div>
        <div><label style={S.lbl}>יום בחודש</label><input style={S.inp} type="number" value={f.day_of_month} onChange={e => set("day_of_month", Number(e.target.value))} min={1} max={28} dir="ltr" /></div>
        <div><label style={S.lbl}>תחום</label><select style={S.inp} value={f.domain} onChange={e => set("domain", e.target.value)}><option value="">—</option>{DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
        <div style={S.full}><label style={S.lbl}>קטגוריה</label><select style={S.inp} value={f.category} onChange={e => setCat(e.target.value)}><option value="">—</option>{(f.type === "income" ? INCOME_CATS : [...EXPENSE_CATS_HOME, ...EXPENSE_CATS_BIZ]).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label style={S.lbl}>כולל מע״מ</label><select style={S.inp} value={f.includes_vat} onChange={e => set("includes_vat", e.target.value)}><option value="">—</option><option value="כן">כן</option><option value="לא">לא</option></select></div>
        {f.includes_vat === "כן" && f.type === "expense" && <div><label style={S.lbl}>מוכר למע״מ</label><select style={S.inp} value={f.vat_deductible} onChange={e => set("vat_deductible", e.target.value)}><option value="">—</option><option value="כן">כן</option><option value="לא">לא</option><option value="רכב">רכב</option></select></div>}
        {f.type === "income" && <div style={S.full}><label style={S.lbl}>מקור הכנסה</label><select style={S.inp} value={f.income_source} onChange={e => set("income_source", e.target.value)}><option value="">—</option>{INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>}
        <div style={S.full}><label style={S.lbl}>תאריך סיום (אופציונלי)</label><input style={S.inp} type="date" value={f.end_date} onChange={e => set("end_date", e.target.value)} dir="ltr" /></div>
      </div>
      <div style={S.mFoot}><button style={S.btn2} onClick={onClose}>ביטול</button><button style={S.btn1} onClick={submit} disabled={!f.description.trim() || !f.amount}>שמור</button></div>
    </Modal>
  );
}

function RecurringManager({ recurring, onAdd, onUpdate, onDelete, onAction }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("princess_recurring_collapsed") || "false"); } catch { return false; }
  });
  const toggleCollapse = () => { const next = !collapsed; setCollapsed(next); localStorage.setItem("princess_recurring_collapsed", JSON.stringify(next)); };
  const active = recurring.filter(r => r.is_active);
  const inactive = recurring.filter(r => !r.is_active);
  return (
    <div style={{ ...S.statCard, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={toggleCollapse}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          <span style={{ fontSize: 11, color: "#64748B", marginLeft: 4, transition: "transform 0.2s", display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
          🔄 תנועות קבועות ({active.length})
        </span>
        <button style={{ ...S.btn1, padding: "4px 10px", fontSize: 11 }} onClick={e => { e.stopPropagation(); setShowForm(true); }}>{I.plus} חדשה</button>
      </div>
      {!collapsed && <>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
          {active.map(r => (
            <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", background: "#0F172A", borderRadius: 6, padding: "6px 10px", fontSize: 12 }} title={r.end_date ? `סיום: ${fmtDateFull(r.end_date)}` : ""}>
              <span style={{ flex: 1 }}>{r.description}</span>
              <span style={{ color: r.type === "income" ? "#10B981" : "#EF4444", fontWeight: 600, direction: "ltr" }}>₪{Math.abs(r.amount).toLocaleString()}</span>
              <span style={{ color: "#475569", fontSize: 11 }}>יום {r.day_of_month}</span>
              {r.domain && <span style={{ fontSize: 10, color: "#64748B" }}>{DOMAINS.find(d => d.id === r.domain)?.label}</span>}
              {r.income_source && <span style={{ fontSize: 10, color: "#3B82F6" }}>{r.income_source}</span>}
              <button onClick={() => setEditItem(r)} style={{ ...S.iconBtn, color: "#64748B" }}>{I.edit}</button>
              <button onClick={() => onUpdate(r.id, { is_active: false })} style={{ ...S.iconBtn, color: "#F59E0B", fontSize: 11 }}>⏸</button>
              <button onClick={() => onAction({ recurringId: r.id, description: r.description })} style={{ ...S.iconBtn, color: "#64748B" }}>{I.trash}</button>
            </div>
          ))}
          {active.length === 0 && <div style={{ fontSize: 12, color: "#334155", textAlign: "center", padding: 8 }}>אין תנועות קבועות</div>}
        </div>
        {inactive.length > 0 && <details style={{ marginTop: 6 }}><summary style={{ fontSize: 11, color: "#475569", cursor: "pointer" }}>מושהות ({inactive.length})</summary><div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>{inactive.map(r => (
          <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", background: "#0F172A", borderRadius: 6, padding: "4px 10px", fontSize: 11, opacity: 0.6 }}>
            <span style={{ flex: 1 }}>{r.description}</span>
            <span style={{ direction: "ltr" }}>₪{Math.abs(r.amount).toLocaleString()}</span>
            <button onClick={() => setEditItem(r)} style={{ ...S.iconBtn, color: "#64748B" }}>{I.edit}</button>
            <button onClick={() => onUpdate(r.id, { is_active: true })} style={{ ...S.iconBtn, color: "#10B981", fontSize: 11 }}>▶</button>
            <button onClick={() => onAction({ recurringId: r.id, description: r.description })} style={{ ...S.iconBtn, color: "#64748B" }}>{I.trash}</button>
          </div>
        ))}</div></details>}
      </>}
      {showForm && <RecurringForm onSave={onAdd} onClose={() => setShowForm(false)} />}
      {editItem && <RecurringForm initial={editItem} onSave={(data) => { onUpdate(editItem.id, data); setEditItem(null); }} onClose={() => setEditItem(null)} />}
    </div>
  );
}

function CashflowView({ leads }) {
  const [txns, setTxns] = useState([]);
  const [meta, setMeta] = useState([]);
  const [manualTxns, setManualTxns] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState("");
  const [typeF, setTypeF] = useState("");
  const [domainF, setDomainF] = useState("");
  const [catF, setCatF] = useState("");
  const [payF, setPayF] = useState("");
  const [incSrcF, setIncSrcF] = useState("");
  const [editId, setEditId] = useState(null);
  const [ef, setEf] = useState({});
  const [showManualForm, setShowManualForm] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(null);
  const [matchConfirm, setMatchConfirm] = useState(null);
  const [makeRecurring, setMakeRecurring] = useState(null);
  const [editRecurringItem, setEditRecurringItem] = useState(null);
  const [recurringAction, setRecurringAction] = useState(null);
  const [hiddenMonths, setHiddenMonths] = useState(() => {
    try { return JSON.parse(localStorage.getItem("princess_hidden_months") || "[]"); } catch { return []; }
  });
  const toggleMonth = (m) => {
    setHiddenMonths(prev => {
      const next = prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m];
      localStorage.setItem("princess_hidden_months", JSON.stringify(next));
      return next;
    });
  };
  const [currentBalance, setCurrentBalance] = useState(() => {
    const saved = localStorage.getItem("princess_current_balance");
    return saved ? Number(saved) : null;
  });
  const [balanceInput, setBalanceInput] = useState("");
  const [showBalanceEdit, setShowBalanceEdit] = useState(false);

  useEffect(() => {
    Promise.all([
      sbMoneyman("?order=activity_date.desc&limit=2000"),
      sb("transaction_meta", "GET", null, "?order=created_at.desc&limit=2000"),
      sb("manual_transactions", "GET", null, "?order=date.desc&limit=1000").catch(() => []),
      sb("recurring_transactions", "GET", null, "?order=created_at.desc&limit=200").catch(() => []),
    ]).then(([t, m, mt, rec]) => {
      setTxns(t || []);
      setMeta(m || []);
      setManualTxns(mt || []);
      setRecurring(rec || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getMeta = (uid) => meta.find(m => m.unique_id === uid) || {};
  const saveMeta = async (uid, data) => {
    const existing = meta.find(m => m.unique_id === uid);
    if (existing) { const [r] = await sb("transaction_meta", "PATCH", data, `?id=eq.${existing.id}`); setMeta(p => p.map(m => m.id === existing.id ? r : m)); }
    else { const [r] = await sb("transaction_meta", "POST", { unique_id: uid, ...data }); setMeta(p => [r, ...p]); }
    setEditId(null);
  };

  const addManual = async (data) => {
    try { const [r] = await sb("manual_transactions", "POST", data); setManualTxns(p => [r, ...p]); _showToast("✓ תנועה נוספה"); } catch (e) { _showToast("שגיאה: " + e.message, "error"); }
  };
  const deleteManual = async (id) => {
    try { await sb("manual_transactions", "DELETE", null, `?id=eq.${id}`); setManualTxns(p => p.filter(m => m.id !== id)); _showToast("✓ נמחק"); } catch (e) { _showToast("שגיאה", "error"); }
  };
  const addRecurring = async (data) => {
    try { const [r] = await sb("recurring_transactions", "POST", data); setRecurring(p => [r, ...p]); _showToast("✓ תנועה קבועה נוספה"); } catch (e) { _showToast("שגיאה: " + e.message, "error"); }
  };
  const updateRecurring = async (id, data) => {
    try { const [r] = await sb("recurring_transactions", "PATCH", data, `?id=eq.${id}`); setRecurring(p => p.map(x => x.id === id ? r : x)); } catch (e) { _showToast("שגיאה", "error"); }
  };
  const deleteRecurring = async (id) => {
    try { await sb("recurring_transactions", "DELETE", null, `?id=eq.${id}`); setRecurring(p => p.filter(x => x.id !== id)); _showToast("✓ נמחק"); } catch (e) { _showToast("שגיאה", "error"); }
  };

  const linkToLead = async (uid, leadId) => {
    await saveMeta(uid, { ...ef, linked_lead_id: leadId });
    _showToast("✓ קושר ללקוח");
  };

  const learnedCats = useMemo(() => buildLearnedCats(meta, txns), [meta, txns]);
  const autoCategory = (description) => autoCategoryFromMap(description, learnedCats);

  // Build unified timeline
  const projections = useMemo(() => generateRecurringProjections(recurring), [recurring]);
  const matchedManualIds = new Set(manualTxns.filter(m => m.status === "matched").map(m => m.id));

  // Detect credit card debit lines from bank (ישראכרט lump sum)
  const isCardDebitFn = (t) => {
    const desc = (t.description || "").toLowerCase();
    return (t.company_id === "otsarHahayal" || !t.company_id) &&
      (desc.includes("ישראכרט") || desc.includes("isracard") || desc.includes("כרטיס אשראי"));
  };

  const autoPayMethod = (desc, companyId) => {
    if (companyId === "isracard") return "אשראי";
    const d = (desc || "").toLowerCase();
    if (d.includes("ביט") || d.includes("bit") || d.includes("מביט")) return "ביט";
    if (d.includes("paybox") || d.includes("פייבוקס") || d.includes("מפייבוקס")) return "פייבוקס";
    if (d.includes("הוראת קבע") || d.includes("הוראות ק")) return "הוראת קבע";
    if (d.includes("כספונט") || d.includes("מזומן") || d.includes("הפקדת מזומן")) return "מזומן";
    if (d.includes("העברה") || d.includes("העברת") || d.includes("זיכוי")) return "העברה";
    // All remaining otsarHahayal transactions that aren't loans/fees
    if (companyId === "otsarHahayal") return "העברה";
    return "";
  };

  const unified = useMemo(() => {
    const rows = [];
    // Bank & credit card transactions
    txns.forEach(t => {
      const m = getMeta(t.unique_id);
      const cardDebit = isCardDebitFn(t);
      const isCard = t.company_id === "isracard";
      const savedCat = m.category || "";
      const autoCat = !savedCat ? autoCategory(t.description) : "";
      const effectiveCat = savedCat || autoCat;
      const catDef = CAT_DEFAULTS[effectiveCat];
      const autoDomain = !m.domain && catDef ? catDef.domain : "";
      rows.push({
        _key: "bank_" + t.unique_id, _type: "bank", _uid: t.unique_id,
        _isCardDebit: cardDebit, _isCard: isCard,
        _isNonCashflow: isCard, // Individual card transactions are NOT cashflow
        date: t.activity_date, description: m.display_name || t.description, _origDesc: t.description, memo: t.memo,
        amount: t.charged_amount,
        domain: m.domain || autoDomain, category: effectiveCat,
        _autoCat: !savedCat && autoCat ? true : false,
        includes_vat: m.includes_vat || (catDef ? catDef.includes_vat : ""),
        vat_deductible: m.vat_deductible || (catDef ? catDef.vat_deductible : ""),
        payment_method: m.payment_method || autoPayMethod(t.description, t.company_id),
        status: m.status || "שולם/התקבל",
        linked_lead_id: m.linked_lead_id || null, income_source: m.income_source || ""
      });
    });
    // Manual transactions (not matched)
    manualTxns.filter(m => m.status !== "matched").forEach(m => {
      rows.push({ _key: "manual_" + m.id, _type: "manual", _manualId: m.id, date: m.date, description: m.description, amount: m.type === "expense" ? -Math.abs(m.amount) : Math.abs(m.amount), domain: m.domain || "", category: m.category || "", status: m.status === "planned" ? "עתידי" : m.status === "confirmed" ? "שולם/התקבל" : m.status, linked_lead_id: m.linked_lead_id || null, notes: m.notes });
    });
    // Recurring projections (only future months not covered by bank/manual)
    // Build a map of month → amounts already present (bank + manual)
    const existingByMonth = {};
    rows.forEach(r => {
      const m = r.date?.slice(0, 7);
      if (!m) return;
      if (!existingByMonth[m]) existingByMonth[m] = [];
      existingByMonth[m].push({ amount: r.amount, description: r.description, used: false });
    });
    projections.forEach(p => {
      const projMonth = p.date.slice(0, 7);
      const existing = existingByMonth[projMonth] || [];
      // Check if there's a matching transaction (same direction, similar amount ±15%, or same description)
      const matched = existing.find(e => !e.used && (
        e.description === p.description ||
        (Math.sign(e.amount) === Math.sign(p.amount) && Math.abs(Math.abs(e.amount) - Math.abs(p.amount)) / Math.max(Math.abs(p.amount), 1) < 0.15)
      ));
      if (matched) { matched.used = true; return; }
      rows.push({ _key: "rec_" + p._recurringId + "_" + p.date, _type: "recurring", _recurringId: p._recurringId, date: p.date, description: p.description, amount: p.amount, domain: p.domain, category: p.category, income_source: p.income_source || "", status: "עתידי" });
    });

    // Future credit card summary lines — estimate upcoming bank debit
    const now = new Date();
    const cardByMonth = {};
    txns.filter(t => t.company_id === "isracard").forEach(t => {
      const raw = typeof t.raw === "string" ? JSON.parse(t.raw || "{}") : (t.raw || {});
      const chargeMonth = (raw.processedDate || t.activity_date || "").slice(0, 7);
      if (!chargeMonth) return;
      if (!cardByMonth[chargeMonth]) cardByMonth[chargeMonth] = 0;
      cardByMonth[chargeMonth] += Math.abs(t.charged_amount);
    });
    // Only show for future months where bank hasn't debited yet
    const bankCardDebits = new Set(txns.filter(t => isCardDebitFn(t)).map(t => t.activity_date?.slice(0, 7)));
    Object.entries(cardByMonth).forEach(([mon, total]) => {
      if (!bankCardDebits.has(mon)) {
        rows.push({
          _key: "card_summary_" + mon, _type: "card_summary",
          _isCardSummary: true,
          date: mon + "-01",
          description: `💳 חיוב אשראי צפוי — ${new Date(mon + "-01").toLocaleDateString("he-IL", { month: "long", year: "numeric" })}`,
          amount: -total, // This DOES affect cashflow — it's the expected bank debit
          _cardTotal: total,
          domain: "", category: "הורדת אשראי", status: "עתידי"
        });
      }
    });

    // Sort ascending for running total calc
    rows.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    // Calc running total — individual card txns excluded, card debit + card summary included
    const bankOnlySum = rows.filter(r => !r._isNonCashflow && (r._type === "bank" || r._type === "manual" || r._type === "card_summary")).reduce((s, r) => s + r.amount, 0);
    const openingBalance = currentBalance !== null ? currentBalance - bankOnlySum : 0;
    let running = openingBalance;
    rows.forEach(r => {
      if (r._isNonCashflow) {
        r._running = null; // Individual card transactions — no running total
      } else {
        running += r.amount;
        r._running = running;
      }
    });
    return rows;
  }, [txns, meta, manualTxns, projections, currentBalance, learnedCats]);

  const months = [...new Set(unified.map(t => t.date?.slice(0, 7)).filter(Boolean))].sort().reverse();

  const filtered = unified.filter(t => {
    if (month) {
      if (month.includes(",")) { const ms = month.split(","); if (!ms.some(m => t.date?.startsWith(m))) return false; }
      else if (month.length === 4) { if (!t.date?.startsWith(month)) return false; }
      else { if (!t.date?.startsWith(month)) return false; }
    }
    if (typeF === "income" && t.amount <= 0) return false;
    if (typeF === "expense" && t.amount > 0) return false;
    if (domainF && t.domain !== domainF) return false;
    if (catF === "__none__" && t.category) return false;
    if (catF && catF !== "__none__" && t.category !== catF) return false;
    if (payF && t.payment_method !== payF) return false;
    if (incSrcF === "__none__" && t.income_source) return false;
    if (incSrcF === "__none__" && t.amount <= 0) return false;
    if (incSrcF && incSrcF !== "__none__" && t.income_source !== incSrcF) return false;
    return true;
  });

  const totalIncome = filtered.filter(t => t.amount > 0 && !t._isNonCashflow).reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.amount < 0 && !t._isNonCashflow).reduce((s, t) => s + Math.abs(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // Potential matches for confirmation
  const potentialMatches = useMemo(() => findPotentialMatches(txns, projections), [txns, projections]);

  if (loading) return <div style={S.empty}>טוען תנועות...</div>;
  return (
    <div style={{ padding: "8px 0 20px" }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 12 }}>
        <div style={S.statCard}><div style={{ fontSize: 22, fontWeight: 800, color: "#10B981" }}>₪{totalIncome.toLocaleString()}</div><div style={S.statLbl}>הכנסות</div></div>
        <div style={S.statCard}><div style={{ fontSize: 22, fontWeight: 800, color: "#EF4444" }}>₪{totalExpense.toLocaleString()}</div><div style={S.statLbl}>הוצאות</div></div>
        <div style={S.statCard}><div style={{ fontSize: 22, fontWeight: 800, color: balance >= 0 ? "#10B981" : "#EF4444" }}>₪{balance.toLocaleString()}</div><div style={S.statLbl}>מאזן</div></div>
        <div style={S.statCard} onClick={() => setShowBalanceEdit(true)} title="לחץ לעדכן">
          {currentBalance !== null ? (
            <><div style={{ fontSize: 22, fontWeight: 800, color: "#3B82F6" }}>₪{currentBalance.toLocaleString()}</div><div style={S.statLbl}>יתרה בבנק ✎</div></>
          ) : (
            <><div style={{ fontSize: 16, fontWeight: 600, color: "#F59E0B" }}>הגדר יתרה</div><div style={S.statLbl}>לחץ להזין יתרת בנק</div></>
          )}
        </div>
      </div>

      {/* Balance editor */}
      {showBalanceEdit && (
        <div style={{ ...S.statCard, marginBottom: 12, borderRight: "3px solid #3B82F6" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>יתרה נוכחית בבנק:</span>
            <input style={{ ...S.inp, width: 120, padding: "4px 8px", fontSize: 13 }} type="number" value={balanceInput} onChange={e => setBalanceInput(e.target.value)} placeholder="למשל: 18916" dir="ltr" autoFocus onKeyDown={e => { if (e.key === "Enter" && balanceInput) { const val = Number(balanceInput); setCurrentBalance(val); localStorage.setItem("princess_current_balance", String(val)); setShowBalanceEdit(false); setBalanceInput(""); _showToast("✓ יתרה עודכנה"); }}} />
            <button style={{ ...S.btn1, padding: "4px 12px", fontSize: 12 }} onClick={() => { if (!balanceInput) return; const val = Number(balanceInput); setCurrentBalance(val); localStorage.setItem("princess_current_balance", String(val)); setShowBalanceEdit(false); setBalanceInput(""); _showToast("✓ יתרה עודכנה"); }}>שמור</button>
            <button style={{ ...S.btn2, padding: "4px 12px", fontSize: 12 }} onClick={() => setShowBalanceEdit(false)}>ביטול</button>
          </div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>הזן את היתרה הנוכחית בחשבון הבנק. המערכת תחשב יתרת פתיחה ותזרים מצטבר בהתאם.</div>
        </div>
      )}

      {/* Match alerts */}
      {potentialMatches.length > 0 && !month && (
        <div style={{ ...S.statCard, marginBottom: 12, borderRight: "3px solid #F59E0B" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", marginBottom: 4 }}>⚡ תנועות להתאמה ({potentialMatches.length})</div>
          {potentialMatches.slice(0, 3).map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, padding: "4px 0", borderTop: i > 0 ? "1px solid #1E293B" : "none" }}>
              <span style={{ flex: 1 }}>{m.proj.description}</span>
              <span style={{ color: "#94A3B8" }}>→</span>
              <span style={{ flex: 1 }}>{m.bank.description}</span>
              <span style={{ color: "#10B981", direction: "ltr" }}>₪{Math.abs(m.bank.charged_amount).toLocaleString()}</span>
              <button onClick={() => setMatchConfirm(m)} style={{ ...S.btn1, padding: "2px 8px", fontSize: 10 }}>התאמה?</button>
            </div>
          ))}
        </div>
      )}

      {/* Recurring manager */}
      <RecurringManager recurring={recurring} onAdd={addRecurring} onUpdate={updateRecurring} onDelete={deleteRecurring} onAction={(a) => setRecurringAction(a)} />

      {/* Filters */}
      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
        {(() => {
          const now = new Date();
          const curMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
          const nextMonth = new Date(now.getFullYear(), now.getMonth()+1, 1);
          const twoMonths = `${curMonth},${nextMonth.getFullYear()}-${String(nextMonth.getMonth()+1).padStart(2,"0")}`;
          const curYear = String(now.getFullYear());
          return <>
            <button style={!month ? S.filterOn : S.filterOff} onClick={() => setMonth("")}>הכל</button>
            <button style={month === curMonth ? { ...S.filterOn, background: "#3B82F6" } : S.filterOff} onClick={() => setMonth(month === curMonth ? "" : curMonth)}>החודש</button>
            <button style={month === twoMonths ? { ...S.filterOn, background: "#3B82F6" } : S.filterOff} onClick={() => setMonth(month === twoMonths ? "" : twoMonths)}>חודשיים</button>
            <button style={month === curYear ? { ...S.filterOn, background: "#3B82F6" } : S.filterOff} onClick={() => setMonth(month === curYear ? "" : curYear)}>שנה נוכחית</button>
          </>;
        })()}
        <select style={{ ...S.inp, width: "auto", padding: "4px 8px", fontSize: 12, borderRadius: 14 }} value={months.includes(month) ? month : ""} onChange={e => setMonth(e.target.value)}><option value="">חודש...</option>{months.map(m => <option key={m} value={m}>{new Date(m + "-01").toLocaleDateString("he-IL", { month: "long", year: "numeric" })}</option>)}</select>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button style={!typeF ? S.filterOn : S.filterOff} onClick={() => setTypeF("")}>הכל</button>
        <button style={typeF === "income" ? { ...S.filterOn, background: "#10B981" } : S.filterOff} onClick={() => setTypeF(typeF === "income" ? "" : "income")}>הכנסות</button>
        <button style={typeF === "expense" ? { ...S.filterOn, background: "#EF4444" } : S.filterOff} onClick={() => setTypeF(typeF === "expense" ? "" : "expense")}>הוצאות</button>
        <select style={{ ...S.inp, width: "auto", padding: "4px 8px", fontSize: 12, borderRadius: 14, background: domainF ? "#F59E0B" : "#1E293B", color: domainF ? "#fff" : "#64748B", border: "none" }} value={domainF} onChange={e => setDomainF(e.target.value)}><option value="">תחום</option>{DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
        <select style={{ ...S.inp, width: "auto", padding: "4px 8px", fontSize: 12, borderRadius: 14, background: catF ? "#8B5CF6" : "#1E293B", color: catF ? "#fff" : "#64748B", border: "none" }} value={catF} onChange={e => setCatF(e.target.value)}><option value="">קטגוריה</option><option value="__none__">⚠ ללא קטגוריה</option>{ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select style={{ ...S.inp, width: "auto", padding: "4px 8px", fontSize: 12, borderRadius: 14, background: payF ? "#06B6D4" : "#1E293B", color: payF ? "#fff" : "#64748B", border: "none" }} value={payF} onChange={e => setPayF(e.target.value)}><option value="">תשלום</option>{PAY_METHODS.map(p => <option key={p} value={p}>{p}</option>)}</select>
        <select style={{ ...S.inp, width: "auto", padding: "4px 8px", fontSize: 12, borderRadius: 14, background: incSrcF ? "#10B981" : "#1E293B", color: incSrcF ? "#fff" : "#64748B", border: "none" }} value={incSrcF} onChange={e => setIncSrcF(e.target.value)}><option value="">מקור הכנסה</option><option value="__none__">⚠ ללא מקור</option>{INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select>
        <div style={{ flex: 1 }} />
        <button style={{ ...S.btn1, padding: "5px 12px", fontSize: 12 }} onClick={() => setShowManualForm(true)}>{I.plus} תנועה ידנית</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={S.th}>תאריך</th>
            <th style={S.th}>תיאור</th>
            <th style={S.th}>סכום</th>
            <th style={S.th}>מצטבר</th>
            <th style={S.th}>תחום</th>
            <th style={S.th}>קטגוריה</th>
            <th style={S.th}>תשלום</th>
            <th style={S.th}>סטטוס</th>
            <th style={S.th}></th>
          </tr></thead>
          <tbody>
            {(() => {
              const seenMonths = new Set();
              return filtered.flatMap((t, i) => {
                const rowMonth = t.date?.slice(0, 7) || "";
                const isFirstOfMonth = rowMonth && !seenMonths.has(rowMonth);
                if (rowMonth) seenMonths.add(rowMonth);
                const isHidden = hiddenMonths.includes(rowMonth);
                const rows = [];

                // Month header row
                if (isFirstOfMonth && !month) {
                  const monthLabel = new Date(rowMonth + "-01").toLocaleDateString("he-IL", { month: "long", year: "numeric" });
                  const monthTxns = filtered.filter(x => x.date?.startsWith(rowMonth) && !x._isNonCashflow);
                  const mIncome = monthTxns.filter(x => x.amount > 0).reduce((s, x) => s + x.amount, 0);
                  const mExpense = monthTxns.filter(x => x.amount < 0).reduce((s, x) => s + Math.abs(x.amount), 0);
                  rows.push(
                    <tr key={"month_" + rowMonth} style={{ background: "#111827", cursor: "pointer" }} onClick={() => toggleMonth(rowMonth)}>
                      <td colSpan={9} style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700, borderBottom: "2px solid #1E293B" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "#64748B", transition: "transform 0.2s", transform: isHidden ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
                          <span>{monthLabel}</span>
                          <span style={{ flex: 1 }} />
                          <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>+₪{mIncome.toLocaleString()}</span>
                          <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 600 }}>-₪{mExpense.toLocaleString()}</span>
                          <span style={{ fontSize: 11, color: mIncome - mExpense >= 0 ? "#10B981" : "#EF4444", fontWeight: 600 }}>= ₪{(mIncome - mExpense).toLocaleString()}</span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // Skip rows of hidden months
                if (isHidden && !month) return rows;

                const isBank = t._type === "bank";
                const isManual = t._type === "manual";
                const isRecurring = t._type === "recurring";
                const isCardSummary = t._isCardSummary;
                const isCard = t._isCard;
                const isNonCashflow = t._isNonCashflow;
                const isEd = editId === t._key;
                const linkedLead = t.linked_lead_id ? leads.find(l => l.id === t.linked_lead_id) : null;
                const rowBg = isNonCashflow ? "#1E293B08" : isCardSummary ? "#F59E0B10" : isRecurring ? "#0B112080" : isManual ? "#1E293B10" : undefined;
                const typeIndicator = isCardSummary ? "💳" : isCard ? "💳" : isRecurring ? "🔄" : isManual ? "✏️" : "";

                // Card summary row
                if (isCardSummary) {
                  rows.push(
                    <tr key={t._key} style={{ background: rowBg }}>
                      <td style={S.td}>{t.date ? fmtDate(t.date) : ""}</td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{typeIndicator} {t.description}</td>
                      <td style={{ ...S.td, fontWeight: 600, color: "#EF4444", direction: "ltr", textAlign: "right" }}>₪{t._cardTotal.toLocaleString()}</td>
                      <td style={{ ...S.td, fontSize: 11, color: t._running !== null && t._running >= 0 ? "#10B981" : "#EF4444", direction: "ltr", textAlign: "right" }}>{t._running !== null ? `₪${t._running.toLocaleString()}` : "—"}</td>
                      <td style={S.td}></td>
                      <td style={S.td}><span style={{ fontSize: 12 }}>הורדת אשראי</span></td>
                      <td style={S.td}></td>
                      <td style={S.td}><span style={{ fontSize: 12, color: "#3B82F6" }}>עתידי</span></td>
                      <td style={S.td}></td>
                    </tr>
                  );
                  return rows;
                }

                // Edit mode
                if (isEd && isBank) {
                  rows.push(
                    <tr key={t._key}>
                      <td style={S.td}>{t.date ? fmtDate(t.date) : ""}</td>
                      <td style={S.td}><input style={{ ...S.inp, padding: "2px 6px", fontSize: 12 }} value={ef.display_name} onChange={e => setEf(p => ({ ...p, display_name: e.target.value }))} /></td>
                      <td style={{ ...S.td, fontWeight: 600, color: t.amount > 0 ? "#10B981" : "#EF4444", direction: "ltr", textAlign: "right" }}>₪{Math.abs(t.amount).toLocaleString()}</td>
                      <td style={{ ...S.td, fontSize: 11, color: "#475569" }}>—</td>
                      <td style={S.td}>
                        <select style={{ ...S.inp, padding: "2px 4px", fontSize: 11 }} value={ef.domain || ""} onChange={e => setEf(p => ({ ...p, domain: e.target.value }))}><option value="">—</option>{DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
                        {t.amount > 0 && <select style={{ ...S.inp, padding: "2px 4px", fontSize: 10, marginTop: 3 }} value={ef.income_source || ""} onChange={e => setEf(p => ({ ...p, income_source: e.target.value }))}><option value="">מקור הכנסה</option>{INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select>}
                      </td>
                      <td style={S.td}><select style={{ ...S.inp, padding: "2px 4px", fontSize: 11 }} value={ef.category || ""} onChange={e => { const cat = e.target.value; const d = CAT_DEFAULTS[cat]; setEf(p => ({ ...p, category: cat, ...(d ? { domain: d.domain || p.domain, includes_vat: d.includes_vat || p.includes_vat, vat_deductible: d.vat_deductible || p.vat_deductible } : {}) })); }}><option value="">—</option>{(t.amount > 0 ? INCOME_CATS : [...EXPENSE_CATS_HOME, ...EXPENSE_CATS_BIZ]).map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                      <td style={S.td}>
                        <select style={{ ...S.inp, padding: "2px 4px", fontSize: 11, marginBottom: 3 }} value={ef.payment_method || ""} onChange={e => setEf(p => ({ ...p, payment_method: e.target.value }))}><option value="">תשלום</option>{PAY_METHODS.map(p => <option key={p} value={p}>{p}</option>)}</select>
                        <select style={{ ...S.inp, padding: "2px 4px", fontSize: 10 }} value={ef.includes_vat || ""} onChange={e => setEf(p => ({ ...p, includes_vat: e.target.value }))}><option value="">כולל מע״מ?</option><option value="כן">כולל מע״מ</option><option value="לא">ללא מע״מ</option></select>
                      </td>
                      <td style={S.td}>
                        <select style={{ ...S.inp, padding: "2px 4px", fontSize: 11, marginBottom: 3 }} value={ef.status || "paid"} onChange={e => setEf(p => ({ ...p, status: e.target.value }))}>{TXN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        {ef.includes_vat === "כן" && t.amount < 0 && <select style={{ ...S.inp, padding: "2px 4px", fontSize: 10 }} value={ef.vat_deductible || ""} onChange={e => setEf(p => ({ ...p, vat_deductible: e.target.value }))}><option value="">מוכר למע״מ?</option><option value="כן">כן</option><option value="לא">לא</option><option value="רכב">רכב</option></select>}
                      </td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button onClick={() => saveMeta(t._uid, ef)} style={{ ...S.iconBtn, color: "#10B981" }}>{I.check}</button>
                          {t.amount > 0 && <button onClick={() => setShowLinkModal(t._key)} style={{ ...S.iconBtn, color: "#3B82F6" }} title="קשר ללקוח">{I.link}</button>}
                          <button onClick={() => setMakeRecurring({ description: t.description, amount: Math.abs(t.amount), type: t.amount > 0 ? "income" : "expense", day_of_month: t.date ? parseInt(t.date.split("-")[2]) : 1, domain: ef.domain || "", category: ef.category || "" })} style={{ ...S.iconBtn, color: "#8B5CF6" }} title="הפוך לקבועה">🔄</button>
                          <button onClick={() => setEditId(null)} style={{ ...S.iconBtn, color: "#64748B" }}>{I.x}</button>
                        </div>
                      </td>
                    </tr>
                  );
                  return rows;
                }

                // Normal row
                rows.push(
                  <tr key={t._key} style={{ cursor: isBank ? "pointer" : undefined, background: rowBg, opacity: isNonCashflow ? 0.9 : 1 }} onClick={isBank ? () => { setEditId(t._key); const m = getMeta(t._uid); setEf({ display_name: m.display_name || t.description, domain: m.domain || (t.amount > 0 ? "biz" : ""), category: m.category || "", payment_method: m.payment_method || "", status: m.status || "שולם/התקבל", income_source: m.income_source || "", includes_vat: m.includes_vat || "", vat_deductible: m.vat_deductible || "" }); } : undefined}>
                    <td style={S.td}>{t.date ? fmtDate(t.date) : ""}</td>
                    <td style={S.td}>
                      {typeIndicator && <span style={{ marginLeft: 4, fontSize: 10 }}>{typeIndicator}</span>}
                      {t.description}
                      {t.memo && <span style={{ color: "#475569", fontSize: 11, marginRight: 6 }}> ({t.memo})</span>}
                      {linkedLead && <span style={{ color: "#3B82F6", fontSize: 11, marginRight: 6 }}> ← {linkedLead.name}</span>}
                      {isNonCashflow && <span style={{ color: "#64748B", fontSize: 10, marginRight: 6 }}> (פירוט)</span>}
                    </td>
                    <td style={{ ...S.td, fontWeight: 600, color: isNonCashflow ? "#475569" : t.amount > 0 ? "#10B981" : "#EF4444", direction: "ltr", textAlign: "right" }}>₪{Math.abs(t.amount).toLocaleString()}</td>
                    <td style={{ ...S.td, fontSize: 11, color: t._running === null ? "#475569" : t._running >= 0 ? "#10B981" : "#EF4444", direction: "ltr", textAlign: "right" }}>{t._running !== null ? `₪${t._running.toLocaleString()}` : "—"}</td>
                    <td style={S.td}>{t.domain ? DOMAINS.find(d => d.id === t.domain)?.label : ""}{t.income_source && <span style={{ fontSize: 10, color: "#3B82F6", display: "block" }}>{t.income_source}</span>}</td>
                    <td style={S.td}><span style={{ fontSize: 12 }}>{t.category || ""}{t._autoCat && <span style={{ color: "#F59E0B", fontSize: 9, marginRight: 3 }} title="קטגוריה אוטומטית">⚡</span>}</span></td>
                    <td style={S.td}><span style={{ fontSize: 12 }}>{t.payment_method || ""}</span></td>
                    <td style={S.td}><span style={{ fontSize: 12, color: t.status === "בחוב" ? "#F59E0B" : t.status === "עתידי" ? "#3B82F6" : "#475569" }}>{t.status || ""}</span></td>
                    <td style={S.td}>
                      {isBank && !isNonCashflow && (t.category && !t._autoCat ? <span style={{ color: "#10B981", fontSize: 10 }}>✓</span> : <span style={{ color: "#64748B", fontSize: 10 }}>✎</span>)}
                      {isManual && <button onClick={(e) => { e.stopPropagation(); if (confirm("למחוק תנועה ידנית?")) deleteManual(t._manualId); }} style={{ ...S.iconBtn, color: "#64748B" }}>{I.trash}</button>}
                      {isRecurring && <div style={{ display: "flex", gap: 2 }}>
                        <button onClick={() => { const r = recurring.find(x => x.id === t._recurringId); if (r) setEditRecurringItem(r); }} style={{ ...S.iconBtn, color: "#64748B" }} title="ערוך תנועה קבועה">{I.edit}</button>
                        <button onClick={() => setRecurringAction({ recurringId: t._recurringId, month: t.date?.slice(0, 7), description: t.description })} style={{ ...S.iconBtn, color: "#F59E0B" }} title="דלג/השהה/מחק">⏸</button>
                      </div>}
                    </td>
                  </tr>
                );
                return rows;
              });
            })()}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p style={S.empty}>אין תנועות</p>}

      {showManualForm && <ManualTxnForm onSave={addManual} onClose={() => setShowManualForm(false)} />}
      {showLinkModal && <LinkLeadModal leads={leads} onSelect={(leadId) => { const t = filtered.find(x => x._key === showLinkModal); if (t) linkToLead(t._uid, leadId); setShowLinkModal(null); }} onClose={() => setShowLinkModal(null)} />}
      {matchConfirm && (
        <Modal onClose={() => setMatchConfirm(null)}>
          <div style={S.mHead}><h2 style={S.mTitle}>אישור התאמה</h2><button style={S.iconBtn} onClick={() => setMatchConfirm(null)}>{I.x}</button></div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <p style={{ marginBottom: 8 }}>תנועה קבועה: <strong>{matchConfirm.proj.description}</strong></p>
            <p style={{ marginBottom: 8 }}>תנועת בנק: <strong>{matchConfirm.bank.description}</strong></p>
            <p>סכום: <span style={{ direction: "ltr", display: "inline-block" }}>₪{Math.abs(matchConfirm.bank.charged_amount).toLocaleString()}</span></p>
          </div>
          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>האם זו אותה תנועה?</p>
          <div style={S.mFoot}>
            <button style={S.btn2} onClick={() => setMatchConfirm(null)}>לא</button>
            <button style={S.btn1} onClick={() => { _showToast("✓ הותאם"); setMatchConfirm(null); }}>כן, זו התנועה</button>
          </div>
        </Modal>
      )}
      {makeRecurring && <RecurringForm initial={makeRecurring} onSave={addRecurring} onClose={() => setMakeRecurring(null)} />}
      {editRecurringItem && <RecurringForm initial={editRecurringItem} onSave={(data) => { updateRecurring(editRecurringItem.id, data); setEditRecurringItem(null); }} onClose={() => setEditRecurringItem(null)} />}
      {recurringAction && (
        <Modal onClose={() => setRecurringAction(null)}>
          <div style={S.mHead}><h2 style={S.mTitle}>מחיקת תנועה קבועה</h2><button style={S.iconBtn} onClick={() => setRecurringAction(null)}>{I.x}</button></div>
          <p style={{ fontSize: 13, marginBottom: 12 }}>{recurringAction.description}</p>
          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>מה תרצה לעשות?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recurringAction.month && <button style={{ ...S.btn1, textAlign: "right", padding: "10px 14px" }} onClick={() => {
              const r = recurring.find(x => x.id === recurringAction.recurringId);
              if (r) {
                const existing = (r.skip_months || "").split(",").map(s => s.trim()).filter(Boolean);
                existing.push(recurringAction.month);
                updateRecurring(r.id, { skip_months: existing.join(",") });
              }
              _showToast("✓ חודש זה הוסר");
              setRecurringAction(null);
            }}>🗓 רק החודש הזה ({new Date(recurringAction.month + "-01").toLocaleDateString("he-IL", { month: "long", year: "numeric" })})</button>}
            <button style={{ ...S.btn2, textAlign: "right", padding: "10px 14px" }} onClick={() => {
              updateRecurring(recurringAction.recurringId, { is_active: false });
              _showToast("✓ תנועה קבועה הושהתה");
              setRecurringAction(null);
            }}>⏸ השהה את כל התנועות העתידיות</button>
            <button style={{ ...S.btn2, textAlign: "right", padding: "10px 14px", color: "#EF4444" }} onClick={() => {
              deleteRecurring(recurringAction.recurringId);
              _showToast("✓ נמחק לצמיתות");
              setRecurringAction(null);
            }}>🗑 מחק לצמיתות</button>
          </div>
          <div style={S.mFoot}><button style={S.btn2} onClick={() => setRecurringAction(null)}>ביטול</button></div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════
   DASHBOARD VIEW — charts
   ═══════════════════════════ */

function DashboardView() {
  const [txns, setTxns] = useState([]);
  const [meta, setMeta] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [dashMonth, setDashMonth] = useState("");

  useEffect(() => {
    Promise.all([
      sbMoneyman("?order=activity_date.desc&limit=2000"),
      sb("transaction_meta", "GET", null, "?order=created_at.desc&limit=2000"),
    ]).then(([t, m]) => { setTxns(t || []); setMeta(m || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const getMeta = (uid) => meta.find(m => m.unique_id === uid) || {};

  const learnedCats = useMemo(() => buildLearnedCats(meta, txns), [meta, txns]);

  const merged = useMemo(() => txns.map(t => {
    const m = getMeta(t.unique_id);
    const savedCat = m.category || "";
    const autoCat = !savedCat ? autoCategoryFromMap(t.description, learnedCats) : "";
    const effectiveCat = savedCat || autoCat;
    const catDef = CAT_DEFAULTS[effectiveCat];
    return {
      ...t, ...m,
      category: effectiveCat,
      domain: m.domain || (catDef ? catDef.domain : ""),
      includes_vat: m.includes_vat || (catDef ? catDef.includes_vat : ""),
      vat_deductible: m.vat_deductible || (catDef ? catDef.vat_deductible : ""),
      _uid: t.unique_id
    };
  }), [txns, meta, learnedCats]);

  const yearTxns = merged.filter(t => {
    if (!t.activity_date?.startsWith(String(year))) return false;
    if (dashMonth) {
      if (dashMonth.includes(",")) { const ms = dashMonth.split(","); if (!ms.some(m => t.activity_date?.startsWith(m))) return false; }
      else if (dashMonth.length === 7) { if (!t.activity_date?.startsWith(dashMonth)) return false; }
    }
    return true;
  });

  // Monthly breakdown (exclude credit card debit lines to avoid double counting)
  const monthlyData = useMemo(() => {
    const months = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, "0")}`;
      months[key] = { income: 0, expense: 0 };
    }
    yearTxns.forEach(t => {
      const key = t.activity_date?.slice(0, 7);
      if (!key || !months[key]) return;
      // Skip credit card debit lines and non-cashflow categories
      if (EXCLUDE_EXPENSE_CATS.has(t.category)) return;
      if (t.company_id === "otsarHahayal" && (t.description || "").includes("ישראכרט")) return;
      if (t.charged_amount > 0) months[key].income += t.charged_amount;
      else months[key].expense += Math.abs(t.charged_amount);
    });
    return Object.entries(months).map(([k, v]) => ({ month: k, ...v }));
  }, [yearTxns, year]);

  // Categories to exclude from expense charts (non-real-expenses)
  const EXCLUDE_EXPENSE_CATS = new Set(["הורדת אשראי", "לא תזרימי"]);
  const EXPENSE_ONLY_CATS = new Set([...EXPENSE_CATS_HOME, ...EXPENSE_CATS_BIZ]);
  const INCOME_ONLY_CATS = new Set(INCOME_CATS);
  const HOME_CATS = new Set(EXPENSE_CATS_HOME);
  const BIZ_CATS = new Set(EXPENSE_CATS_BIZ);

  // Filter out credit card debit lines from bank (to avoid double counting)
  const realExpenseTxns = yearTxns.filter(t =>
    t.charged_amount < 0 &&
    !INCOME_ONLY_CATS.has(t.category) &&
    !EXCLUDE_EXPENSE_CATS.has(t.category) &&
    !(t.company_id === "otsarHahayal" && (t.description || "").includes("ישראכרט"))
  );

  // Home expenses
  const expenseHome = useMemo(() => {
    const cats = {};
    realExpenseTxns.filter(t => t.domain === "home" || HOME_CATS.has(t.category)).forEach(t => {
      const c = t.category || "ללא קטגוריה";
      cats[c] = (cats[c] || 0) + Math.abs(t.charged_amount);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [realExpenseTxns]);

  // Business expenses
  const expenseBiz = useMemo(() => {
    const cats = {};
    realExpenseTxns.filter(t => t.domain === "biz" || BIZ_CATS.has(t.category)).forEach(t => {
      const c = t.category || "ללא קטגוריה";
      cats[c] = (cats[c] || 0) + Math.abs(t.charged_amount);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [realExpenseTxns]);

  // All expenses (for totals)
  const expenseByCat = useMemo(() => {
    const cats = {};
    realExpenseTxns.forEach(t => {
      const c = t.category || "ללא קטגוריה";
      cats[c] = (cats[c] || 0) + Math.abs(t.charged_amount);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [realExpenseTxns]);

  // Income — use income_source, fallback to meaningful label
  const incomeByCat = useMemo(() => {
    const cats = {};
    yearTxns.filter(t => t.charged_amount > 0).forEach(t => {
      let label = t.income_source;
      if (!label) {
        if (INCOME_ONLY_CATS.has(t.category)) label = "ללא מקור";
        else if (EXPENSE_ONLY_CATS.has(t.category)) label = "אחר";
        else label = t.category || "ללא קטגוריה";
      }
      cats[label] = (cats[label] || 0) + t.charged_amount;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [yearTxns]);

  const PIE_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#F97316", "#84CC16", "#6366F1"];

  const totalExpense = expenseByCat.reduce((s, [, v]) => s + v, 0);
  const totalExpenseHome = expenseHome.reduce((s, [, v]) => s + v, 0);
  const totalExpenseBiz = expenseBiz.reduce((s, [, v]) => s + v, 0);
  const totalIncome = incomeByCat.reduce((s, [, v]) => s + v, 0);

  // VAT calculation
  const vatData = useMemo(() => {
    let vatIncome = 0;
    let vatExpense = 0;
    yearTxns.forEach(t => {
      const catDef = CAT_DEFAULTS[t.category];
      const inclVat = t.includes_vat || (catDef ? catDef.includes_vat : "");
      const vatDed = t.vat_deductible || (catDef ? catDef.vat_deductible : "");
      if (inclVat !== "כן") return;
      const amt = Math.abs(t.charged_amount);
      const vat18 = amt * 18 / 118;
      if (t.charged_amount > 0) {
        vatIncome += vat18;
      } else {
        if (vatDed === "כן") vatExpense += vat18;
        else if (vatDed === "רכב") vatExpense += vat18 * 2 / 3;
      }
    });
    return { vatIncome: Math.round(vatIncome), vatExpense: Math.round(vatExpense), vatPayment: Math.round(vatIncome - vatExpense) };
  }, [yearTxns]);

  // Pie chart SVG
  function PieChart({ data, total, title }) {
    if (total === 0) return <div style={{ ...S.statCard, textAlign: "center" }}><div style={S.statLbl}>{title}</div><p style={S.empty}>אין נתונים</p></div>;
    let cumAngle = 0;
    const slices = data.map(([name, val], i) => {
      const pct = val / total;
      const startAngle = cumAngle;
      const endAngle = cumAngle + pct * 360;
      cumAngle = endAngle;
      const start = polarToCartesian(100, 100, 80, startAngle);
      const end = polarToCartesian(100, 100, 80, endAngle);
      const largeArc = pct > 0.5 ? 1 : 0;
      const d = `M 100 100 L ${start.x} ${start.y} A 80 80 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
      return { name, val, pct, d, color: PIE_COLORS[i % PIE_COLORS.length] };
    });
    return (
      <div style={S.statCard}>
        <div style={S.statLbl}>{title}</div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <svg viewBox="0 0 200 200" width="160" height="160" style={{ flexShrink: 0 }}>
            {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} stroke="#111827" strokeWidth="1" />)}
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 120 }}>
            {slices.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{s.name}</span>
                <span style={{ color: "#94A3B8", direction: "ltr" }}>₪{s.val.toLocaleString()}</span>
                <span style={{ color: "#475569", minWidth: 30, textAlign: "left" }}>{Math.round(s.pct * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Bar chart SVG
  function BarChart({ data }) {
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
    const barW = 30;
    const gap = 12;
    const chartW = data.length * (barW * 2 + gap) + 40;
    const chartH = 200;
    return (
      <div style={S.statCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={S.statLbl}>הכנסות מול הוצאות — חודשי</div>
          <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#10B981" }} />הכנסות</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#EF4444" }} />הוצאות</span>
          </div>
        </div>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <svg viewBox={`0 0 ${chartW} ${chartH + 30}`} width={chartW} height={chartH + 30}>
            {data.map((d, i) => {
              const x = 20 + i * (barW * 2 + gap);
              const hIncome = (d.income / maxVal) * chartH;
              const hExpense = (d.expense / maxVal) * chartH;
              const label = new Date(d.month + "-01").toLocaleDateString("he-IL", { month: "short" });
              return (
                <g key={d.month}>
                  <rect x={x} y={chartH - hIncome} width={barW} height={hIncome} fill="#10B981" rx="3" />
                  <rect x={x + barW + 2} y={chartH - hExpense} width={barW} height={hExpense} fill="#EF4444" rx="3" />
                  <text x={x + barW} y={chartH + 16} textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="Rubik">{label}</text>
                </g>
              );
            })}
            <line x1="20" y1={chartH} x2={chartW} y2={chartH} stroke="#1E293B" strokeWidth="1" />
          </svg>
        </div>
      </div>
    );
  }

  const years = [...new Set(txns.map(t => t.activity_date?.slice(0, 4)).filter(Boolean))].sort().reverse();

  if (loading) return <div style={S.empty}>טוען נתונים...</div>;
  return (
    <div style={{ padding: "8px 0 20px" }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select style={{ ...S.inp, width: "auto", padding: "4px 8px", fontSize: 12, borderRadius: 14 }} value={year} onChange={e => { setYear(Number(e.target.value)); setDashMonth(""); }}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        <span style={{ width: 1, height: 16, background: "#334155", margin: "0 2px" }} />
        {(() => {
          const now = new Date();
          const curMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
          const nextMonth = new Date(now.getFullYear(), now.getMonth()+1, 1);
          const twoMonths = `${curMonth},${nextMonth.getFullYear()}-${String(nextMonth.getMonth()+1).padStart(2,"0")}`;
          return <>
            <button style={!dashMonth ? S.filterOn : S.filterOff} onClick={() => setDashMonth("")}>כל השנה</button>
            <button style={dashMonth === curMonth ? { ...S.filterOn, background: "#3B82F6" } : S.filterOff} onClick={() => { setYear(now.getFullYear()); setDashMonth(dashMonth === curMonth ? "" : curMonth); }}>החודש</button>
            <button style={dashMonth === twoMonths ? { ...S.filterOn, background: "#3B82F6" } : S.filterOff} onClick={() => { setYear(now.getFullYear()); setDashMonth(dashMonth === twoMonths ? "" : twoMonths); }}>חודשיים</button>
          </>;
        })()}
        {Array.from({ length: 12 }, (_, i) => {
          const m = `${year}-${String(i + 1).padStart(2, "0")}`;
          const label = new Date(m + "-01").toLocaleDateString("he-IL", { month: "short" });
          return <button key={m} style={dashMonth === m ? { ...S.filterOn, background: "#3B82F6" } : S.filterOff} onClick={() => setDashMonth(dashMonth === m ? "" : m)}>{label}</button>;
        })}
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginBottom: 12 }}>
        <div style={S.statCard}><div style={{ fontSize: 28, fontWeight: 800, color: "#10B981" }}>₪{totalIncome.toLocaleString()}</div><div style={S.statLbl}>סה״כ הכנסות {dashMonth ? (dashMonth.includes(",") ? "חודשיים" : new Date(dashMonth + "-01").toLocaleDateString("he-IL", { month: "long" })) : year}</div></div>
        <div style={S.statCard}><div style={{ fontSize: 28, fontWeight: 800, color: "#EF4444" }}>₪{totalExpense.toLocaleString()}</div><div style={S.statLbl}>סה״כ הוצאות {dashMonth ? (dashMonth.includes(",") ? "חודשיים" : new Date(dashMonth + "-01").toLocaleDateString("he-IL", { month: "long" })) : year}</div></div>
        <div style={S.statCard}><div style={{ fontSize: 28, fontWeight: 800, color: totalIncome - totalExpense >= 0 ? "#10B981" : "#EF4444" }}>₪{(totalIncome - totalExpense).toLocaleString()}</div><div style={S.statLbl}>מאזן {dashMonth ? (dashMonth.includes(",") ? "חודשיים" : new Date(dashMonth + "-01").toLocaleDateString("he-IL", { month: "long" })) : year}</div></div>
      </div>

      {/* Bar chart */}
      <BarChart data={monthlyData} />

      {/* Pie charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <PieChart data={expenseHome} total={totalExpenseHome} title="הוצאות בית" />
        <PieChart data={expenseBiz} total={totalExpenseBiz} title="הוצאות עסק" />
      </div>
      <div style={{ marginTop: 12 }}>
        <PieChart data={incomeByCat} total={totalIncome} title="פילוג הכנסות לפי מקור" />
      </div>

      {/* VAT summary */}
      <div style={{ ...S.statCard, marginTop: 12 }}>
        <div style={S.statLbl}>מע״מ — {year}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginTop: 6 }}>
          <div style={{ background: "#0F172A", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#10B981" }}>₪{vatData.vatIncome.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>מע״מ הכנסות</div>
          </div>
          <div style={{ background: "#0F172A", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#3B82F6" }}>₪{vatData.vatExpense.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>מע״מ הוצאות (מוכר)</div>
          </div>
          <div style={{ background: "#0F172A", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: vatData.vatPayment >= 0 ? "#EF4444" : "#10B981" }}>₪{vatData.vatPayment.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>תשלום מע״מ משוער</div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>* חישוב מבוסס על תנועות שסומנו "כולל מע״מ". מע״מ = 18%. רכב = שני שליש.</div>
      </div>
    </div>
  );
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function Stats({leads}){const total=leads.length;const byStatus=STATUSES.map(s=>({...s,count:leads.filter(l=>l.status===s.id).length}));const closed=byStatus.find(s=>s.id==="closed")?.count||0;const lost=byStatus.find(s=>s.id==="lost")?.count||0;const decided=closed+lost;const rate=decided>0?Math.round((closed/decided)*100):0;const revenue=leads.filter(l=>l.status==="closed").reduce((s,l)=>s+(l.amount||0),0);const byService={};leads.forEach(l=>{if(l.service)byService[l.service]=(byService[l.service]||0)+1;});const topSvc=Object.entries(byService).sort((a,b)=>b[1]-a[1]).slice(0,6);const bySource={};leads.forEach(l=>{if(l.source)bySource[l.source]=(bySource[l.source]||0)+1;});const topSrc=Object.entries(bySource).sort((a,b)=>b[1]-a[1]).slice(0,6);const mx=a=>a[0]?.[1]||1;return(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,padding:"8px 0 20px"}}><div style={S.statCard}><div style={{fontSize:36,fontWeight:800}}>{total}</div><div style={S.statLbl}>סה״כ</div></div><div style={S.statCard}><div style={{fontSize:36,fontWeight:800,color:"#10B981"}}>{rate}%</div><div style={S.statLbl}>המרה</div></div><div style={S.statCard}><div style={{fontSize:28,fontWeight:800,color:"#3B82F6"}}>₪{revenue.toLocaleString()}</div><div style={S.statLbl}>הכנסות</div></div><div style={S.statCard}>{byStatus.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}><span style={{width:8,height:8,borderRadius:"50%",background:s.color}}/><span style={{flex:1}}>{s.label}</span><span style={{fontWeight:700}}>{s.count}</span></div>)}</div>{topSvc.length>0&&<div style={S.statCard}><div style={S.statLbl}>שירותים</div>{topSvc.map(([n,c])=><div key={n} style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}><span style={{minWidth:70}}>{n}</span><div style={{flex:1,height:5,background:"#1E293B",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(c/mx(topSvc))*100}%`,background:"#3B82F6",borderRadius:3}}/></div><span style={{fontWeight:600,minWidth:16,textAlign:"center"}}>{c}</span></div>)}</div>}{topSrc.length>0&&<div style={S.statCard}><div style={S.statLbl}>מקורות</div>{topSrc.map(([n,c])=><div key={n} style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}><span style={{minWidth:70}}>{n}</span><div style={{flex:1,height:5,background:"#1E293B",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(c/mx(topSrc))*100}%`,background:"#8B5CF6",borderRadius:3}}/></div><span style={{fontWeight:600,minWidth:16,textAlign:"center"}}>{c}</span></div>)}</div>}</div>);}

/* ═══════════════════════
   MAIN APP
   ═══════════════════════ */

export default function App(){
  const [leads,setLeads]=useState([]);const [interactions,setInteractions]=useState([]);const [tasks,setTasks]=useState([]);const [sessions,setSessions]=useState([]);const [packages,setPackages]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(null);
  const [section,setSection]=useState("crm");
  const [view,setView]=useState("leads");
  const [leadsMode,setLeadsMode]=useState("board");const [showForm,setShowForm]=useState(false);const [showNotifs,setShowNotifs]=useState(false);const [selectedLead,setSelectedLead]=useState(null);const [search,setSearch]=useState("");const [serviceFilter,setServiceFilter]=useState("");const [statusFilter,setStatusFilter]=useState("");const [sourceFilter,setSourceFilter]=useState("");const [taskFilter,setTaskFilter]=useState(false);const [dragId,setDragId]=useState(null);const toast=useToast();const notifs=useNotifications(leads,tasks,interactions);

  const load=useCallback(async()=>{try{const [l,i,t,s,pk]=await Promise.all([sb("leads","GET",null,"?order=updated_at.desc"),sb("interactions","GET",null,"?order=date.desc"),sb("tasks","GET",null,"?order=due_date.asc"),sb("podcast_sessions","GET",null,"?order=session_date.asc"),sb("podcast_packages","GET",null,"?order=created_at.desc")]);setLeads(l||[]);setInteractions(i||[]);setTasks(t||[]);setSessions(s||[]);setPackages(pk||[]);setError(null);}catch(e){setError(e.message);}finally{setLoading(false);}},[]);
  useEffect(()=>{load();},[load]);

  const addLead=async(lead,followup)=>{try{const [c]=await sb("leads","POST",lead);setLeads(p=>[c,...p]);if(followup&&c){const [t]=await sb("tasks","POST",{...followup,lead_id:c.id});setTasks(p=>[...p,t]);sendToCal(`${c.name} — ${followup.title}`,followup.due_date,`טלפון: ${lead.phone||""}`);}}catch(e){setError(e.message);}};
  const updateLead=async(id,u)=>{try{const [r]=await sb("leads","PATCH",u,`?id=eq.${id}`);setLeads(p=>p.map(l=>l.id===id?r:l));if(selectedLead?.id===id)setSelectedLead(r);}catch(e){setError(e.message);}};
  const deleteLead=async id=>{try{await sb("podcast_sessions","DELETE",null,`?lead_id=eq.${id}`);await sb("tasks","DELETE",null,`?lead_id=eq.${id}`);await sb("interactions","DELETE",null,`?lead_id=eq.${id}`);await sb("leads","DELETE",null,`?id=eq.${id}`);setLeads(p=>p.filter(l=>l.id!==id));setInteractions(p=>p.filter(i=>i.lead_id!==id));setTasks(p=>p.filter(t=>t.lead_id!==id));setSessions(p=>p.filter(s=>s.lead_id!==id));}catch(e){setError(e.message);}};
  const addInteraction=async i=>{try{const [c]=await sb("interactions","POST",i);setInteractions(p=>[c,...p]);}catch(e){setError(e.message);}};
  const updateInteraction=async(id,u)=>{try{const [r]=await sb("interactions","PATCH",u,`?id=eq.${id}`);setInteractions(p=>p.map(i=>i.id===id?r:i));}catch(e){setError(e.message);}};
  const deleteInteraction=async id=>{try{await sb("interactions","DELETE",null,`?id=eq.${id}`);setInteractions(p=>p.filter(i=>i.id!==id));}catch(e){setError(e.message);}};
  const addTask=async t=>{try{const [c]=await sb("tasks","POST",t);setTasks(p=>[...p,c]);}catch(e){setError(e.message);}};
  const updateTask=async(id,u)=>{try{const [r]=await sb("tasks","PATCH",u,`?id=eq.${id}`);setTasks(p=>p.map(t=>t.id===id?r:t));}catch(e){setError(e.message);}};
  const toggleTask=async(id,c)=>{try{const [r]=await sb("tasks","PATCH",{completed:c},`?id=eq.${id}`);setTasks(p=>p.map(t=>t.id===id?r:t));}catch(e){setError(e.message);}};
  const deleteTask=async id=>{try{await sb("tasks","DELETE",null,`?id=eq.${id}`);setTasks(p=>p.filter(t=>t.id!==id));}catch(e){setError(e.message);}};
  const addSession=async s=>{try{const [c]=await sb("podcast_sessions","POST",s);setSessions(p=>[...p,c]);}catch(e){setError(e.message);}};
  const updateSession=async(id,u)=>{try{const [r]=await sb("podcast_sessions","PATCH",u,`?id=eq.${id}`);setSessions(p=>p.map(s=>s.id===id?r:s));}catch(e){setError(e.message);}};
  const deleteSession=async id=>{try{await sb("podcast_sessions","DELETE",null,`?id=eq.${id}`);setSessions(p=>p.filter(s=>s.id!==id));}catch(e){setError(e.message);}};
  const addPackage=async p=>{try{const [c]=await sb("podcast_packages","POST",p);setPackages(pk=>[c,...pk]);}catch(e){setError(e.message);}};
  const updatePackage=async(id,u)=>{try{const [r]=await sb("podcast_packages","PATCH",u,`?id=eq.${id}`);setPackages(pk=>pk.map(p=>p.id===id?r:p));}catch(e){setError(e.message);}};
  const deletePackage=async id=>{try{await sb("podcast_sessions","DELETE",null,`?package_id=eq.${id}`);await sb("podcast_packages","DELETE",null,`?id=eq.${id}`);setSessions(p=>p.filter(s=>s.package_id!==id));setPackages(pk=>pk.filter(p=>p.id!==id));}catch(e){setError(e.message);}};
  const filtered=leads.filter(l=>{if(search&&!l.name?.includes(search)&&!l.phone?.includes(search)&&!l.service?.includes(search))return false;if(serviceFilter&&l.service!==serviceFilter)return false;if(statusFilter&&l.status!==statusFilter)return false;if(sourceFilter&&l.source!==sourceFilter)return false;if(taskFilter&&!tasks.some(t=>t.lead_id===l.id&&!t.completed))return false;return true;});

  // Section/view sync
  const switchSection = (s) => {
    setSection(s);
    if (s === "crm") setView("leads");
    else setView("cashflow");
  };

  const CRM_TABS = [
    { id: "leads", label: "לידים" },
    { id: "clients", label: "לקוחות" },
    { id: "tasks", label: "משימות" },
    { id: "stats", label: "נתונים" },
  ];
  const FIN_TABS = [
    { id: "cashflow", label: "תזרים" },
    { id: "dashboard", label: "דאשבורד" },
  ];
  const activeTabs = section === "crm" ? CRM_TABS : FIN_TABS;

  if(loading)return <div style={{...S.app,display:"flex",justifyContent:"center",alignItems:"center",height:"100vh"}}><div style={{textAlign:"center"}}><div style={{fontSize:24,marginBottom:8}}>🎤</div><div style={{color:"#64748B"}}>טוען...</div></div></div>;
  if(error)return <div style={{...S.app,display:"flex",justifyContent:"center",alignItems:"center",height:"100vh"}}><div style={{textAlign:"center",color:"#EF4444"}}><div style={{fontSize:16,marginBottom:8}}>שגיאה</div><div style={{fontSize:13,color:"#64748B",marginBottom:12,maxWidth:400,wordBreak:"break-all"}}>{error}</div><button style={S.btn1} onClick={()=>{setError(null);setLoading(true);load();}}>נסה שוב</button></div></div>;

  if(selectedLead){const fresh=leads.find(l=>l.id===selectedLead.id);if(!fresh){setSelectedLead(null);return null;}return <div style={S.app}><LeadDetail lead={fresh} interactions={interactions} tasks={tasks} sessions={sessions} packages={packages} onBack={()=>setSelectedLead(null)} onUpdate={updateLead} onDelete={deleteLead} onAddInteraction={addInteraction} onUpdateInteraction={updateInteraction} onDeleteInteraction={deleteInteraction} onAddTask={addTask} onUpdateTask={updateTask} onToggleTask={toggleTask} onDeleteTask={deleteTask} onAddSession={addSession} onUpdateSession={updateSession} onDeleteSession={deleteSession} onAddPackage={addPackage} onUpdatePackage={updatePackage} onDeletePackage={deletePackage}/><Toast {...toast}/></div>;}

  return(<div style={S.app}>
  <div style={S.header}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <h1 style={{fontSize:20,fontWeight:800,margin:0}}>🎤 אולפני הנסיכה</h1>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <button style={{...S.iconBtn,position:"relative"}} onClick={()=>setShowNotifs(true)}>{I.bell}{notifs.length>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#EF4444",color:"#fff",fontSize:10,fontWeight:700,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{notifs.length}</span>}</button>
        {section==="crm"&&<button style={S.addBtn} onClick={()=>setShowForm(true)}>{I.plus} ליד חדש</button>}
      </div>
    </div>
    {/* Section selector */}
    <div style={{display:"flex",gap:4,marginBottom:6}}>
      <button onClick={()=>switchSection("crm")} style={{border:"none",padding:"4px 14px",borderRadius:8,fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:section==="crm"?700:500,background:section==="crm"?"#8B5CF6":"transparent",color:section==="crm"?"#fff":"#64748B"}}>CRM</button>
      <button onClick={()=>switchSection("finances")} style={{border:"none",padding:"4px 14px",borderRadius:8,fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:section==="finances"?700:500,background:section==="finances"?"#10B981":"transparent",color:section==="finances"?"#fff":"#64748B"}}>כספים</button>
    </div>
    {/* Sub-tabs */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      {section==="crm"&&<div style={S.searchBox}>{I.search}<input style={S.searchInp} value={search} onChange={e=>setSearch(e.target.value)} placeholder="חיפוש..."/></div>}
      <div style={S.tabs}>
        {activeTabs.map(tab=>(
          <button key={tab.id} style={view===tab.id?S.tabOn:S.tabOff} onClick={()=>{
            if(tab.id==="leads"&&view==="leads") setLeadsMode(leadsMode==="board"?"list":"board");
            else setView(tab.id);
          }}>
            {tab.label}
            {tab.id==="leads"&&view==="leads"&&<span style={{fontSize:10,opacity:0.7}}> ({leadsMode==="board"?"לוח":"רשימה"})</span>}
          </button>
        ))}
      </div>
    </div>
  </div>

  {view==="leads"&&<div style={{display:"flex",gap:4,flexWrap:"wrap",padding:"6px 0",alignItems:"center"}}><button style={!serviceFilter&&!taskFilter&&!statusFilter&&!sourceFilter?S.filterOn:S.filterOff} onClick={()=>{setServiceFilter("");setTaskFilter(false);setStatusFilter("");setSourceFilter("");}}>הכל</button>{STATUSES.map(s=>{const c=leads.filter(l=>l.status===s.id).length;if(c===0)return null;return <button key={s.id} style={statusFilter===s.id?{...S.filterOn,background:s.color}:S.filterOff} onClick={()=>setStatusFilter(statusFilter===s.id?"":s.id)}>{s.label} ({c})</button>;})}<span style={{width:1,height:16,background:"#334155",margin:"0 2px"}}/>{SERVICES.map(svc=>{const c=leads.filter(l=>l.service===svc).length;if(c===0)return null;return <button key={svc} style={serviceFilter===svc?S.filterOn:S.filterOff} onClick={()=>setServiceFilter(serviceFilter===svc?"":svc)}>{svc} ({c})</button>;})}<span style={{width:1,height:16,background:"#334155",margin:"0 2px"}}/><select style={{...S.inp,width:"auto",padding:"3px 8px",fontSize:12,borderRadius:14,background:sourceFilter?"#F59E0B":"#1E293B",color:sourceFilter?"#fff":"#64748B",border:"none",fontWeight:sourceFilter?600:400}} value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option value="">מקור</option>{SOURCES.map(src=>{const c=leads.filter(l=>l.source===src).length;if(c===0)return null;return <option key={src} value={src}>{src} ({c})</option>;})}</select><span style={{width:1,height:16,background:"#334155",margin:"0 2px"}}/><button style={taskFilter?{...S.filterOn,background:"#3B82F6"}:S.filterOff} onClick={()=>setTaskFilter(!taskFilter)}>📋 משימות</button></div>}

  {view==="leads"&&leadsMode==="board"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8,padding:"8px 0 20px",minHeight:400}}>{BOARD_STATUSES.map(status=>{const col=filtered.filter(l=>l.status===status.id);return(<div key={status.id} style={S.col} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragId){updateLead(dragId,{status:status.id});setDragId(null);}}}><div style={S.colHead}><span style={{width:8,height:8,borderRadius:"50%",background:status.color}}/><span style={{fontSize:13,fontWeight:700,flex:1}}>{status.label}</span><span style={S.badge}>{col.length}</span></div><div style={{display:"flex",flexDirection:"column",gap:6}}>{col.map(lead=>{const temp=TEMPS.find(t=>t.id===lead.temperature);return(<div key={lead.id} style={{...S.card,cursor:"pointer",borderRight:temp?`3px solid ${temp.color}`:"3px solid transparent"}} draggable onDragStart={()=>setDragId(lead.id)} onDragEnd={()=>setDragId(null)} onClick={()=>setSelectedLead(lead)}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:14,fontWeight:600}}>{lead.name}</span>{temp&&<span style={{fontSize:14}}>{temp.emoji}</span>}</div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>{lead.service&&<span style={{fontSize:11,background:"#1E293B",color:"#94A3B8",padding:"1px 7px",borderRadius:4}}>{lead.service}</span>}{lead.amount>0&&<span style={{fontSize:11,color:"#10B981",fontWeight:600}}>₪{lead.amount.toLocaleString()}</span>}</div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#475569"}}><span>{lead.source}</span><span>{daysAgo(lead.updated_at)}</span></div></div>);})}{col.length===0&&<div style={{fontSize:12,color:"#334155",textAlign:"center",padding:20}}>אין לידים</div>}</div></div>);})}</div>}

  {view==="leads"&&leadsMode==="list"&&<div style={{overflowX:"auto",padding:"8px 0 20px"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["שם","טלפון","שירות","סטטוס","מקור","סכום","תאריך","עדכון"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead><tbody>{filtered.map(lead=>{const s=STATUSES.find(x=>x.id===lead.status);const temp=TEMPS.find(t=>t.id===lead.temperature);return(<tr key={lead.id} style={{cursor:"pointer"}} onClick={()=>setSelectedLead(lead)}><td style={S.td}><strong>{lead.name}</strong> {temp?temp.emoji:""}</td><td style={{...S.td,direction:"ltr",textAlign:"right"}}>{lead.phone}</td><td style={S.td}>{lead.service}</td><td style={S.td}><span style={{background:s.bg,color:s.color,padding:"2px 10px",borderRadius:12,fontSize:12,fontWeight:600}}>{s.label}</span></td><td style={S.td}>{lead.source}</td><td style={S.td}>{lead.amount>0?`₪${lead.amount.toLocaleString()}`:"—"}</td><td style={S.td}>{fmtDate(lead.created_at)}</td><td style={S.td}>{daysAgo(lead.updated_at)}</td></tr>);})}</tbody></table>{filtered.length===0&&<div style={S.empty}>אין לידים</div>}</div>}

  {view==="clients"&&<ClientsView leads={leads} onSelect={setSelectedLead}/>}
  {view==="tasks"&&<TasksView tasks={tasks} leads={leads} onToggle={toggleTask} onDelete={deleteTask}/>}
  {view==="cashflow"&&<CashflowView leads={leads}/>}
  {view==="dashboard"&&<DashboardView/>}
  {view==="stats"&&<Stats leads={leads}/>}
  {showForm&&<LeadForm onSave={addLead} onClose={()=>setShowForm(false)}/>}
  {showNotifs&&<NotifPanel notifs={notifs} onClose={()=>setShowNotifs(false)} onSelect={id=>{const l=leads.find(x=>x.id===id);if(l)setSelectedLead(l);}}/>}
  <Toast {...toast}/></div>);
}

const S = {
  app:{direction:"rtl",fontFamily:"'Rubik','Segoe UI',sans-serif",background:"#0B1120",color:"#E2E8F0",minHeight:"100vh",maxWidth:1200,margin:"0 auto",padding:"0 16px"},
  header:{padding:"14px 0 8px",borderBottom:"1px solid #1E293B",marginBottom:10,position:"sticky",top:0,background:"#0B1120",zIndex:10},
  addBtn:{display:"flex",alignItems:"center",gap:5,background:"#8B5CF6",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  searchBox:{display:"flex",alignItems:"center",gap:6,background:"#1E293B",borderRadius:8,padding:"5px 10px",flex:"1 1 180px",maxWidth:260,color:"#64748B"},
  searchInp:{background:"transparent",border:"none",outline:"none",color:"#E2E8F0",fontSize:13,width:"100%",fontFamily:"inherit"},
  tabs:{display:"flex",gap:2,background:"#1E293B",borderRadius:8,padding:2},
  tabOff:{background:"transparent",border:"none",color:"#64748B",fontSize:13,padding:"5px 12px",borderRadius:6,cursor:"pointer",fontFamily:"inherit"},
  tabOn:{background:"#334155",border:"none",color:"#E2E8F0",fontSize:13,padding:"5px 12px",borderRadius:6,cursor:"pointer",fontWeight:600,fontFamily:"inherit"},
  col:{background:"#111827",borderRadius:10,padding:8},
  colHead:{display:"flex",alignItems:"center",gap:6,padding:"4px 4px 8px",borderBottom:"1px solid #1E293B",marginBottom:8},
  badge:{fontSize:11,color:"#64748B",background:"#1E293B",borderRadius:10,padding:"0px 7px"},
  card:{background:"#1E293B",borderRadius:8,padding:"10px 12px",transition:"all 0.15s",border:"1px solid transparent"},
  chip:{background:"#1E293B",padding:"2px 10px",borderRadius:6,fontSize:12},
  contactBtn:{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:8,fontSize:12,fontWeight:500,textDecoration:"none",fontFamily:"inherit"},
  th:{textAlign:"right",fontSize:12,color:"#64748B",fontWeight:600,padding:"8px 10px",borderBottom:"1px solid #1E293B"},
  td:{padding:"10px",fontSize:13,borderBottom:"1px solid #111827"},
  detail:{padding:"8px 0 20px"},
  detailTop:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},
  detailCard:{background:"#111827",borderRadius:12,padding:20},
  backBtn:{display:"flex",alignItems:"center",gap:5,background:"transparent",border:"none",color:"#8B5CF6",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  section:{marginTop:16},
  secTitle:{display:"flex",alignItems:"center",gap:6,fontSize:15,fontWeight:700,margin:0},
  overlay:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.75)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:100,padding:16},
  modal:{background:"#1E293B",borderRadius:14,padding:20,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",direction:"rtl"},
  mHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14},
  mTitle:{fontSize:17,fontWeight:800,margin:0},
  mFoot:{display:"flex",justifyContent:"flex-start",gap:8,marginTop:14},
  grid2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},
  full:{gridColumn:"1 / -1"},
  lbl:{fontSize:12,color:"#64748B",fontWeight:600,display:"block",marginBottom:3},
  inp:{background:"#0F172A",border:"1px solid #334155",borderRadius:8,padding:"7px 10px",fontSize:13,color:"#E2E8F0",outline:"none",fontFamily:"inherit",direction:"rtl",width:"100%",boxSizing:"border-box"},
  btn1:{background:"#8B5CF6",color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"},
  btn2:{background:"#334155",color:"#94A3B8",border:"none",borderRadius:8,padding:"7px 16px",fontSize:13,cursor:"pointer",fontFamily:"inherit"},
  iconBtn:{background:"transparent",border:"none",color:"#64748B",cursor:"pointer",padding:4,display:"flex",alignItems:"center"},
  empty:{fontSize:13,color:"#334155",textAlign:"center",padding:16},
  statCard:{background:"#111827",borderRadius:10,padding:14,display:"flex",flexDirection:"column",gap:6},
  statLbl:{fontSize:13,color:"#64748B",fontWeight:500},
  filterOff:{background:"#1E293B",border:"none",color:"#64748B",fontSize:12,padding:"4px 10px",borderRadius:14,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"},
  filterOn:{background:"#8B5CF6",border:"none",color:"#fff",fontSize:12,padding:"4px 10px",borderRadius:14,cursor:"pointer",fontFamily:"inherit",fontWeight:600,whiteSpace:"nowrap"},
};
