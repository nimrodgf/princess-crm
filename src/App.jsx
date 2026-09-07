import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const SUPABASE_URL = "https://lbqscxwfttiduofjjmyt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicXNjeHdmdHRpZHVvZmpqbXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzUwNTksImV4cCI6MjA5NDAxMTA1OX0.pPFtxoO5UhRt_UFxJxFOy8zbwLK4OXnk6lxRUGhZack";
const GCAL_URL = "https://script.google.com/macros/s/AKfycbyFyUmXAmlQCuZHgtAKu_0Zc_b3eEDf_u32oCYdNqLAK6t3ktlNktf2tJ-hPhvXgq8N9w/exec";
const hdrs = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
async function sb(table, method = "GET", body = null, query = "") { const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, { method, headers: hdrs, ...(body ? { body: JSON.stringify(body) } : {}) }); if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`); const t = await res.text(); return t ? JSON.parse(t) : null; }
async function sbMoneyman(query = "") { const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions${query}`, { headers: { ...hdrs, "Accept-Profile": "moneyman", "Range": "0-9999" } }); if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`); const t = await res.text(); return t ? JSON.parse(t) : null; }
async function sbMoneymanWrite(method, query = "", body = null) { const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions${query}`, { method, headers: { ...hdrs, "Accept-Profile": "moneyman", "Content-Profile": "moneyman" }, ...(body ? { body: JSON.stringify(body) } : {}) }); if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`); return true; }
function encPath(p) { return String(p).split("/").map(encodeURIComponent).join("/"); }
async function sbUpload(bucket, path, file) { const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encPath(path)}`, { method: "POST", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" }, body: file }); if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`); return path; }
async function sbSignedUrl(bucket, path, expiresIn = 3600) { const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${encPath(path)}`, { method: "POST", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn }) }); if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`); const d = await res.json(); const su = d.signedURL || d.signedUrl; if (!su) throw new Error("לא התקבל קישור חתום"); return su.startsWith("http") ? su : `${SUPABASE_URL}/storage/v1${su.startsWith("/") ? "" : "/"}${su}`; }
async function sbDeleteFile(bucket, path) { const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encPath(path)}`, { method: "DELETE", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }); return res.ok; }
async function addToCalendar(title, start, desc = "") { try { const r = await fetch(GCAL_URL, { method: "POST", body: JSON.stringify({ title, start, description: desc, duration: 30 }) }); return (await r.json()).success; } catch { return false; } }

const STATUSES = [{ id: "new", label: "ליד חדש", color: "#8B5CF6", bg: "#8B5CF615" }, { id: "in_progress", label: "בתהליך", color: "#3B82F6", bg: "#3B82F615" }, { id: "frozen", label: "בהקפאה", color: "#64748B", bg: "#64748B15" }, { id: "closed", label: "נסגר ✓", color: "#10B981", bg: "#10B98115" }, { id: "lost", label: "לא נסגר", color: "#EF4444", bg: "#EF444415" }];
const BOARD_STATUSES = STATUSES.filter(s => s.id !== "new");
const SERVICES = ["בית ריק","הפקה","הפקה - אפיק","הקלטה","השכרת חלל","ייעוץ אומנותי - אפיק","ייעוץ אומנותי - נימשי","לייב סשן","מיקס","פודקאסטים","צילום קורס","אחר"];
const SOURCES = ["אינסטגרם","אתר","גוגל","הכירות קודמת","המלצה","חוזר/ת","ממומן - מטא","פייסבוק","שיווק אקטיבי","אחר"];
const TASK_TYPES = [{ id: "followup", label: "פולואפ", icon: "📞" }, { id: "call", label: "שיחה", icon: "☎️" }, { id: "prep", label: "הכנת חומרים", icon: "📦" }, { id: "export", label: "ייצוא", icon: "📤" }, { id: "other", label: "אחר", icon: "📌" }];
const INTERACTION_TYPES = [{ id: "call", label: "שיחה" }, { id: "followup", label: "פולואפ" }, { id: "meeting", label: "פגישה" }, { id: "quote", label: "הצעת מחיר" }, { id: "note", label: "הערה" }];
const TEMPS = [{ id: "hot", label: "חם", color: "#EF4444", emoji: "🔥" }, { id: "warm", label: "פושר", color: "#F59E0B", emoji: "🌤" }, { id: "cold", label: "קר", color: "#06B6D4", emoji: "❄️" }];
const LOST_REASONS = ["אי מוכנות לקוח", "מחיר", "מיקום", "נעלמו", "עבר למתחרה", "תזמון לא התאים", "לא ידוע", "אחר"];
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
  const [f, setF] = useState(initial || { name:"",phone:"",email:"",instagram:"",service:"",source:"",notes:"",amount:"",status:"new",created_at:"",lost_reason:"" });
  const [addFollowup,setAddFollowup] = useState(!isEdit);
  const [followupDays,setFollowupDays] = useState(2);
  const ref = useRef(); useEffect(()=>{ref.current?.focus();},[]);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const submit=()=>{if(!f.name.trim())return;const dd=new Date();dd.setDate(dd.getDate()+followupDays);dd.setHours(10,0,0,0);const data={...f,name:f.name.trim(),amount:f.amount?Number(f.amount):0};if(f.created_at)data.created_at=new Date(f.created_at+"T12:00:00").toISOString();else delete data.created_at;onSave(data,!isEdit&&addFollowup?{title:"פולואפ",type:"followup",due_date:dd.toISOString(),completed:false}:null);onClose();};
  return(<Modal onClose={onClose}><div style={S.mHead}><h2 style={S.mTitle}>{isEdit?"עריכת ליד":"ליד חדש"}</h2><button style={S.iconBtn} onClick={onClose}>{I.x}</button></div><div style={S.grid2}><div style={S.full}><label style={S.lbl}>שם *</label><input ref={ref} style={S.inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="שם" onKeyDown={e=>e.key==="Enter"&&submit()}/></div><div><label style={S.lbl}>טלפון</label><input style={S.inp} value={f.phone} onChange={e=>set("phone",e.target.value)} placeholder="050-0000000" dir="ltr"/></div><div><label style={S.lbl}>אימייל</label><input style={S.inp} value={f.email} onChange={e=>set("email",e.target.value)} placeholder="email@example.com" dir="ltr"/></div><div><label style={S.lbl}>אינסטגרם</label><input style={S.inp} value={f.instagram||""} onChange={e=>set("instagram",e.target.value)} placeholder="@username" dir="ltr"/></div><div><label style={S.lbl}>שירות</label><select style={S.inp} value={f.service} onChange={e=>set("service",e.target.value)}><option value="">בחר...</option>{SERVICES.map(s=><option key={s}>{s}</option>)}</select></div><div><label style={S.lbl}>מקור</label><select style={S.inp} value={f.source} onChange={e=>set("source",e.target.value)}><option value="">בחר...</option>{SOURCES.map(s=><option key={s}>{s}</option>)}</select></div><div><label style={S.lbl}>סטטוס</label><select style={S.inp} value={f.status||"new"} onChange={e=>set("status",e.target.value)}>{STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></div>{f.status==="lost"&&<div><label style={S.lbl}>סיבה</label><select style={S.inp} value={f.lost_reason||""} onChange={e=>set("lost_reason",e.target.value)}><option value="">בחר...</option>{LOST_REASONS.map(r=><option key={r}>{r}</option>)}</select></div>}<div><label style={S.lbl}>סכום (₪)</label><input style={S.inp} type="number" value={f.amount} onChange={e=>set("amount",e.target.value)} dir="ltr"/></div><div><label style={S.lbl}>תאריך{isEdit?"":" (ברירת מחדל: היום)"}</label><input style={S.inp} type="date" value={f.created_at||""} onChange={e=>set("created_at",e.target.value)} dir="ltr"/></div><div style={S.full}><label style={S.lbl}>הערות</label><textarea style={{...S.inp,minHeight:50,resize:"vertical"}} value={f.notes} onChange={e=>set("notes",e.target.value)}/></div>{!isEdit&&<div style={{...S.full,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,paddingTop:8,borderTop:"1px solid #334155"}}><label style={{...S.lbl,display:"flex",alignItems:"center",gap:8,cursor:"pointer",margin:0}}><input type="checkbox" checked={addFollowup} onChange={e=>setAddFollowup(e.target.checked)} style={{accentColor:"#8B5CF6",width:16,height:16}}/>צור פולואפ</label>{addFollowup&&<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:13,color:"#94A3B8"}}>בעוד</span><input type="number" value={followupDays} onChange={e=>setFollowupDays(Number(e.target.value))} style={{...S.inp,width:50,textAlign:"center",padding:"4px 6px"}} min={1} dir="ltr"/><span style={{fontSize:13,color:"#94A3B8"}}>ימים</span></div>}</div>}</div><div style={S.mFoot}><button style={S.btn2} onClick={onClose}>ביטול</button><button style={S.btn1} onClick={submit} disabled={!f.name.trim()}>{isEdit?"שמור שינויים":"שמור ליד"}</button></div></Modal>);
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
  const [noteText,setNoteText]=useState("");const [noteType,setNoteType]=useState("note");const [noteDate,setNoteDate]=useState(new Date().toISOString().split("T")[0]);const [showTaskForm,setShowTaskForm]=useState(false);const [showEditForm,setShowEditForm]=useState(false);const [editingInteraction,setEditingInteraction]=useState(null);const [editInterText,setEditInterText]=useState("");const [editingTask,setEditingTask]=useState(null);const [editTaskText,setEditTaskText]=useState("");const [showPackage,setShowPackage]=useState(packages.some(p=>p.lead_id===lead.id));const [uploading,setUploading]=useState(false);const [dragOver,setDragOver]=useState(false);const [editDeliv,setEditDeliv]=useState(false);const [delivInput,setDelivInput]=useState(lead.deliverables_url||"");
  const addNote=async()=>{if(!noteText.trim())return;await onAddInteraction({lead_id:lead.id,text:noteText.trim(),type:noteType,date:new Date(noteDate+"T12:00:00").toISOString()});setNoteText("");setNoteDate(new Date().toISOString().split("T")[0]);};
  const uploadContract=async(f)=>{
    if(!f)return;
    const okExt=["pdf","doc","docx","jpg","jpeg","png"];
    const ext=(f.name.split(".").pop()||"").toLowerCase();
    if(!okExt.includes(ext)){alert("סוג קובץ לא נתמך. אפשר PDF, Word או תמונה.");return;}
    if(f.size>10*1024*1024){alert("הקובץ גדול מ-10MB");return;}
    setUploading(true);
    try{
      const path=`${lead.id}/contract.${ext}`;
      await sbUpload("contracts",path,f);
      onUpdate(lead.id,{contract_path:path,contract_name:f.name});
    }catch(err){alert("שגיאה בהעלאה: "+err.message);}
    setUploading(false);
  };
  const leadTasks=tasks.filter(t=>t.lead_id===lead.id).sort((a,b)=>new Date(a.due_date)-new Date(b.due_date));const leadInter=interactions.filter(i=>i.lead_id===lead.id).sort((a,b)=>new Date(b.date)-new Date(a.date));const temp=TEMPS.find(t=>t.id===lead.temperature);
  return(<div style={S.detail}><div style={S.detailTop}><button style={S.backBtn} onClick={onBack}>{I.back} חזרה</button><div style={{display:"flex",gap:6}}><button style={{...S.iconBtn,color:"#8B5CF6"}} onClick={()=>setShowEditForm(true)}>{I.edit}</button><button style={{...S.iconBtn,color:"#EF4444"}} onClick={()=>{if(confirm("למחוק?")){onDelete(lead.id);onBack();}}}>{I.trash}</button></div></div>
  {showEditForm&&<LeadForm initial={{name:lead.name,phone:lead.phone||"",email:lead.email||"",instagram:lead.instagram||"",service:lead.service||"",source:lead.source||"",notes:lead.notes||"",amount:lead.amount||0,status:lead.status||"new",created_at:lead.created_at?lead.created_at.split("T")[0]:""}} onSave={(d)=>{onUpdate(lead.id,d);setShowEditForm(false);}} onClose={()=>setShowEditForm(false)}/>}
  <div style={S.detailCard}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><h2 style={{fontSize:22,fontWeight:800,margin:"0 0 10px"}}>{lead.name}</h2>{temp&&<span style={{fontSize:20}} title={temp.label}>{temp.emoji}</span>}</div>
  <ContactBtns lead={lead}/>
  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{lead.service&&<span style={S.chip}>{lead.service}</span>}{lead.source&&<span style={S.chip}>{lead.source}</span>}{lead.amount>0&&<span style={{color:"#10B981",fontWeight:700,fontSize:14}}>₪{lead.amount.toLocaleString()}</span>}</div>
  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{STATUSES.map(s=><button key={s.id} onClick={()=>onUpdate(lead.id,{status:s.id})} style={{border:"none",padding:"5px 14px",borderRadius:20,fontSize:13,cursor:"pointer",fontFamily:"inherit",background:lead.status===s.id?s.color:s.bg,color:lead.status===s.id?"#fff":s.color,fontWeight:lead.status===s.id?700:500}}>{s.label}</button>)}</div>
  {lead.status==="lost"&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:12,color:"#64748B"}}>סיבה:</span><select style={{...S.inp,width:"auto",padding:"3px 10px",fontSize:12,borderRadius:14}} value={lead.lost_reason||""} onChange={e=>onUpdate(lead.id,{lost_reason:e.target.value})}><option value="">בחר סיבה...</option>{LOST_REASONS.map(r=><option key={r}>{r}</option>)}</select></div>}
  {lead.status==="in_progress"&&<div style={{display:"flex",gap:4,marginBottom:8,alignItems:"center"}}><span style={{fontSize:12,color:"#64748B",marginLeft:6}}>טמפרטורה:</span>{TEMPS.map(t=><button key={t.id} onClick={()=>onUpdate(lead.id,{temperature:lead.temperature===t.id?"":t.id})} style={{border:"none",padding:"3px 10px",borderRadius:12,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:lead.temperature===t.id?t.color:"#1E293B",color:lead.temperature===t.id?"#fff":"#64748B"}}>{t.emoji} {t.label}</button>)}</div>}
  {lead.status==="closed"&&<div style={{display:"flex",gap:4,marginBottom:8,alignItems:"center"}}><span style={{fontSize:12,color:"#64748B",marginLeft:6}}>סטטוס לקוח:</span>{CLIENT_STATUSES.map(cs=><button key={cs.id} onClick={()=>onUpdate(lead.id,{client_status:lead.client_status===cs.id?"":cs.id})} style={{border:"none",padding:"3px 10px",borderRadius:12,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:lead.client_status===cs.id?cs.color:"#1E293B",color:lead.client_status===cs.id?"#fff":"#64748B"}}>{cs.label}</button>)}</div>}
  {lead.status==="closed"&&<div style={{marginBottom:8,paddingTop:8,borderTop:"1px solid #1E293B",display:"flex",flexDirection:"column",gap:6}}>
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <span style={{fontSize:12,color:"#64748B",minWidth:52}}>חוזה:</span>
      {lead.contract_path?<>
        <span style={{fontSize:13,color:"#E2E8F0"}}>📄 {lead.contract_name||"חוזה חתום"}</span>
        <button style={{...S.btn2,padding:"3px 10px",fontSize:11}} onClick={async()=>{try{const u=await sbSignedUrl("contracts",lead.contract_path);window.open(u,"_blank");}catch(e){alert("שגיאה בפתיחת הקובץ: "+e.message);}}}>פתח</button>
        <button style={{...S.iconBtn,color:"#EF4444",fontSize:11}} onClick={async()=>{if(!confirm("למחוק את החוזה?"))return;await sbDeleteFile("contracts",lead.contract_path);onUpdate(lead.id,{contract_path:"",contract_name:""});}}>{I.trash}</button>
      </>:<>
        <input type="file" id={`contract_${lead.id}`} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{display:"none"}} onChange={async e=>{await uploadContract(e.target.files[0]);e.target.value="";}}/>
        <div
          onDragOver={e=>{e.preventDefault();if(!dragOver)setDragOver(true);}}
          onDragLeave={e=>{e.preventDefault();setDragOver(false);}}
          onDrop={async e=>{e.preventDefault();setDragOver(false);await uploadContract(e.dataTransfer.files[0]);}}
          onClick={()=>!uploading&&document.getElementById(`contract_${lead.id}`).click()}
          style={{flex:1,minWidth:180,padding:"10px 14px",borderRadius:8,border:`1px dashed ${dragOver?"#8B5CF6":"#334155"}`,background:dragOver?"#8B5CF615":"transparent",cursor:uploading?"default":"pointer",textAlign:"center",fontSize:12,color:dragOver?"#8B5CF6":"#64748B",transition:"all 0.15s"}}>
          {uploading?"מעלה...":dragOver?"שחרר כאן":<><span style={{color:"#8B5CF6",fontWeight:600}}>בחר קובץ</span> או גרור לפה</>}
        </div>
      </>}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <span style={{fontSize:12,color:"#64748B",minWidth:52}}>תוצרים:</span>
      {editDeliv?<>
        <input style={{...S.inp,flex:1,minWidth:180,padding:"3px 8px",fontSize:12}} value={delivInput} onChange={e=>setDelivInput(e.target.value)} placeholder="https://drive.google.com/..." dir="ltr" autoFocus onKeyDown={e=>{if(e.key==="Enter"){onUpdate(lead.id,{deliverables_url:delivInput.trim()});setEditDeliv(false);}if(e.key==="Escape")setEditDeliv(false);}}/>
        <button style={{...S.iconBtn,color:"#10B981"}} onClick={()=>{onUpdate(lead.id,{deliverables_url:delivInput.trim()});setEditDeliv(false);}}>{I.check}</button>
        <button style={{...S.iconBtn,color:"#64748B"}} onClick={()=>{setDelivInput(lead.deliverables_url||"");setEditDeliv(false);}}>{I.x}</button>
      </>:lead.deliverables_url?<>
        <a href={lead.deliverables_url} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:"#3B82F6",textDecoration:"none"}}>📁 פתח תיקייה</a>
        <button style={{...S.iconBtn,color:"#64748B"}} onClick={()=>{setDelivInput(lead.deliverables_url||"");setEditDeliv(true);}}>{I.edit}</button>
      </>:<button style={{...S.btn2,padding:"3px 10px",fontSize:11}} onClick={()=>setEditDeliv(true)}>+ הוסף קישור</button>}
    </div>
  </div>}
  {lead.notes&&<p style={{fontSize:14,color:"#94A3B8",lineHeight:1.6,margin:"8px 0 0",padding:"8px 0 0",borderTop:"1px solid #1E293B"}}>{lead.notes}</p>}
  <div style={{display:"flex",gap:14,fontSize:12,color:"#475569",marginTop:8,paddingTop:8,borderTop:"1px solid #1E293B"}}><span>נוצר: {fmtDateFull(lead.created_at)}</span><span>עודכן: {daysAgo(lead.updated_at)}</span></div></div>
  {lead.service==="פודקאסטים"&&lead.status==="closed"&&<div style={{...S.section,background:"#111827",borderRadius:10,padding:12,marginTop:12}}>{!showPackage?<button style={S.btn1} onClick={()=>setShowPackage(true)}>🎙 ניהול חבילות פודקאסט</button>:<PodcastSessions leadId={lead.id} sessions={sessions} packages={packages} onAdd={onAddSession} onUpdate={onUpdateSession} onDelete={onDeleteSession} onAddPackage={onAddPackage} onUpdatePackage={onUpdatePackage} onDeletePackage={onDeletePackage}/>}</div>}
  <div style={S.section}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={S.secTitle}>{I.cal} משימות ({leadTasks.length})</h3><button style={{...S.btn1,padding:"5px 12px",fontSize:12}} onClick={()=>setShowTaskForm(true)}>{I.plus} משימה</button></div><div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8}}>{leadTasks.map(t=>{const tt=TASK_TYPES.find(x=>x.id===t.type);const overdue=!t.completed&&new Date(t.due_date)<new Date();const isEd=editingTask===t.id;return(<div key={t.id} style={{display:"flex",alignItems:"center",gap:8,background:"#0F172A",borderRadius:8,padding:"8px 12px",opacity:t.completed?0.5:1,borderRight:`3px solid ${overdue?"#EF4444":t.completed?"#10B981":"#3B82F6"}`}}><button onClick={()=>onToggleTask(t.id,!t.completed)} style={{...S.iconBtn,color:t.completed?"#10B981":"#475569",flexShrink:0}}>{t.completed?I.check:<div style={{width:14,height:14,border:"2px solid #475569",borderRadius:3}}/>}</button>{isEd?<><input style={{...S.inp,flex:1,padding:"4px 8px",fontSize:13}} value={editTaskText} onChange={e=>setEditTaskText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){onUpdateTask(t.id,{title:editTaskText.trim()});setEditingTask(null);}if(e.key==="Escape")setEditingTask(null);}} autoFocus/><button onClick={()=>{onUpdateTask(t.id,{title:editTaskText.trim()});setEditingTask(null);}} style={{...S.iconBtn,color:"#10B981"}}>{I.check}</button><button onClick={()=>setEditingTask(null)} style={{...S.iconBtn,color:"#64748B"}}>{I.x}</button></>:<><span style={{fontSize:13,flex:1,textDecoration:t.completed?"line-through":"none"}}>{tt?.icon} {t.title}</span><span style={{fontSize:11,color:overdue?"#EF4444":"#475569",whiteSpace:"nowrap"}}>{fmtDate(t.due_date)}</span><button onClick={()=>sendToCal(`${lead.name} — ${t.title}`,t.due_date,`טלפון: ${lead.phone||""}`)} style={{...S.iconBtn,color:"#3B82F6"}}>{I.cal}</button><button onClick={()=>{setEditingTask(t.id);setEditTaskText(t.title);}} style={{...S.iconBtn,color:"#64748B"}}>{I.edit}</button><button onClick={()=>{if(confirm("למחוק?"))onDeleteTask(t.id);}} style={{...S.iconBtn,color:"#64748B"}}>{I.trash}</button></>}</div>);})}{leadTasks.length===0&&<p style={S.empty}>אין משימות</p>}</div></div>
  <div style={S.section}><h3 style={S.secTitle}>💬 אינטראקציות ({leadInter.length})</h3><div style={{display:"flex",gap:6,marginTop:8}}><select style={{...S.inp,width:85,padding:"6px 6px",fontSize:12}} value={noteType} onChange={e=>setNoteType(e.target.value)}>{INTERACTION_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select><input style={{...S.inp,width:110,padding:"6px 6px",fontSize:12}} type="date" value={noteDate} onChange={e=>setNoteDate(e.target.value)} dir="ltr"/><input style={{...S.inp,flex:1}} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="הוסף אינטראקציה..." onKeyDown={e=>e.key==="Enter"&&addNote()}/><button style={S.btn1} onClick={addNote} disabled={!noteText.trim()}>הוסף</button></div><div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8}}>{leadInter.map(i=>{const it=INTERACTION_TYPES.find(x=>x.id===i.type);const isEd=editingInteraction===i.id;return(<div key={i.id} style={{display:"flex",gap:8,alignItems:"center",background:"#0F172A",borderRadius:8,padding:"8px 12px"}}><span style={{fontSize:11,color:"#475569",whiteSpace:"nowrap",minWidth:55}}>{fmtDate(i.date)}</span>{it&&<span style={{fontSize:11,color:"#8B5CF6",background:"#8B5CF615",padding:"1px 6px",borderRadius:4,whiteSpace:"nowrap"}}>{it.label}</span>}{isEd?<><input style={{...S.inp,flex:1,padding:"4px 8px",fontSize:13}} value={editInterText} onChange={e=>setEditInterText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){onUpdateInteraction(i.id,{text:editInterText.trim()});setEditingInteraction(null);}if(e.key==="Escape")setEditingInteraction(null);}} autoFocus/><button onClick={()=>{onUpdateInteraction(i.id,{text:editInterText.trim()});setEditingInteraction(null);}} style={{...S.iconBtn,color:"#10B981"}}>{I.check}</button><button onClick={()=>setEditingInteraction(null)} style={{...S.iconBtn,color:"#64748B"}}>{I.x}</button></>:<><span style={{fontSize:13,lineHeight:1.5,flex:1}}>{i.text}</span><button onClick={()=>{setEditingInteraction(i.id);setEditInterText(i.text);}} style={{...S.iconBtn,color:"#64748B"}}>{I.edit}</button><button onClick={()=>{if(confirm("למחוק?"))onDeleteInteraction(i.id);}} style={{...S.iconBtn,color:"#64748B"}}>{I.trash}</button></>}</div>);})}{leadInter.length===0&&<p style={S.empty}>אין אינטראקציות</p>}</div></div>
  {showTaskForm&&<TaskForm leadId={lead.id} leadName={lead.name} onSave={async(t,cal)=>{await onAddTask(t);if(cal)sendToCal(`${lead.name} — ${t.title}`,t.due_date,`טלפון: ${lead.phone||""}`);setShowTaskForm(false);}} onClose={()=>setShowTaskForm(false)}/>}</div>);
}

function TasksView({tasks,leads,onToggle,onDelete}){const pending=tasks.filter(t=>!t.completed).sort((a,b)=>new Date(a.due_date)-new Date(b.due_date));const done=tasks.filter(t=>t.completed).sort((a,b)=>new Date(b.due_date)-new Date(a.due_date)).slice(0,10);const renderTask=t=>{const lead=leads.find(l=>l.id===t.lead_id);const tt=TASK_TYPES.find(x=>x.id===t.type);const overdue=!t.completed&&new Date(t.due_date)<new Date();return(<div key={t.id} style={{display:"flex",alignItems:"center",gap:8,background:"#0F172A",borderRadius:8,padding:"8px 12px",opacity:t.completed?0.5:1,borderRight:`3px solid ${overdue?"#EF4444":t.completed?"#10B981":"#3B82F6"}`}}><button onClick={()=>onToggle(t.id,!t.completed)} style={{...S.iconBtn,color:t.completed?"#10B981":"#475569",flexShrink:0}}>{t.completed?I.check:<div style={{width:14,height:14,border:"2px solid #475569",borderRadius:3}}/>}</button><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,textDecoration:t.completed?"line-through":"none"}}>{tt?.icon} {t.title}</div>{lead&&<div style={{fontSize:11,color:"#475569"}}>{lead.name}</div>}</div><span style={{fontSize:11,color:overdue?"#EF4444":"#475569",whiteSpace:"nowrap"}}>{daysAgo(t.due_date)}</span><button onClick={()=>sendToCal(lead?`${lead.name} — ${t.title}`:t.title,t.due_date,lead?`טלפון: ${lead.phone||""}`:"")} style={{...S.iconBtn,color:"#3B82F6"}}>{I.cal}</button><button onClick={()=>onDelete(t.id)} style={{...S.iconBtn,color:"#64748B"}}>{I.trash}</button></div>);};return(<div style={{padding:"8px 0 20px"}}><h3 style={{...S.secTitle,marginBottom:8}}>פתוחות ({pending.length})</h3><div style={{display:"flex",flexDirection:"column",gap:4}}>{pending.map(renderTask)}{pending.length===0&&<p style={S.empty}>אין משימות 🎉</p>}</div>{done.length>0&&<><h3 style={{...S.secTitle,marginTop:16,marginBottom:8,color:"#475569"}}>הושלמו</h3><div style={{display:"flex",flexDirection:"column",gap:4}}>{done.map(renderTask)}</div></>}</div>);}

function ClientsView({leads,onSelect}){const clients=leads.filter(l=>l.status==="closed");const [svcFilter,setSvcFilter]=useState("");const [csFilter,setCsFilter]=useState("");const [search,setSearch]=useState("");const filtered=clients.filter(c=>{if(svcFilter&&c.service!==svcFilter)return false;if(csFilter&&c.client_status!==csFilter)return false;if(search&&!c.name.includes(search)&&!c.phone?.includes(search))return false;return true;});return(<div style={{padding:"8px 0 20px"}}><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}><div style={S.searchBox}>{I.search}<input style={S.searchInp} value={search} onChange={e=>setSearch(e.target.value)} placeholder="חיפוש לקוח..."/></div></div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}><button style={!csFilter?S.filterOn:S.filterOff} onClick={()=>setCsFilter("")}>הכל ({clients.length})</button>{CLIENT_STATUSES.map(cs=>{const c=clients.filter(l=>l.client_status===cs.id).length;return <button key={cs.id} style={csFilter===cs.id?{...S.filterOn,background:cs.color}:S.filterOff} onClick={()=>setCsFilter(csFilter===cs.id?"":cs.id)}>{cs.label} ({c})</button>;})}<span style={{width:1,height:16,background:"#334155",margin:"0 2px"}}/>{SERVICES.map(svc=>{const c=clients.filter(l=>l.service===svc).length;if(c===0)return null;return <button key={svc} style={svcFilter===svc?S.filterOn:S.filterOff} onClick={()=>setSvcFilter(svcFilter===svc?"":svc)}>{svc} ({c})</button>;})}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>{filtered.map(c=>{const cs=CLIENT_STATUSES.find(x=>x.id===c.client_status);return(<div key={c.id} style={{...S.card,cursor:"pointer"}} onClick={()=>onSelect(c)}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:14,fontWeight:600}}>{c.name}</span>{cs&&<span style={{fontSize:10,background:cs.color+"20",color:cs.color,padding:"1px 8px",borderRadius:10,fontWeight:600}}>{cs.label}</span>}</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{c.service&&<span style={{fontSize:11,background:"#1E293B",color:"#94A3B8",padding:"1px 7px",borderRadius:4}}>{c.service}</span>}{c.amount>0&&<span style={{fontSize:11,color:"#10B981",fontWeight:600}}>₪{c.amount.toLocaleString()}</span>}</div>{c.phone&&<div style={{fontSize:11,color:"#475569",marginTop:4}}>{c.phone}</div>}</div>);})}</div>{filtered.length===0&&<p style={S.empty}>אין לקוחות</p>}</div>);}

function useNotifications(leads,tasks,interactions,refreshKey){return useMemo(()=>{const n=[];const now=Date.now();const twoDays=2*86400000;const oneWeek=7*86400000;const dismissed=JSON.parse(localStorage.getItem("princess_dismissed_notifs")||"{}");
// Active leads without activity for 2+ days
leads.filter(l=>l.status==="in_progress").forEach(l=>{const li=interactions.filter(i=>i.lead_id===l.id).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];const lt=tasks.filter(t=>t.lead_id===l.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];const la=Math.max(li?new Date(li.date).getTime():0,lt?new Date(lt.created_at).getTime():0,new Date(l.updated_at).getTime());if(now-la>twoDays)n.push({type:"lead",id:l.id,text:`${l.name} — ללא פעילות יומיים+`,leadId:l.id});});
// Frozen leads
leads.filter(l=>l.status==="frozen").forEach(l=>{
  const leadTasks=tasks.filter(t=>t.lead_id===l.id&&!t.completed);
  const futureTasks=leadTasks.filter(t=>t.due_date&&new Date(t.due_date)>new Date());
  if(futureTasks.length>0){
    // Has future tasks — notify 7 days before and 2 days before
    futureTasks.forEach(t=>{
      const due=new Date(t.due_date).getTime();
      const daysUntil=(due-now)/86400000;
      const dismissKey=`frozen_task_${t.id}`;
      const dismissedAt=dismissed[dismissKey]?new Date(dismissed[dismissKey]).getTime():0;
      if(daysUntil<=7&&daysUntil>2&&now-dismissedAt>twoDays){
        n.push({type:"frozen",id:l.id,text:`❄️ ${l.name} — משימה בעוד ${Math.ceil(daysUntil)} ימים: ${t.title}`,leadId:l.id,dismissKey});
      }else if(daysUntil<=2&&daysUntil>0){
        n.push({type:"frozen",id:l.id,text:`❄️ ${l.name} — משימה מחר/מחרתיים: ${t.title}`,leadId:l.id,dismissKey});
      }else if(daysUntil<=0){
        n.push({type:"task",id:t.id,text:`⏰ ${l.name} — משימה שעבר זמנה: ${t.title}`,leadId:l.id});
      }
    });
  }else{
    // No future tasks — weekly reminder
    const dismissKey=`frozen_${l.id}`;
    const dismissedAt=dismissed[dismissKey]?new Date(dismissed[dismissKey]).getTime():0;
    if(now-dismissedAt>oneWeek){
      n.push({type:"frozen",id:l.id,text:`❄️ ${l.name} — בהקפאה${leadTasks.length>0?" (יש משימות פתוחות)":""}`,leadId:l.id,dismissKey});
    }
  }
});
// Overdue tasks
tasks.filter(t=>!t.completed).forEach(t=>{const cr=new Date(t.created_at).getTime();if(now-cr>twoDays&&new Date(t.due_date)<new Date()){const lead=leads.find(l=>l.id===t.lead_id);if(lead?.status!=="frozen")n.push({type:"task",id:t.id,text:`⏰ ${lead?.name||""} — ${t.title}`,leadId:t.lead_id});}});return n;},[leads,tasks,interactions,refreshKey]);}

function NotifPanel({notifs,onClose,onSelect,onDismiss}){const dismiss=(n)=>{if(n.dismissKey){const d=JSON.parse(localStorage.getItem("princess_dismissed_notifs")||"{}");d[n.dismissKey]=new Date().toISOString();localStorage.setItem("princess_dismissed_notifs",JSON.stringify(d));}if(onDismiss)onDismiss();onSelect(n.leadId);onClose();};return(<Modal onClose={onClose}><div style={S.mHead}><h2 style={S.mTitle}>🔔 התראות ({notifs.length})</h2><button style={S.iconBtn} onClick={onClose}>{I.x}</button></div><div style={{display:"flex",flexDirection:"column",gap:4}}>{notifs.map((n,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center",background:"#0F172A",borderRadius:8,padding:"10px 12px",cursor:"pointer",borderRight:`3px solid ${n.type==="lead"?"#F59E0B":n.type==="frozen"?"#64748B":"#EF4444"}`}} onClick={()=>dismiss(n)}><span style={{fontSize:14}}>{n.type==="lead"?"⚠️":n.type==="frozen"?"❄️":"⏰"}</span><span style={{fontSize:13,flex:1}}>{n.text}</span>{n.dismissKey&&<span style={{fontSize:10,color:"#475569"}}>לחץ להשתקה לשבוע</span>}</div>)}{notifs.length===0&&<p style={S.empty}>אין התראות 🎉</p>}</div></Modal>);}

const EXPENSE_CATS_HOME=["אוכל בחוץ","ביטוחים","דלק","העברות לאפיק/משותף","חשבונות בית","טיפול","כושר","מזון","משתנות","פארם","שכד","תחזוקת רכב"];
const EXPENSE_CATS_BIZ=["הורדת אשראי","הלוואות וקרנות","חשבונות עסק","לא תזרימי","מעמ ומיסים","ספקים","ציוד","ריביות ועמלות","שיווק","שכד אולפן","תוכנות","תחבצ וחניונים","אחר"];
const INCOME_CATS=["הכנסה","הכנסה בחוב","הכנסה עתידית","מתנה","החזרים","העברות בין חשבונות","לא תזרימי"];
const ALL_CATS=[...EXPENSE_CATS_HOME,...EXPENSE_CATS_BIZ,...INCOME_CATS];
const DOMAINS=[{id:"home",label:"בית"},{id:"biz",label:"עסק"},{id:"gift",label:"מתנה"},{id:"foxy",label:"פוקסי"}];

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
  "דלק": { domain: "home", includes_vat: "כן", vat_deductible: "רכב" },
  "תחזוקת רכב": { domain: "home", includes_vat: "כן", vat_deductible: "רכב" },
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
  "מתנה": { domain: "gift", includes_vat: "לא", vat_deductible: "", income_source: "מתנה" },
  "החזרים": { domain: "biz", includes_vat: "לא", vat_deductible: "", income_source: "החזרים" },
  "העברות בין חשבונות": { domain: "home", includes_vat: "לא", vat_deductible: "", income_source: "העברה מנימשי" },
};
const INCOME_SOURCES=["בית ריק","בקליין","העברה מנימשי","הופעות","החזרים","הלוואה","הפקה","הפקה - אפיק","הקלטה","השכרת חלל","ייעוץ אומנותי - אפיק","ייעוץ אומנותי - נימשי","לייב סשן","מיקס","מיקסים","מתנה","פודקאסטים","צילום קורס","שוכרי משנה","תמלוגים","אחר"];
const INCOME_SOURCE_DEFAULTS = { "העברה מנימשי": { category: "העברות בין חשבונות", domain: "home", includes_vat: "לא", vat_deductible: "" }, "מתנה": { category: "מתנה", domain: "gift", includes_vat: "לא" }, "החזרים": { category: "החזרים", domain: "biz", includes_vat: "לא" } };
const PAY_METHODS=["אשראי","ביט","הוראת קבע","העברה","מזומן","פייבוקס","אחר"];
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
  "עמלת פעולה": "ריביות ועמלות", "דמי כרטיס": "ריביות ועמלות", "ריבית על מסגרת": "ריביות ועמלות", "ריבית בגין": "ריביות ועמלות",
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
  // החזרים
  "זיכוי בגין הטבה": "החזרים", "פרעון מוקדם": "החזרים",
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
  const fmtLocal = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  for (const r of recurring) {
    if (!r.is_active) continue;
    const endDate = r.end_date ? new Date(r.end_date) : defaultEnd;
    const skips = (r.skip_months || "").split(",").map(s => s.trim()).filter(Boolean);
    let d = new Date(now.getFullYear(), now.getMonth(), r.day_of_month || 1);
    if (d < now) d.setMonth(d.getMonth() + 1);
    while (d <= endDate) {
      const monthKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!skips.includes(monthKey)) {
        projections.push({
          _type: "recurring",
          _recurringId: r.id,
          _accountId: r.account_id || "biz",
          date: fmtLocal(d),
          description: r.description,
          amount: r.type === "expense" ? -Math.abs(r.amount) : Math.abs(r.amount),
          domain: r.domain || "",
          category: r.category || "",
          income_source: r.income_source || "",
          status: "עתידי",
        });
      }
      d = new Date(d.getFullYear(), d.getMonth() + 1, r.day_of_month || 1);
    }
  }
  return projections;
}

function findPotentialMatches(bankTxns, projections, meta) {
  const matches = [];
  const metaMap = {};
  meta.forEach(m => { metaMap[m.unique_id] = m; });
  const dismissed = JSON.parse(localStorage.getItem("princess_match_dismissed") || "{}");
  
  for (const proj of projections) {
    const projMonth = proj.date.slice(0, 7);
    const projAmt = Math.abs(proj.amount);
    const projDesc = (proj.description || "").toLowerCase().trim();
    
    // Skip if this recurring was dismissed for this month
    const monthDismissKey = `${proj._recurringId}_${projMonth}`;
    if (dismissed[monthDismissKey]) continue;
    
    let bestMatch = null;
    
    for (const bank of bankTxns) {
      const bankMonth = bank.activity_date?.slice(0, 7);
      if (bankMonth !== projMonth) continue;
      
      // Skip already categorized
      const m = metaMap[bank.unique_id];
      if (m && m.category) continue;
      
      const bankDesc = (bank.description || "").toLowerCase().trim();
      const bankAmt = Math.abs(bank.charged_amount);
      
      // Name matching: check if recurring name appears in bank description or vice versa
      const projWords = projDesc.split(/[\s—\-]+/).filter(w => w.length > 2);
      const nameMatch = projWords.some(w => bankDesc.includes(w)) || bankDesc.includes(projDesc);
      
      // Amount matching
      const amtDiff = Math.abs(bankAmt - projAmt);
      const amtMatch = amtDiff / Math.max(projAmt, 1) < 0.15 || amtDiff < 10;
      
      if (nameMatch && amtMatch) {
        // Strong match: name + amount
        bestMatch = { bank, proj, score: 2, dismissKey: monthDismissKey };
        break; // Perfect match, no need to look further
      } else if (nameMatch) {
        // Name matches but amount different — still suggest
        if (!bestMatch || bestMatch.score < 1.5) {
          bestMatch = { bank, proj, score: 1.5, dismissKey: monthDismissKey };
        }
      }
      // No name match = no suggestion (Netflix can't be Dropbox)
    }
    
    if (bestMatch) matches.push(bestMatch);
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
  const [f, setF] = useState({ date: new Date().toISOString().split("T")[0], description: "", amount: "", type: "expense", domain: "", category: "", notes: "", includes_vat: "", vat_deductible: "", payment_method: "", income_source: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const setCat = (cat) => { const d = CAT_DEFAULTS[cat]; setF(p => ({ ...p, category: cat, ...(d ? { domain: d.domain || p.domain, includes_vat: d.includes_vat || p.includes_vat, vat_deductible: d.vat_deductible || p.vat_deductible, income_source: d.income_source || p.income_source } : {}) })); };
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
        <div><label style={S.lbl}>אמצעי תשלום</label><select style={S.inp} value={f.payment_method} onChange={e => set("payment_method", e.target.value)}><option value="">—</option>{PAY_METHODS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        <div><label style={S.lbl}>כולל מע״מ</label><select style={S.inp} value={f.includes_vat} onChange={e => set("includes_vat", e.target.value)}><option value="">—</option><option value="כן">כן</option><option value="לא">לא</option></select></div>
        {f.includes_vat === "כן" && f.type === "expense" && <div><label style={S.lbl}>מוכר למע״מ</label><select style={S.inp} value={f.vat_deductible} onChange={e => set("vat_deductible", e.target.value)}><option value="">—</option><option value="כן">כן</option><option value="לא">לא</option><option value="רכב">רכב</option></select></div>}
        {f.type === "income" && <div><label style={S.lbl}>מקור הכנסה</label><select style={S.inp} value={f.income_source} onChange={e => { const v = e.target.value; set("income_source", v); const isd = INCOME_SOURCE_DEFAULTS[v]; if (isd) { if (isd.category) set("category", isd.category); if (isd.domain) set("domain", isd.domain); if (isd.includes_vat) set("includes_vat", isd.includes_vat); } }}><option value="">—</option>{INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>}
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
  const setCat = (cat) => { const d = CAT_DEFAULTS[cat]; setF(p => ({ ...p, category: cat, ...(d ? { domain: d.domain || p.domain, includes_vat: d.includes_vat || p.includes_vat, vat_deductible: d.vat_deductible || p.vat_deductible, income_source: d.income_source || p.income_source } : {}) })); };
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
        {f.type === "income" && <div style={S.full}><label style={S.lbl}>מקור הכנסה</label><select style={S.inp} value={f.income_source} onChange={e => { const v = e.target.value; set("income_source", v); const isd = INCOME_SOURCE_DEFAULTS[v]; if (isd) { if (isd.category) set("category", isd.category); if (isd.domain) set("domain", isd.domain); if (isd.includes_vat) set("includes_vat", isd.includes_vat); } }}><option value="">—</option>{INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>}
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

const ACCOUNT_CONFIGS = {
  biz: { label: "תזרים עסק", balanceKey: "princess_opening_balance", filter: t => t.company_id === "otsarHahayal" || t.company_id === "isracard" },
  afik: { label: "תזרים פוקסי", balanceKey: "princess_opening_balance_afik", filter: t => (t.company_id === "hapoalim" && t.account === "327754") || t.company_id === "max" },
  shared: { label: "תזרים משותף", balanceKey: "princess_opening_balance_shared", filter: t => t.company_id === "hapoalim" && t.account === "431928" },
  cash: { label: "תזרים מזומנים", balanceKey: "princess_opening_balance_cash", filter: () => false },
};

function CashflowView({ leads, accountId = "biz" }) {
  const acctCfg = ACCOUNT_CONFIGS[accountId] || ACCOUNT_CONFIGS.biz;
  const [txns, setTxns] = useState([]);
  const [meta, setMeta] = useState([]);
  const [manualTxns, setManualTxns] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(String(new Date().getFullYear()));
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
    const saved = localStorage.getItem(acctCfg.balanceKey);
    return saved ? Number(saved) : null;
  });
  const [balanceInput, setBalanceInput] = useState("");
  const [showBalanceEdit, setShowBalanceEdit] = useState(false);

  useEffect(() => {
    Promise.all([
      sbMoneyman("?order=activity_date.desc&limit=5000"),
      sb("transaction_meta", "GET", null, "?order=created_at.desc&limit=2000"),
      sb("manual_transactions", "GET", null, "?order=date.desc&limit=1000").catch(() => []),
      sb("recurring_transactions", "GET", null, "?order=created_at.desc&limit=200").catch(() => []),
    ]).then(([t, m, mt, rec]) => {
      setTxns((t || []).filter(acctCfg.filter));
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
    try { const status = accountId === "cash" ? "confirmed" : "planned"; const [r] = await sb("manual_transactions", "POST", { ...data, account_id: accountId, status }); setManualTxns(p => [r, ...p]); _showToast("✓ תנועה נוספה"); } catch (e) { _showToast("שגיאה: " + e.message, "error"); }
  };
  const deleteManual = async (id) => {
    try { await sb("manual_transactions", "DELETE", null, `?id=eq.${id}`); setManualTxns(p => p.filter(m => m.id !== id)); _showToast("✓ נמחק"); } catch (e) { _showToast("שגיאה", "error"); }
  };
  const deleteBankTxn = async (uid) => {
    try { await sbMoneymanWrite("DELETE", `?unique_id=eq.${encodeURIComponent(uid)}`); setTxns(p => p.filter(t => t.unique_id !== uid)); _showToast("✓ תנועת בנק נמחקה"); } catch (e) { _showToast("שגיאה: " + e.message, "error"); }
  };
  const updateManual = async (id, data) => {
    try {
      // Only send columns that exist in manual_transactions
      const safe = {};
      ["date","description","amount","type","domain","category","status","notes","includes_vat","vat_deductible","income_source","payment_method","account_id"].forEach(k => { if (data[k] !== undefined) safe[k] = data[k]; });
      const [r] = await sb("manual_transactions", "PATCH", safe, `?id=eq.${id}`);
      setManualTxns(p => p.map(m => m.id === id ? r : m));
      _showToast("✓ עודכן");
    } catch (e) { _showToast("שגיאה: " + e.message, "error"); }
  };
  const addRecurring = async (data) => {
    try { const [r] = await sb("recurring_transactions", "POST", { ...data, account_id: accountId }); setRecurring(p => [r, ...p]); _showToast("✓ תנועה קבועה נוספה"); } catch (e) { _showToast("שגיאה: " + e.message, "error"); }
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
  const projections = useMemo(() => generateRecurringProjections(recurring.filter(r => (r.account_id || "biz") === accountId)), [recurring, accountId]);
  const matchedManualIds = new Set(manualTxns.filter(m => m.status === "matched").map(m => m.id));

  // Detect credit card debit lines from bank (ישראכרט lump sum)
  const isCardDebitFn = (t) => {
    const desc = (t.description || "").toLowerCase();
    // Isracard debit from otsarHahayal
    if ((t.company_id === "otsarHahayal") &&
      (desc.includes("ישראכרט") || desc.includes("isracard") || desc.includes("כרטיס אשראי"))) return true;
    // Max debit from hapoalim
    if ((t.company_id === "hapoalim") &&
      (desc.includes("מקס") || desc.includes("max") || desc.includes("לאומי קארד") || desc.includes("כרטיס אשראי"))) return true;
    return false;
  };

  const autoPayMethod = (desc, companyId) => {
    if (companyId === "isracard" || companyId === "max") return "אשראי";
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
      const isCard = t.company_id === "isracard" || t.company_id === "max";
      const savedCat = m.category || "";
      const autoCat = !savedCat ? autoCategory(t.description) : "";
      const effectiveCat = savedCat || autoCat;
      const catDef = CAT_DEFAULTS[effectiveCat];
      const acctDomain = (t.company_id === "hapoalim" && t.account === "327754") ? "foxy" : (t.company_id === "hapoalim" && t.account === "431928") ? "home" : "";
      const autoDomain = m.domain || (catDef ? catDef.domain : "") || acctDomain;
      rows.push({
        _key: "bank_" + t.unique_id, _type: "bank", _uid: t.unique_id,
        _isCardDebit: cardDebit, _isCard: isCard,
        _isNonCashflow: isCard, // Only individual card-company transactions are detail
        date: t.activity_date, description: m.display_name || t.description, _origDesc: t.description, memo: t.memo,
        amount: t.charged_amount,
        domain: m.domain || autoDomain, category: effectiveCat,
        _autoCat: !savedCat && autoCat ? true : false,
        includes_vat: m.includes_vat || (catDef ? catDef.includes_vat : ""),
        vat_deductible: m.vat_deductible || (catDef ? catDef.vat_deductible : ""),
        payment_method: m.payment_method || autoPayMethod(t.description, t.company_id),
        status: m.status || "שולם/התקבל",
        linked_lead_id: m.linked_lead_id || null, income_source: m.income_source || (catDef ? catDef.income_source || "" : "")
      });
    });
    // Manual transactions (not matched) — filter by account
    manualTxns.filter(m => m.status !== "matched" && (m.account_id || "biz") === accountId).forEach(m => {
      rows.push({ _key: "manual_" + m.id, _type: "manual", _manualId: m.id, date: m.date, description: m.description, amount: m.type === "expense" ? -Math.abs(m.amount) : Math.abs(m.amount), domain: m.domain || "", category: m.category || "", status: m.status === "planned" ? "עתידי" : m.status === "confirmed" ? "שולם/התקבל" : m.status, linked_lead_id: m.linked_lead_id || null, notes: m.notes, income_source: m.income_source || "", payment_method: m.payment_method || "" });
    });
    // Recurring projections — filter by account
    const filteredProjections = projections.filter(p => (p._accountId || "biz") === accountId);
    // Recurring projections (only future months not covered by bank/manual)
    // Build a map of month → amounts already present (bank + manual)
    const existingByMonth = {};
    rows.forEach(r => {
      const m = r.date?.slice(0, 7);
      if (!m) return;
      if (!existingByMonth[m]) existingByMonth[m] = [];
      existingByMonth[m].push({ amount: r.amount, description: r.description, used: false });
    });
    filteredProjections.forEach(p => {
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
    const cardCompanies = [
      { id: "isracard", label: "ישראכרט" },
      { id: "max", label: "מקס" }
    ];
    const bankCardDebits = new Set(txns.filter(t => isCardDebitFn(t)).map(t => t.activity_date?.slice(0, 7) + "_" + (t.company_id === "otsarHahayal" ? "isracard" : "max")));
    cardCompanies.forEach(cc => {
      const cardByMonth = {};
      txns.filter(t => t.company_id === cc.id).forEach(t => {
        const raw = typeof t.raw === "string" ? JSON.parse(t.raw || "{}") : (t.raw || {});
        const chargeMonth = (raw.processedDate || t.activity_date || "").slice(0, 7);
        if (!chargeMonth) return;
        if (!cardByMonth[chargeMonth]) cardByMonth[chargeMonth] = 0;
        cardByMonth[chargeMonth] += Math.abs(t.charged_amount);
      });
      Object.entries(cardByMonth).forEach(([mon, total]) => {
        if (!bankCardDebits.has(mon + "_" + cc.id)) {
          rows.push({
            _key: `card_summary_${cc.id}_${mon}`, _type: "card_summary",
            _isCardSummary: true,
            date: mon + "-01",
            description: `💳 חיוב ${cc.label} צפוי — ${new Date(mon + "-01").toLocaleDateString("he-IL", { month: "long", year: "numeric" })}`,
            amount: -total,
            _cardTotal: total,
          });
        }
      });
    });

    // Sort ascending for running total calc
    rows.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    // Calc running total — forward from opening balance
    let running = currentBalance !== null ? currentBalance : 0;
    rows.forEach(r => {
      if (r._isNonCashflow) {
        r._running = null;
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

  const [inclFuture, setInclFuture] = useState(false);
  const NON_SUMMARY_CATS = new Set(["לא תזרימי", "העברות בין חשבונות"]);
  const actualTxns = filtered.filter(t => !t._isNonCashflow && !NON_SUMMARY_CATS.has(t.category) && t._type !== "recurring" && !(accountId !== "cash" && t._type === "manual" && t.status === "עתידי"));
  const allTxns = filtered.filter(t => !t._isNonCashflow && !NON_SUMMARY_CATS.has(t.category));
  const summaryTxns = inclFuture ? allTxns : actualTxns;
  const totalIncome = summaryTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpense = summaryTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // Potential matches for confirmation
  const potentialMatches = useMemo(() => findPotentialMatches(txns, projections, meta), [txns, projections, meta]);

  if (loading) return <div style={S.empty}>טוען תנועות...</div>;
  return (
    <div style={{ padding: "8px 0 20px" }}>
      {/* Current balance */}
      {(() => {
        const bankSum = accountId === "cash"
          ? unified.filter(t => t._type === "manual" && t.status !== "עתידי").reduce((s, t) => s + t.amount, 0)
          : unified.filter(t => !t._isNonCashflow && t._type === "bank").reduce((s, t) => s + t.amount, 0);
        const curBal = (currentBalance || 0) + bankSum;
        return <div style={{ ...S.statCard, borderRight: `3px solid ${accountId === "biz" ? "#10B981" : accountId === "afik" ? "#3B82F6" : "#8B5CF6"}`, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748B" }}>עו״ש נוכחי — {acctCfg.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: curBal >= 0 ? "#E2E8F0" : "#EF4444" }}>₪{curBal.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "left" }}>
              {currentBalance !== null ? (
                <span style={{ fontSize: 11, color: "#64748B", cursor: "pointer" }} onClick={() => setShowBalanceEdit(true)}>יתרת פתיחה: <span style={{ color: "#3B82F6" }}>₪{currentBalance.toLocaleString()}</span> ✎</span>
              ) : (
                <span style={{ fontSize: 11, color: "#F59E0B", cursor: "pointer" }} onClick={() => setShowBalanceEdit(true)}>⚠ הגדר יתרת פתיחה</span>
              )}
            </div>
          </div>
        </div>;
      })()}

      {/* Balance editor */}
      {showBalanceEdit && (
        <div style={{ ...S.statCard, marginBottom: 8, borderRight: "3px solid #3B82F6" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>יתרה לפני התנועה הראשונה:</span>
            <input style={{ ...S.inp, width: 120, padding: "4px 8px", fontSize: 13 }} type="number" value={balanceInput} onChange={e => setBalanceInput(e.target.value)} placeholder="למשל: 18916" dir="ltr" autoFocus onKeyDown={e => { if (e.key === "Enter" && balanceInput) { const val = Number(balanceInput); setCurrentBalance(val); localStorage.setItem(acctCfg.balanceKey, String(val)); setShowBalanceEdit(false); setBalanceInput(""); _showToast("✓ יתרה עודכנה"); }}} />
            <button style={{ ...S.btn1, padding: "4px 12px", fontSize: 12 }} onClick={() => { if (!balanceInput) return; const val = Number(balanceInput); setCurrentBalance(val); localStorage.setItem(acctCfg.balanceKey, String(val)); setShowBalanceEdit(false); setBalanceInput(""); _showToast("✓ יתרה עודכנה"); }}>שמור</button>
            <button style={{ ...S.btn2, padding: "4px 12px", fontSize: 12 }} onClick={() => setShowBalanceEdit(false)}>ביטול</button>
          </div>
        </div>
      )}

      {/* Income/Expense/Balance — single line */}
      <div style={{ display: "flex", gap: 16, padding: "6px 14px", marginBottom: 8, fontSize: 13 }}>
        <span>הכנסות: <strong style={{ color: "#10B981" }}>₪{totalIncome.toLocaleString()}</strong></span>
        <span>הוצאות: <strong style={{ color: "#EF4444" }}>₪{totalExpense.toLocaleString()}</strong></span>
        <span>מאזן: <strong style={{ color: balance >= 0 ? "#10B981" : "#EF4444" }}>₪{balance.toLocaleString()}</strong></span>
      </div>

      {/* Match alerts */}
      {potentialMatches.length > 0 && !month && (
        <div style={{ ...S.statCard, marginBottom: 8, borderRight: "3px solid #F59E0B" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", marginBottom: 4 }}>⚡ תנועות להתאמה ({potentialMatches.length})</div>
          {potentialMatches.map((m, i) => (
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
      <RecurringManager recurring={recurring.filter(r => (r.account_id || "biz") === accountId)} onAdd={addRecurring} onUpdate={updateRecurring} onDelete={deleteRecurring} onAction={(a) => setRecurringAction(a)} />

      {/* Date filters — month buttons with shift multi-select */}
      <div style={{ display: "flex", gap: 3, marginBottom: 4, flexWrap: "wrap", alignItems: "center" }}>
        {(() => {
          const curYear = String(new Date().getFullYear());
          const selectedMonths = month.includes(",") ? month.split(",") : month.length === 7 ? [month] : [];
          const toggleMonth = (m, shiftKey) => {
            if (shiftKey) {
              const cur = selectedMonths.includes(m) ? selectedMonths.filter(x => x !== m) : [...selectedMonths, m];
              setMonth(cur.length ? cur.join(",") : curYear);
            } else {
              setMonth(selectedMonths.length === 1 && selectedMonths[0] === m ? curYear : m);
            }
          };
          return <>
            <button style={!month ? S.filterOn : S.filterOff} onClick={() => setMonth("")}>הכל</button>
            <button style={month === curYear ? { ...S.filterOn, background: "#3B82F6" } : S.filterOff} onClick={() => setMonth(curYear)}>שנה נוכחית</button>
            <span style={{ width: 1, height: 16, background: "#334155", margin: "0 2px" }} />
            {Array.from({ length: 12 }, (_, i) => {
              const m = `${curYear}-${String(i + 1).padStart(2, "0")}`;
              const label = new Date(m + "-01").toLocaleDateString("he-IL", { month: "short" });
              const isActive = selectedMonths.includes(m);
              return <button key={m} style={isActive ? { ...S.filterOn, background: "#3B82F6" } : S.filterOff} onClick={(e) => toggleMonth(m, e.shiftKey)}>{label}</button>;
            })}
            {selectedMonths.length > 1 && <span style={{ fontSize: 10, color: "#475569" }}>({selectedMonths.length} נבחרו)</span>}
          </>;
        })()}
      </div>
      <div style={{ fontSize: 10, color: "#334155", marginBottom: 6 }}>Shift+לחיצה לבחירת כמה חודשים</div>

      {/* Type/category filters */}
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
        {(accountId === "afik" || accountId === "shared") && <><input type="file" id="xlUpload" accept=".xlsx,.xls" style={{ display: "none" }} onChange={async (e) => {
          const file = e.target.files[0]; if (!file) return;
          _showToast("📤 מייבא...");
          try {
            const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            const acctRow = String(rows[3]?.[0] || "");
            const parts = acctRow.split("-");
            const acctNum = parts.length >= 3 ? parts[2]?.split(/\s/)[0] : "";
            const expectedAcct = accountId === "afik" ? "327754" : "431928";
            if (acctNum && acctNum !== expectedAcct) { _showToast(`חשבון לא תואם: ${acctNum} (צפוי ${expectedAcct})`, "error"); e.target.value = ""; return; }
            const inserts = [];
            for (let i = 5; i < rows.length; i++) {
              const r = rows[i]; if (!r[0]) continue;
              const dateRaw = r[0]; let dateStr;
              if (typeof dateRaw === "number") { const d = new Date((dateRaw - 25569) * 86400000); dateStr = d.toISOString().slice(0, 10); }
              else { const p = String(dateRaw).split(/[\/\.]/); dateStr = `${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`; }
              const action = String(r[1] || ""); const details = String(r[2] || ""); const ref = String(r[3] || "");
              const debit = Number(r[4]) || 0; const credit = Number(r[5]) || 0;
              const amount = credit - debit;
              const beneficiary = String(r[8] || ""); const purpose = String(r[9] || "");
              let desc = action; let memo = details !== "undefined" && details !== "nan" ? details : "";
              if (purpose && purpose !== "undefined") memo = purpose;
              if (beneficiary && beneficiary !== "undefined" && !desc.includes(beneficiary)) desc = `${action} - ${beneficiary}`;
              const vdateRaw = r[7] || dateRaw; let vdate;
              if (typeof vdateRaw === "number") { const d = new Date((vdateRaw - 25569) * 86400000); vdate = d.toISOString().slice(0, 10); }
              else { const p = String(vdateRaw).split(/[\/\.]/); vdate = `${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`; }
              const uidAmt = amount % 1 === 0 ? amount.toFixed(1) : String(amount);
              const uid = `${dateStr}_hapoalim_${expectedAcct}_${uidAmt}_${ref}`;
              inserts.push({ unique_id: uid, company_id: "hapoalim", account: expectedAcct, description: desc.trim(), memo: memo.trim(), original_currency: "ILS", original_amount: amount, charged_currency: "ILS", charged_amount: amount, activity_date: dateStr, process_date: vdate, status: "completed", scraped_by: "csv_import" });
            }
            if (inserts.length === 0) { _showToast("לא נמצאו תנועות בקובץ", "error"); e.target.value = ""; return; }
            // Count before
            const beforeTxns = await sbMoneyman(`?company_id=eq.hapoalim&account=eq.${expectedAcct}&select=unique_id&limit=5000`);
            const beforeCount = (beforeTxns || []).length;
            // Bulk insert with duplicate ignore
            const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?on_conflict=unique_id`, {
              method: "POST",
              headers: { ...hdrs, "Accept-Profile": "moneyman", "Content-Profile": "moneyman", "Prefer": "resolution=ignore-duplicates" },
              body: JSON.stringify(inserts)
            });
            if (!res.ok) { const err = await res.text(); _showToast("שגיאה: " + err.slice(0, 100), "error"); e.target.value = ""; return; }
            // Count after
            const freshTxns = await sbMoneyman("?order=activity_date.desc&limit=5000");
            const afterFiltered = (freshTxns || []).filter(acctCfg.filter);
            const newCount = afterFiltered.length - beforeCount;
            setTxns(afterFiltered);
            _showToast(`✓ ${newCount > 0 ? newCount + " תנועות חדשות נוספו" : "אין תנועות חדשות"}${newCount < inserts.length ? ` (${inserts.length - newCount} כפילויות דולגו)` : ""}`);
          } catch (err) {
            _showToast("שגיאה: " + err.message, "error");
          }
          e.target.value = "";
        }} /><button style={{ ...S.btn2, padding: "5px 12px", fontSize: 12 }} onClick={() => document.getElementById("xlUpload").click()}>📤 ייבוא אקסל</button></>}
      </div>

      {/* Transactions — Grid layout */}
      <div>
        {/* Column headers — sticky */}
        <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 35px 90px 60px 45px 20px 50px 85px 75px 30px", gap: 4, padding: "8px 14px", fontSize: 10, color: "#475569", marginBottom: 4, position: "sticky", top: 105, background: "#0B1120", zIndex: 5, borderBottom: "1px solid #1E293B" }}>
          <span>תאריך</span><span>תיאור</span><span>תחום</span><span>קטגוריה</span><span>מקור</span><span>תשלום</span><span>מ</span><span>סטטוס</span><span style={{ textAlign: "left", direction: "ltr" }}>סכום</span><span style={{ textAlign: "left", direction: "ltr" }}>יתרה</span><span></span>
        </div>
        {(() => {
          const seenMonths = new Set();
          const catColors = { "מזון": "#F59E0B", "אוכל בחוץ": "#F59E0B", "שכד אולפן": "#3B82F6", "שכד": "#3B82F6", "ספקים": "#06B6D4", "ציוד": "#06B6D4", "דלק": "#EF4444", "תחזוקת רכב": "#EF4444", "תוכנות": "#8B5CF6", "שיווק": "#EC4899", "הכנסה": "#10B981", "הכנסה בחוב": "#F59E0B", "מתנה": "#EC4899", "החזרים": "#06B6D4", "טיפול": "#8B5CF6", "ביטוחים": "#64748B", "חשבונות בית": "#64748B", "חשבונות עסק": "#64748B", "הלוואות וקרנות": "#64748B", "פארם": "#F59E0B", "כושר": "#10B981", "תחבצ וחניונים": "#06B6D4", "מעמ ומיסים": "#EF4444", "העברות לאפיק/משותף": "#EC4899", "משתנות": "#64748B", "הורדת אשראי": "#F59E0B", "ריביות ועמלות": "#64748B" };
          return filtered.flatMap((t, i) => {
            const rowMonth = t.date?.slice(0, 7) || "";
            const isFirstOfMonth = rowMonth && !seenMonths.has(rowMonth);
            if (rowMonth) seenMonths.add(rowMonth);
            const isHidden = hiddenMonths.includes(rowMonth);
            const rows = [];

            // Month header
            if (isFirstOfMonth && (!month || month.length === 4)) {
              const monthLabel = new Date(rowMonth + "-01").toLocaleDateString("he-IL", { month: "long", year: "numeric" });
              const monthTxns = filtered.filter(x => x.date?.startsWith(rowMonth) && !x._isNonCashflow);
              const mIncome = monthTxns.filter(x => x.amount > 0).reduce((s, x) => s + x.amount, 0);
              const mExpense = monthTxns.filter(x => x.amount < 0).reduce((s, x) => s + Math.abs(x.amount), 0);
              rows.push(
                <div key={"month_" + rowMonth} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#111827", borderRadius: 8, marginBottom: 6, marginTop: i > 0 ? 8 : 0, cursor: "pointer", borderBottom: "2px solid #1E293B" }} onClick={() => toggleMonth(rowMonth)}>
                  <span style={{ fontSize: 11, color: "#64748B", transition: "transform 0.2s", transform: isHidden ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{monthLabel}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>+₪{mIncome.toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 600 }}>-₪{mExpense.toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: mIncome - mExpense >= 0 ? "#10B981" : "#EF4444", fontWeight: 600 }}>= ₪{(mIncome - mExpense).toLocaleString()}</span>
                </div>
              );
            }

            if (isHidden && (!month || month.length === 4)) return rows;

            const isBank = t._type === "bank";
            const isManual = t._type === "manual";
            const isRecurring = t._type === "recurring";
            const isCardSummary = t._isCardSummary;
            const isCard = t._isCard;
            const isNonCashflow = t._isNonCashflow;
            const isEd = editId === t._key;
            const linkedLead = t.linked_lead_id ? leads.find(l => l.id === t.linked_lead_id) : null;

            const borderColor = isNonCashflow ? "#334155" : isRecurring ? "#64748B" : isManual ? "#8B5CF6" : isCardSummary ? "#F59E0B" : t.amount > 0 ? "#10B981" : "#EF4444";
            const catColor = catColors[t.category] || "#64748B";
            const vatLabel = t.includes_vat === "כן" ? (t.vat_deductible === "כן" ? "✓" : t.vat_deductible === "רכב" ? "🚗" : t.amount > 0 ? "✓" : "✗") : t.includes_vat === "לא" ? "—" : "";
            const icon = isRecurring ? "🔄 " : isManual ? "✏️ " : isCard || isCardSummary ? "💳 " : "";
            const gridCols = "50px 1fr 35px 90px 60px 45px 20px 50px 85px 75px 30px";

            // Card summary
            if (isCardSummary) {
              rows.push(
                <div key={t._key} style={{ display: "grid", gridTemplateColumns: gridCols, gap: 4, alignItems: "center", padding: "10px 14px", background: "#111827", borderRadius: 10, marginBottom: 4, borderRight: "3px solid #F59E0B" }}>
                  <span style={{ fontSize: 12, color: "#64748B" }}>💳 {t.date ? fmtDate(t.date) : ""}</span>
                  <span style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</span>
                  <span></span>
                  <span style={{ fontSize: 10, background: "#F59E0B20", color: "#F59E0B", padding: "1px 6px", borderRadius: 99, textAlign: "center" }}>הורדת אשראי</span>
                  <span></span><span></span><span></span><span></span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#EF4444", direction: "ltr", textAlign: "left" }}>-₪{t._cardTotal.toLocaleString()}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t._running !== null ? "#E2E8F0" : "#334155", direction: "ltr", textAlign: "left" }}>{t._running !== null ? `₪${t._running.toLocaleString()}` : "—"}</span>
                  <span></span>
                </div>
              );
              return rows;
            }

            // Edit mode — bank
            if (isEd && isBank) {
              rows.push(
                <div key={t._key} style={{ padding: "10px 14px", background: "#1E293B", borderRadius: 10, marginBottom: 4, borderRight: "3px solid #3B82F6" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "#64748B" }}>{t.date ? fmtDate(t.date) : ""}</span>
                    <input style={{ ...S.inp, padding: "2px 6px", fontSize: 12, flex: 1, minWidth: 120 }} value={ef.display_name} onChange={e => setEf(p => ({ ...p, display_name: e.target.value }))} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: t.amount > 0 ? "#10B981" : "#EF4444", direction: "ltr" }}>₪{Math.abs(t.amount).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                    <select style={{ ...S.inp, padding: "2px 4px", fontSize: 11, width: 70 }} value={ef.domain || ""} onChange={e => setEf(p => ({ ...p, domain: e.target.value }))}><option value="">תחום</option>{DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
                    <select style={{ ...S.inp, padding: "2px 4px", fontSize: 11, width: 100 }} value={ef.category || ""} onChange={e => { const cat = e.target.value; const d = CAT_DEFAULTS[cat]; setEf(p => ({ ...p, category: cat, ...(d ? { domain: d.domain || p.domain, includes_vat: d.includes_vat || p.includes_vat, vat_deductible: d.vat_deductible || p.vat_deductible, income_source: d.income_source || p.income_source } : {}) })); }}><option value="">קטגוריה</option>{(t.amount > 0 ? INCOME_CATS : [...EXPENSE_CATS_HOME, ...EXPENSE_CATS_BIZ]).map(c => <option key={c} value={c}>{c}</option>)}</select>
                    {t.amount > 0 && <select style={{ ...S.inp, padding: "2px 4px", fontSize: 10, width: 80 }} value={ef.income_source || ""} onChange={e => { const v = e.target.value; const isd = INCOME_SOURCE_DEFAULTS[v]; setEf(p => ({ ...p, income_source: v, ...(isd ? { category: isd.category || p.category, domain: isd.domain || p.domain, includes_vat: isd.includes_vat || p.includes_vat } : {}) })); }}><option value="">מקור</option>{INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select>}
                    <select style={{ ...S.inp, padding: "2px 4px", fontSize: 11, width: 70 }} value={ef.payment_method || ""} onChange={e => setEf(p => ({ ...p, payment_method: e.target.value }))}><option value="">תשלום</option>{PAY_METHODS.map(p => <option key={p} value={p}>{p}</option>)}</select>
                    <select style={{ ...S.inp, padding: "2px 4px", fontSize: 10, width: 80 }} value={ef.includes_vat || ""} onChange={e => setEf(p => ({ ...p, includes_vat: e.target.value }))}><option value="">מע״מ?</option><option value="כן">כולל</option><option value="לא">ללא</option></select>
                    {ef.includes_vat === "כן" && t.amount < 0 && <select style={{ ...S.inp, padding: "2px 4px", fontSize: 10, width: 70 }} value={ef.vat_deductible || ""} onChange={e => setEf(p => ({ ...p, vat_deductible: e.target.value }))}><option value="">מוכר?</option><option value="כן">כן</option><option value="לא">לא</option><option value="רכב">רכב</option></select>}
                    <span style={{ flex: 1 }} />
                    <button onClick={() => saveMeta(t._uid, ef)} style={{ ...S.iconBtn, color: "#10B981" }}>{I.check}</button>
                    {t.amount > 0 && <button onClick={() => setShowLinkModal(t._key)} style={{ ...S.iconBtn, color: "#3B82F6" }} title="קשר ללקוח">{I.link}</button>}
                    <button onClick={() => setMakeRecurring({ description: t.description, amount: Math.abs(t.amount), type: t.amount > 0 ? "income" : "expense", day_of_month: t.date ? parseInt(t.date.split("-")[2]) : 1, domain: ef.domain || "", category: ef.category || "" })} style={{ ...S.iconBtn, color: "#8B5CF6" }} title="הפוך לקבועה">🔄</button>
                    <button onClick={() => { if (confirm("למחוק תנועת בנק?")) deleteBankTxn(t._uid); setEditId(null); }} style={{ ...S.iconBtn, color: "#EF4444" }} title="מחק תנועה">{I.trash}</button>
                    <button onClick={() => setEditId(null)} style={{ ...S.iconBtn, color: "#64748B" }}>{I.x}</button>
                  </div>
                </div>
              );
              return rows;
            }

            // Edit mode — manual
            if (isEd && isManual) {
              rows.push(
                <div key={t._key} style={{ padding: "10px 14px", background: "#1E293B", borderRadius: 10, marginBottom: 4, borderRight: "3px solid #8B5CF6" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <input style={{ ...S.inp, padding: "2px 6px", fontSize: 12, width: 100 }} type="date" value={ef.date || ""} onChange={e => setEf(p => ({ ...p, date: e.target.value }))} dir="ltr" />
                    <input style={{ ...S.inp, padding: "2px 6px", fontSize: 12, flex: 1, minWidth: 120 }} value={ef.display_name} onChange={e => setEf(p => ({ ...p, display_name: e.target.value }))} />
                    <input style={{ ...S.inp, padding: "2px 6px", fontSize: 12, width: 80 }} type="number" value={ef.amount || ""} onChange={e => setEf(p => ({ ...p, amount: e.target.value }))} dir="ltr" />
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                    <select style={{ ...S.inp, padding: "2px 4px", fontSize: 11, width: 70 }} value={ef.domain || ""} onChange={e => setEf(p => ({ ...p, domain: e.target.value }))}><option value="">תחום</option>{DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
                    <select style={{ ...S.inp, padding: "2px 4px", fontSize: 11, width: 100 }} value={ef.category || ""} onChange={e => { const cat = e.target.value; const d = CAT_DEFAULTS[cat]; setEf(p => ({ ...p, category: cat, ...(d ? { domain: d.domain || p.domain, includes_vat: d.includes_vat || p.includes_vat, vat_deductible: d.vat_deductible || p.vat_deductible, income_source: d.income_source || p.income_source } : {}) })); }}><option value="">קטגוריה</option>{(t.amount > 0 ? INCOME_CATS : [...EXPENSE_CATS_HOME, ...EXPENSE_CATS_BIZ]).map(c => <option key={c} value={c}>{c}</option>)}</select>
                    {t.amount > 0 && <select style={{ ...S.inp, padding: "2px 4px", fontSize: 10, width: 80 }} value={ef.income_source || ""} onChange={e => { const v = e.target.value; const isd = INCOME_SOURCE_DEFAULTS[v]; setEf(p => ({ ...p, income_source: v, ...(isd ? { category: isd.category || p.category, domain: isd.domain || p.domain, includes_vat: isd.includes_vat || p.includes_vat } : {}) })); }}><option value="">מקור</option>{INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select>}
                    <select style={{ ...S.inp, padding: "2px 4px", fontSize: 11, width: 70 }} value={ef.payment_method || ""} onChange={e => setEf(p => ({ ...p, payment_method: e.target.value }))}><option value="">תשלום</option>{PAY_METHODS.map(p => <option key={p} value={p}>{p}</option>)}</select>
                    <select style={{ ...S.inp, padding: "2px 4px", fontSize: 11, width: 80 }} value={ef.status || ""} onChange={e => setEf(p => ({ ...p, status: e.target.value }))}>{TXN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <span style={{ flex: 1 }} />
                    <button onClick={() => { const statusMap = {"עתידי":"planned","שולם/התקבל":"confirmed","בחוב":"debt"}; updateManual(t._manualId, { date: ef.date, description: ef.display_name, amount: Number(ef.amount), domain: ef.domain, category: ef.category, payment_method: ef.payment_method || "", status: statusMap[ef.status] || ef.status, income_source: ef.income_source || "" }); setEditId(null); }} style={{ ...S.iconBtn, color: "#10B981" }}>{I.check}</button>
                    <button onClick={() => { if (confirm("למחוק?")) deleteManual(t._manualId); }} style={{ ...S.iconBtn, color: "#64748B" }}>{I.trash}</button>
                    <button onClick={() => setEditId(null)} style={{ ...S.iconBtn, color: "#64748B" }}>{I.x}</button>
                  </div>
                </div>
              );
              return rows;
            }

            // Normal row — grid
            rows.push(
              <div key={t._key} style={{
                display: "grid", gridTemplateColumns: gridCols,
                gap: 4, alignItems: "center", padding: "10px 14px",
                background: "#111827", borderRadius: 10, marginBottom: 4,
                borderRight: `3px solid ${borderColor}`,
                cursor: (isBank || isManual) ? "pointer" : undefined
              }} onClick={isBank ? () => { setEditId(t._key); const m = getMeta(t._uid); setEf({ display_name: m.display_name || t.description, domain: m.domain || (t.amount > 0 ? "biz" : ""), category: m.category || "", payment_method: m.payment_method || "", status: m.status || "שולם/התקבל", income_source: m.income_source || "", includes_vat: m.includes_vat || "", vat_deductible: m.vat_deductible || "" }); } : isManual ? () => { setEditId(t._key); setEf({ date: t.date || "", display_name: t.description || "", amount: String(Math.abs(t.amount) || ""), domain: t.domain || "", category: t.category || "", payment_method: t.payment_method || "", status: t.status || "עתידי", income_source: t.income_source || "" }); } : undefined}>
                <span style={{ fontSize: 12, color: "#64748B", overflow: "hidden", whiteSpace: "nowrap" }}>{icon}{t.date ? fmtDate(t.date) : ""}</span>
                <span style={{ fontSize: 12, color: "#E2E8F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.description}
                  {t.memo && <span style={{ color: "#475569", fontSize: 10 }}> ({t.memo})</span>}
                  {linkedLead && <span style={{ color: "#3B82F6", fontSize: 10 }}> ← {linkedLead.name}</span>}
                  {isNonCashflow && <span style={{ color: "#64748B", fontSize: 9 }}> (פירוט)</span>}
                </span>
                <span style={{ fontSize: 10, color: "#64748B" }}>{t.domain ? DOMAINS.find(d => d.id === t.domain)?.label : ""}</span>
                {t.category ? <span style={{ fontSize: 10, background: catColor + "20", color: catColor, padding: "1px 6px", borderRadius: 99, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.category}{t._autoCat ? "⚡" : ""}</span> : <span style={{ fontSize: 10, color: "#EF4444", padding: "1px 6px", borderRadius: 99, border: "1px dashed #EF444440", textAlign: "center" }}>—</span>}
                <span style={{ fontSize: 10, color: "#3B82F6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.income_source || ""}</span>
                <span style={{ fontSize: 10, color: "#475569", overflow: "hidden", whiteSpace: "nowrap" }}>{t.payment_method || ""}</span>
                <span style={{ fontSize: 10, color: vatLabel === "✓" || vatLabel === "🚗" ? "#10B981" : vatLabel === "✗" ? "#EF4444" : "#475569" }}>{vatLabel}</span>
                <span style={{ fontSize: 10, color: t.status === "בחוב" ? "#F59E0B" : t.status === "עתידי" ? "#3B82F6" : "#475569" }}>{t.status || ""}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: t.amount > 0 ? "#10B981" : "#EF4444", direction: "ltr", textAlign: "left" }}>{t.amount > 0 ? "+" : "-"}₪{Math.abs(t.amount).toLocaleString()}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: t._running === null ? "#334155" : "#E2E8F0", direction: "ltr", textAlign: "left" }}>{t._running !== null ? `₪${t._running.toLocaleString()}` : "—"}</span>
                <span style={{ display: "flex", gap: 1, fontSize: 10 }}>
                  {isRecurring && <><span onClick={(e) => { e.stopPropagation(); const r = recurring.find(x => x.id === t._recurringId); if (r) setEditRecurringItem(r); }} style={{ color: "#64748B", cursor: "pointer" }}>✎</span><span onClick={(e) => { e.stopPropagation(); setRecurringAction({ recurringId: t._recurringId, month: t.date?.slice(0, 7), description: t.description }); }} style={{ color: "#F59E0B", cursor: "pointer" }}>⏸</span></>}
                  {isManual && !isEd && <span onClick={(e) => { e.stopPropagation(); if (confirm("למחוק?")) deleteManual(t._manualId); }} style={{ color: "#64748B", cursor: "pointer" }}>🗑</span>}
                  {isBank && !isNonCashflow && !isEd && <span style={{ color: t.category && !t._autoCat ? "#10B981" : "#64748B" }}>{t.category && !t._autoCat ? "✓" : "✎"}</span>}
                </span>
              </div>
            );
            return rows;
          });
        })()}
      </div>
      {filtered.length === 0 && <p style={S.empty}>אין תנועות</p>}

      {showManualForm && <ManualTxnForm onSave={addManual} onClose={() => setShowManualForm(false)} />}
      {showLinkModal && <LinkLeadModal leads={leads} onSelect={(leadId) => { const t = filtered.find(x => x._key === showLinkModal); if (t) linkToLead(t._uid, leadId); setShowLinkModal(null); }} onClose={() => setShowLinkModal(null)} />}
      {matchConfirm && (
        <Modal onClose={() => setMatchConfirm(null)}>
          <div style={S.mHead}><h2 style={S.mTitle}>אישור התאמה</h2><button style={S.iconBtn} onClick={() => setMatchConfirm(null)}>{I.x}</button></div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <p style={{ marginBottom: 8 }}>תנועה קבועה: <strong>{matchConfirm.proj.description}</strong> (₪{Math.abs(matchConfirm.proj.amount).toLocaleString()})</p>
            <p style={{ marginBottom: 8 }}>תנועת בנק: <strong>{matchConfirm.bank.description}</strong> (₪{Math.abs(matchConfirm.bank.charged_amount).toLocaleString()})</p>
            <p style={{ fontSize: 11, color: "#64748B" }}>{matchConfirm.bank.activity_date}</p>
          </div>
          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>האם תנועת הבנק היא התנועה הקבועה?</p>
          <div style={S.mFoot}>
            <button style={S.btn2} onClick={() => {
              // Mark as not-match so it won't show again
              const dismissed = JSON.parse(localStorage.getItem("princess_match_dismissed") || "{}");
              if (matchConfirm.dismissKey) dismissed[matchConfirm.dismissKey] = true;
              localStorage.setItem("princess_match_dismissed", JSON.stringify(dismissed));
              _showToast("✓ סומן כלא תואם");
              setMatchConfirm(null);
            }}>לא, תנועה אחרת</button>
            <button style={S.btn1} onClick={async () => {
              // Save recurring's category/domain/display_name to bank meta
              const proj = matchConfirm.proj;
              const r = recurring.find(x => x.id === proj._recurringId);
              const metaUpdate = {
                category: r?.category || proj.category || "",
                domain: r?.domain || proj.domain || "",
                display_name: proj.description,
                income_source: r?.income_source || proj.income_source || "",
                includes_vat: r?.includes_vat || "",
                vat_deductible: r?.vat_deductible || "",
              };
              await saveMeta(matchConfirm.bank.unique_id, metaUpdate);
              _showToast("✓ הותאם — תנועת הבנק סווגה");
              setMatchConfirm(null);
            }}>כן, זו התנועה</button>
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
  const [recurringAll, setRecurringAll] = useState([]);
  const [manualAll, setManualAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dashMonths, setDashMonths] = useState(() => {
    const now = new Date();
    return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`];
  });
  const [dashAcct, setDashAcct] = useState("all");
  const [barHover, setBarHover] = useState(null);
  const [pieHover, setPieHover] = useState(null);
  const [showFuture, setShowFuture] = useState(false);

  useEffect(() => {
    Promise.all([
      sbMoneyman("?order=activity_date.desc&limit=5000"),
      sb("transaction_meta", "GET", null, "?order=created_at.desc&limit=2000"),
      sb("recurring_transactions", "GET", null, "?is_active=eq.true&limit=200").catch(() => []),
      sb("manual_transactions", "GET", null, "?order=date.desc&limit=500").catch(() => []),
    ]).then(([t, m, rec, man]) => { setTxns(t || []); setMeta(m || []); setRecurringAll(rec || []); setManualAll(man || []); setLoading(false); }).catch(() => setLoading(false));
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
      income_source: m.income_source || (catDef ? catDef.income_source || "" : ""),
      _uid: t.unique_id
    };
  }), [txns, meta, learnedCats]);

  // Account filter
  const acctFiltered = useMemo(() => {
    if (dashAcct === "all") return merged;
    if (dashAcct === "all_no_cash") return merged.filter(t => (t.account_id || "") !== "cash");
    if (dashAcct === "cash") return []; // cash has no bank transactions
    const cfg = ACCOUNT_CONFIGS[dashAcct];
    return cfg ? merged.filter(cfg.filter) : merged;
  }, [merged, dashAcct]);

  // Include cash manual transactions in dashboard
  const cashManualMerged = useMemo(() => {
    if (dashAcct === "all_no_cash") return [];
    const cashManual = (dashAcct === "all" || dashAcct === "cash") ? manualAll.filter(m => (m.account_id || "biz") === "cash") : [];
    return cashManual.map(m => ({
      activity_date: m.date, charged_amount: m.type === "expense" ? -Math.abs(m.amount) : Math.abs(m.amount),
      category: m.category || "", domain: m.domain || "", income_source: m.income_source || "",
      includes_vat: "לא", vat_deductible: "", company_id: "cash", account: "cash"
    }));
  }, [manualAll, dashAcct]);

  // Year + month filter
  const allForYear = [...acctFiltered, ...cashManualMerged];
  const yearTxns = allForYear.filter(t => {
    if (!t.activity_date?.startsWith(String(year))) return false;
    if (dashMonths.length > 0) {
      if (!dashMonths.some(m => t.activity_date?.startsWith(m))) return false;
    }
    return true;
  });

  // Category sets
  const EXCLUDE_EXPENSE_CATS = new Set(["הורדת אשראי", "לא תזרימי"]);
  const EXCLUDE_INCOME_CATS = new Set(["העברות בין חשבונות", "לא תזרימי"]);
  const EXPENSE_ONLY_CATS = new Set([...EXPENSE_CATS_HOME, ...EXPENSE_CATS_BIZ]);
  const INCOME_ONLY_CATS = new Set(INCOME_CATS);
  const HOME_CATS = new Set(EXPENSE_CATS_HOME);
  const BIZ_CATS = new Set(EXPENSE_CATS_BIZ);

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const months = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, "0")}`;
      months[key] = { income: 0, expense: 0 };
    }
    acctFiltered.filter(t => t.activity_date?.startsWith(String(year))).forEach(t => {
      const key = t.activity_date?.slice(0, 7);
      if (!key || !months[key]) return;
      if (EXCLUDE_EXPENSE_CATS.has(t.category)) return;
      if (t.company_id === "otsarHahayal" && (t.description || "").includes("ישראכרט")) return;
      if (t.charged_amount > 0) months[key].income += t.charged_amount;
      else months[key].expense += Math.abs(t.charged_amount);
    });
    return Object.entries(months).map(([k, v]) => ({ month: k, ...v }));
  }, [acctFiltered, year]);

  // Expenses
  const realExpenseTxns = yearTxns.filter(t =>
    t.charged_amount < 0 &&
    !INCOME_ONLY_CATS.has(t.category) &&
    !EXCLUDE_EXPENSE_CATS.has(t.category) &&
    !(t.company_id === "otsarHahayal" && (t.description || "").includes("ישראכרט"))
  );

  const expenseHome = useMemo(() => {
    const cats = {};
    realExpenseTxns.filter(t => t.domain === "home" || HOME_CATS.has(t.category)).forEach(t => {
      const c = t.category || "ללא קטגוריה";
      cats[c] = (cats[c] || 0) + Math.abs(t.charged_amount);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [realExpenseTxns]);

  const expenseBiz = useMemo(() => {
    const cats = {};
    realExpenseTxns.filter(t => t.domain === "biz" || BIZ_CATS.has(t.category)).forEach(t => {
      const c = t.category || "ללא קטגוריה";
      cats[c] = (cats[c] || 0) + Math.abs(t.charged_amount);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [realExpenseTxns]);

  const expenseByCat = useMemo(() => {
    const cats = {};
    realExpenseTxns.forEach(t => {
      const c = t.category || "ללא קטגוריה";
      cats[c] = (cats[c] || 0) + Math.abs(t.charged_amount);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [realExpenseTxns]);

  const incomeByCat = useMemo(() => {
    const cats = {};
    yearTxns.filter(t => t.charged_amount > 0 && !EXCLUDE_INCOME_CATS.has(t.category)).forEach(t => {
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

  const incomeFoxy = useMemo(() => {
    const cats = {};
    yearTxns.filter(t => t.charged_amount > 0 && (t.domain === "foxy" || (t.company_id === "hapoalim" && t.account === "327754"))).forEach(t => {
      let label = t.income_source || t.category || "ללא מקור";
      cats[label] = (cats[label] || 0) + t.charged_amount;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [yearTxns]);
  const totalIncomeFoxy = incomeFoxy.reduce((s, [, v]) => s + v, 0);

  const PIE_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#F97316", "#84CC16", "#6366F1"];

  const totalExpense = expenseByCat.reduce((s, [, v]) => s + v, 0);
  const totalExpenseHome = expenseHome.reduce((s, [, v]) => s + v, 0);
  const totalExpenseBiz = expenseBiz.reduce((s, [, v]) => s + v, 0);
  const totalIncome = incomeByCat.reduce((s, [, v]) => s + v, 0);

  // VAT
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

  // Pie chart with hover tooltip
  function PieChart({ data, total, title, pieId }) {
    const [hover, setHover] = useState(null);
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
      const midAngle = (startAngle + endAngle) / 2;
      const labelPos = polarToCartesian(100, 100, 50, midAngle);
      return { name, val, pct, d, color: PIE_COLORS[i % PIE_COLORS.length], labelPos };
    });
    return (
      <div style={S.statCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={S.statLbl}>{title}</div><div style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", direction: "ltr" }}>₪{total.toLocaleString()}</div></div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <svg viewBox="0 0 200 200" width="160" height="160">
              {slices.map((s, i) => <path key={i} d={s.d} fill={hover === i ? s.color : s.color + "CC"} stroke="#111827" strokeWidth="1" style={{ cursor: "pointer", transition: "opacity 0.1s" }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />)}
            </svg>
            {hover !== null && slices[hover] && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none", background: "#0B1120E0", borderRadius: 8, padding: "6px 10px", whiteSpace: "nowrap" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: slices[hover].color }}>{slices[hover].name}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", direction: "ltr" }}>₪{slices[hover].val.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{Math.round(slices[hover].pct * 100)}%</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 120 }}>
            {slices.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, opacity: hover !== null && hover !== i ? 0.4 : 1, cursor: "pointer", transition: "opacity 0.1s" }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
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

  // Bar chart with hover tooltip
  function BarChart({ data }) {
    const [hover, setHover] = useState(null);
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
    const totalBarIncome = data.reduce((s, d) => s + d.income, 0);
    const totalBarExpense = data.reduce((s, d) => s + d.expense, 0);
    const barW = 30;
    const gap = 12;
    const chartW = data.length * (barW * 2 + gap) + 40;
    const chartH = 200;
    return (
      <div style={S.statCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={S.statLbl}>הכנסות מול הוצאות — חודשי</div>
          <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#10B981" }} />הכנסות <strong style={{ color: "#10B981", direction: "ltr" }}>₪{totalBarIncome.toLocaleString()}</strong></span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#EF4444" }} />הוצאות <strong style={{ color: "#EF4444", direction: "ltr" }}>₪{totalBarExpense.toLocaleString()}</strong></span>
          </div>
        </div>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <svg viewBox={`0 0 ${chartW} ${chartH + 30}`} width={chartW} height={chartH + 30}>
            {data.map((d, i) => {
              const x = 20 + i * (barW * 2 + gap);
              const hIncome = (d.income / maxVal) * chartH;
              const hExpense = (d.expense / maxVal) * chartH;
              const label = new Date(d.month + "-01").toLocaleDateString("he-IL", { month: "short" });
              const isHovered = hover !== null && hover.idx === i;
              return (
                <g key={d.month}>
                  <rect x={x} y={chartH - hIncome} width={barW} height={hIncome || 1} fill={isHovered && hover.type === "income" ? "#10B981" : "#10B98199"} rx="3" style={{ cursor: "pointer" }} onMouseEnter={() => setHover({ idx: i, type: "income", val: d.income, x: x, y: chartH - hIncome })} onMouseLeave={() => setHover(null)} />
                  <rect x={x + barW + 2} y={chartH - hExpense} width={barW} height={hExpense || 1} fill={isHovered && hover.type === "expense" ? "#EF4444" : "#EF444499"} rx="3" style={{ cursor: "pointer" }} onMouseEnter={() => setHover({ idx: i, type: "expense", val: d.expense, x: x + barW + 2, y: chartH - hExpense })} onMouseLeave={() => setHover(null)} />
                  <text x={x + barW} y={chartH + 16} textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="Rubik">{label}</text>
                  {isHovered && (
                    <g>
                      <rect x={hover.x - 10} y={hover.y - 22} width={70} height={18} rx="4" fill="#0B1120E0" />
                      <text x={hover.x + 25} y={hover.y - 10} textAnchor="middle" fill={hover.type === "income" ? "#10B981" : "#EF4444"} fontSize="11" fontFamily="Rubik" fontWeight="600">₪{hover.val.toLocaleString()}</text>
                    </g>
                  )}
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

  // Multi-month toggle (Shift = add/remove, normal = single select)
  const toggleMonth = (m, shiftKey) => {
    if (shiftKey) {
      setDashMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    } else {
      setDashMonths(prev => prev.length === 1 && prev[0] === m ? [] : [m]);
    }
  };

  const ACCT_TABS = [
    { id: "all", label: "הכל", color: "#64748B" },
    { id: "all_no_cash", label: "ללא מזומנים", color: "#475569" },
    { id: "biz", label: "עסק", color: "#10B981" },
    { id: "afik", label: "פוקסי", color: "#3B82F6" },
    { id: "shared", label: "משותף", color: "#8B5CF6" },
    { id: "cash", label: "מזומנים", color: "#F59E0B" },
  ];

  if (loading) return <div style={S.empty}>טוען נתונים...</div>;

  const periodLabel = dashMonths.length > 0
    ? (dashMonths.length === 1 ? new Date(dashMonths[0] + "-01").toLocaleDateString("he-IL", { month: "long" }) : dashMonths.length + " חודשים")
    : String(year);

  return (
    <div style={{ padding: "8px 0 20px" }}>
      {/* Account tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {ACCT_TABS.map(tab => (
          <button key={tab.id} style={{ border: "none", padding: "6px 16px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: dashAcct === tab.id ? 700 : 500, background: dashAcct === tab.id ? tab.color : "transparent", color: dashAcct === tab.id ? "#fff" : "#64748B" }} onClick={() => setDashAcct(tab.id)}>{tab.label}</button>
        ))}
      </div>

      {/* Year + month filters */}
      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select style={{ ...S.inp, width: "auto", padding: "4px 8px", fontSize: 12, borderRadius: 14 }} value={year} onChange={e => { setYear(Number(e.target.value)); setDashMonths([]); }}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        <span style={{ width: 1, height: 16, background: "#334155", margin: "0 2px" }} />
        <button style={dashMonths.length === 0 ? S.filterOn : S.filterOff} onClick={() => setDashMonths([])}>כל השנה</button>
        {Array.from({ length: 12 }, (_, i) => {
          const m = `${year}-${String(i + 1).padStart(2, "0")}`;
          const label = new Date(m + "-01").toLocaleDateString("he-IL", { month: "short" });
          const isActive = dashMonths.includes(m);
          return <button key={m} style={isActive ? { ...S.filterOn, background: "#3B82F6" } : S.filterOff} onClick={(e) => toggleMonth(m, e.shiftKey)}>{label}</button>;
        })}
        {dashMonths.length > 1 && <span style={{ fontSize: 10, color: "#475569", marginRight: 4 }}>({dashMonths.length} נבחרו)</span>}
      </div>
      <div style={{ fontSize: 10, color: "#475569", marginBottom: 8 }}>Shift+לחיצה לבחירת כמה חודשים</div>

      {/* Account balances + credit + per-account forecast */}
      {(() => {
        const openBiz = Number(localStorage.getItem("princess_opening_balance")) || 0;
        const openAfik = Number(localStorage.getItem("princess_opening_balance_afik")) || 0;
        const openShared = Number(localStorage.getItem("princess_opening_balance_shared")) || 0;
        const sumBank = (companyId, account) => merged.filter(t => t.company_id === companyId && (!account || t.account === account)).reduce((s, t) => s + t.charged_amount, 0);
        const balBiz = openBiz + sumBank("otsarHahayal");
        const balAfik = openAfik + sumBank("hapoalim", "327754");
        const balShared = openShared + sumBank("hapoalim", "431928");

        const creditFilter = (companyId) => {
          let txs = merged.filter(t => t.company_id === companyId);
          if (dashMonths.length > 0) txs = txs.filter(t => dashMonths.some(m => t.activity_date?.startsWith(m)));
          else txs = txs.filter(t => t.activity_date?.startsWith(String(year)));
          return Math.abs(txs.filter(t => t.charged_amount < 0).reduce((s, t) => s + t.charged_amount, 0));
        };
        const creditIsracard = creditFilter("isracard");
        const creditMax = creditFilter("max");

        // Future per account
        const now = new Date();
        const nextMonth = `${now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()}-${String((now.getMonth() + 1) % 12 + 1).padStart(2, "0")}`;
        const projections = generateRecurringProjections(recurringAll);
        const futureManual = manualAll.filter(m => m.status === "planned" && m.date >= now.toISOString().slice(0, 10));
        const nextLabel = new Date(nextMonth + "-01").toLocaleDateString("he-IL", { month: "short" });

        const forecastForAcct = (acctId) => {
          const recFiltered = projections.filter(p => (p._accountId || "biz") === acctId && p.date.startsWith(nextMonth));
          const manFiltered = futureManual.filter(m => (m.account_id || "biz") === acctId && m.date?.startsWith(nextMonth));
          const inc = recFiltered.filter(p => p.amount > 0).reduce((s, p) => s + p.amount, 0) + manFiltered.filter(m => m.type === "income").reduce((s, m) => s + m.amount, 0);
          const exp = Math.abs(recFiltered.filter(p => p.amount < 0).reduce((s, p) => s + p.amount, 0)) + manFiltered.filter(m => m.type === "expense").reduce((s, m) => s + m.amount, 0);
          return { inc, exp };
        };
        const fBiz = forecastForAcct("biz");
        const fAfik = forecastForAcct("afik");
        const fShared = forecastForAcct("shared");

        const openCash = Number(localStorage.getItem("princess_opening_balance_cash")) || 0;
        const cashManualSum = manualAll.filter(m => (m.account_id || "biz") === "cash").reduce((s, m) => s + (m.type === "expense" ? -Math.abs(m.amount) : Math.abs(m.amount)), 0);
        const balCash = openCash + cashManualSum;

        const AcctCard = ({ label, color, bal, credit, creditLabel, forecast, acctBal }) => (
          <div style={{ ...S.statCard, borderRight: `3px solid ${color}` }}>
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: bal >= 0 ? "#E2E8F0" : "#EF4444" }}>₪{bal.toLocaleString()}</div>
            {credit !== undefined && <div style={{ fontSize: 11, color: "#475569", marginTop: 6, borderTop: "1px solid #1E293B", paddingTop: 6 }}>
              💳 {creditLabel}: <span style={{ color: "#F59E0B", fontWeight: 600 }}>₪{credit.toLocaleString()}</span>
            </div>}
            {showFuture && <div style={{ marginTop: 6, borderTop: "1px solid #1E293B", paddingTop: 6 }}>
              <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>תחזית {nextLabel}:</div>
              <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                <span style={{ color: "#10B981" }}>+₪{forecast.inc.toLocaleString()}</span>
                <span style={{ color: "#EF4444" }}>-₪{forecast.exp.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: (acctBal + forecast.inc - forecast.exp) >= 0 ? "#10B981" : "#EF4444", marginTop: 2 }}>
                צפי: ₪{(acctBal + forecast.inc - forecast.exp).toLocaleString()}
              </div>
            </div>}
          </div>
        );

        return (<>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
            <button onClick={() => setShowFuture(!showFuture)} style={{ ...S.btn2, fontSize: 11, padding: "3px 10px" }}>{showFuture ? "▼" : "▶"} תחזית {nextLabel}</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <AcctCard label="עו״ש עסק — אוצר החייל" color="#10B981" bal={balBiz} credit={creditIsracard} creditLabel="ישראכרט" forecast={fBiz} acctBal={balBiz} />
            <AcctCard label="עו״ש פוקסי — הפועלים" color="#3B82F6" bal={balAfik} credit={creditMax} creditLabel="מקס" forecast={fAfik} acctBal={balAfik} />
            <AcctCard label="עו״ש משותף — הפועלים" color="#8B5CF6" bal={balShared} forecast={fShared} acctBal={balShared} />
            <AcctCard label="מזומנים" color="#F59E0B" bal={balCash} forecast={forecastForAcct("cash")} acctBal={balCash} />
          </div>
        </>);
      })()}

      {/* Pie charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <PieChart data={expenseHome} total={totalExpenseHome} title="הוצאות בית" pieId="home" />
        <PieChart data={expenseBiz} total={totalExpenseBiz} title="הוצאות עסק" pieId="biz" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <PieChart data={incomeByCat} total={totalIncome} title="הכנסות עסק לפי מקור" pieId="income" />
        <PieChart data={incomeFoxy} total={totalIncomeFoxy} title="הכנסות פוקסי" pieId="incomeFoxy" />
      </div>

      {/* Bar chart */}
      <BarChart data={monthlyData} />

      {/* Income/Expense/Balance summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12, marginBottom: 12 }}>
        <div style={S.statCard}><div style={{ fontSize: 20, fontWeight: 800, color: "#10B981" }}>₪{totalIncome.toLocaleString()}</div><div style={S.statLbl}>הכנסות {periodLabel}</div></div>
        <div style={S.statCard}><div style={{ fontSize: 20, fontWeight: 800, color: "#EF4444" }}>₪{totalExpense.toLocaleString()}</div><div style={S.statLbl}>הוצאות {periodLabel}</div></div>
        <div style={S.statCard}><div style={{ fontSize: 20, fontWeight: 800, color: totalIncome - totalExpense >= 0 ? "#10B981" : "#EF4444" }}>₪{(totalIncome - totalExpense).toLocaleString()}</div><div style={S.statLbl}>מאזן {periodLabel}</div></div>
      </div>

      {/* VAT summary */}
      <div style={{ ...S.statCard, marginTop: 12 }}>
        <div style={S.statLbl}>מע״מ — {periodLabel}</div>
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

function Stats({leads}){const total=leads.length;const byStatus=STATUSES.map(s=>({...s,count:leads.filter(l=>l.status===s.id).length}));const closed=byStatus.find(s=>s.id==="closed")?.count||0;const lost=byStatus.find(s=>s.id==="lost")?.count||0;const decided=closed+lost;const rate=decided>0?Math.round((closed/decided)*100):0;const revenue=leads.filter(l=>l.status==="closed").reduce((s,l)=>s+(l.amount||0),0);const byService={};leads.forEach(l=>{if(l.service)byService[l.service]=(byService[l.service]||0)+1;});const topSvc=Object.entries(byService).sort((a,b)=>b[1]-a[1]).slice(0,6);const bySource={};leads.forEach(l=>{if(l.source)bySource[l.source]=(bySource[l.source]||0)+1;});const topSrc=Object.entries(bySource).sort((a,b)=>b[1]-a[1]).slice(0,6);const byLostReason={};leads.filter(l=>l.status==="lost").forEach(l=>{const r=l.lost_reason||"לא צוין";byLostReason[r]=(byLostReason[r]||0)+1;});const topLost=Object.entries(byLostReason).sort((a,b)=>b[1]-a[1]);const mx=a=>a[0]?.[1]||1;return(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,padding:"8px 0 20px"}}><div style={S.statCard}><div style={{fontSize:36,fontWeight:800}}>{total}</div><div style={S.statLbl}>סה״כ</div></div><div style={S.statCard}><div style={{fontSize:36,fontWeight:800,color:"#10B981"}}>{rate}%</div><div style={S.statLbl}>המרה</div></div><div style={S.statCard}><div style={{fontSize:28,fontWeight:800,color:"#3B82F6"}}>₪{revenue.toLocaleString()}</div><div style={S.statLbl}>הכנסות</div></div><div style={S.statCard}>{byStatus.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}><span style={{width:8,height:8,borderRadius:"50%",background:s.color}}/><span style={{flex:1}}>{s.label}</span><span style={{fontWeight:700}}>{s.count}</span></div>)}</div>{topSvc.length>0&&<div style={S.statCard}><div style={S.statLbl}>שירותים</div>{topSvc.map(([n,c])=><div key={n} style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}><span style={{minWidth:70}}>{n}</span><div style={{flex:1,height:5,background:"#1E293B",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(c/mx(topSvc))*100}%`,background:"#3B82F6",borderRadius:3}}/></div><span style={{fontWeight:600,minWidth:16,textAlign:"center"}}>{c}</span></div>)}</div>}{topSrc.length>0&&<div style={S.statCard}><div style={S.statLbl}>מקורות</div>{topSrc.map(([n,c])=><div key={n} style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}><span style={{minWidth:70}}>{n}</span><div style={{flex:1,height:5,background:"#1E293B",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(c/mx(topSrc))*100}%`,background:"#8B5CF6",borderRadius:3}}/></div><span style={{fontWeight:600,minWidth:16,textAlign:"center"}}>{c}</span></div>)}</div>}{topLost.length>0&&<div style={S.statCard}><div style={S.statLbl}>סיבות אי-סגירה ({lost})</div>{topLost.map(([n,c])=><div key={n} style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}><span style={{minWidth:90}}>{n}</span><div style={{flex:1,height:5,background:"#1E293B",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(c/mx(topLost))*100}%`,background:"#EF4444",borderRadius:3}}/></div><span style={{fontWeight:600,minWidth:16,textAlign:"center"}}>{c}</span><span style={{fontSize:11,color:"#475569",minWidth:32,textAlign:"left"}}>{Math.round((c/lost)*100)}%</span></div>)}</div>}</div>);}

/* ═══════════════════════
   MAIN APP
   ═══════════════════════ */


// ============ CONTRACT GENERATOR ============
const LOGO_B64 = "data:image/png;base64,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";
const PAY_SPLITS = {
  1: [{ pct: 100, when: "עם חתימת ההסכם" }],
  2: [{ pct: 50, when: "עם חתימת ההסכם" }, { pct: 50, when: "חודש לאחר מכן" }],
  3: [{ pct: 40, when: "עם חתימת ההסכם" }, { pct: 30, when: "חודש לאחר מכן" }, { pct: 30, when: "חודשיים לאחר מכן" }],
  4: [{ pct: 40, when: "עם חתימת ההסכם" }, { pct: 20, when: "חודש לאחר מכן" }, { pct: 20, when: "חודשיים לאחר מכן" }, { pct: 20, when: "שלושה חודשים לאחר מכן" }],
};

const CLAUSE_VARS = ["client","episodes","minutes","participants","weeks","price","priceVat","validUntil","signDate","reelsPer","reelLength","recDate","recTime","deliveryHours","duration"];
const CONTRACT_TYPES = [{ id: "package", label: "חבילה" }, { id: "trial", label: "פרק ניסיון" }, { id: "short", label: "נוסח מקוצר" }];

const DEFAULT_CLAUSES = [
  { slug: "intro", kind: "package", part: 1, sort: 10, title: "מה סיכמנו", body:
`אולפני הנסיכה יספקו ללקוח הקלטה וצילום של {{episodes}} פרקי פודקאסט, באורך {{minutes}} דקות נטו לכל פרק, עם עד {{participants}} משתתפים, בצילום משלוש מצלמות עם ניתוב בזמן אמת, הקלטה עם מיקרופון לכל דובר, עריכת צבע וסאונד{{concentrated}}. לאחר ההקלטה יימסרו ללקוח קבצי MP4 ו־MP3/WAV באיכות HD לבחירת הלקוח, מוכנים להפצה, תוך שלושה ימי עסקים מסיום ההקלטה.` },
  { slug: "revisions", kind: "package", part: 1, sort: 30, title: "", body:
`כל פרק{{reelSuffix}} כוללים בתוכם סבב תיקונים אחד, לרבות תיקוני טעויות, חיתוכים נקודתיים ותיקונים טכניים סבירים. עריכת תוכן מהותית או עריכה נוספת מעבר לכך - בתשלום נוסף בהתאם לתעריף בהסכם זה.

הלקוח מצהיר כי ביקר באולפן וצפה בדוגמאות עבודה מייצגות של הספק טרם ההתקשרות, כי הוא מכיר את רמת התוצר, סגנון העריכה והצילום, וכי הם מקובלים עליו. אין באמור כדי לגרוע מהתחייבויות הספק ביחס לאיכות ולמפרט השירותים המפורטים בהסכם.

השלמת העונה תיחשב לאחר צילום {{episodes}} הפרקים ומסירת כל התוצרים שסוכמו עבורם - הפרקים המלאים, קבצי האודיו, חומרי הגלם{{reelsDelivery}} - בהתאם למפרט המוסכם ולאחר השלמת סבב התיקונים הכלול בהסכם.` },
  { slug: "terms", kind: "package", part: 1, sort: 50, title: "תנאי החבילה", body:
`- הצעת מחיר זו תקפה עד {{validUntil}}
- החבילה תהיה בתוקף למשך {{weeks}} שבועות ממועד צילום הפרק הראשון. הצדדים יפעלו בתום לב ובשיתוף פעולה לצורך תיאום והשלמת כלל ימי הצילום בתקופה זו.
- הלקוח יפנה לספק לצורך תיאום יום צילום, ככל האפשר, לפחות 21 ימים מראש ויציע מספר מועדים אפשריים. הספק יעשה מאמץ סביר לאשר אחד מהמועדים המוצעים, וככל שאינו פנוי בהם - יציע מועדים חלופיים קרובים ככל האפשר.
- ככל שלא ניתן יהיה לקיים יום צילום בשל היעדר זמינות של הספק, על אף שהלקוח פנה בהתאם למנגנון האמור, התקופה תוארך בהתאם ולא ייגרע בשל כך פרק מהחבילה.
- לא ניתן לבטל את החבילה מרגע התשלום
- ניתן להעביר את החבילה לצד שלישי בתיאום מראש
- דחייה או ביטול פרק בין 7 ימים ל־48 שעות - ערך השעות של הפרק ישמרו בחבילה
- דחייה או ביטול פחות מ־48 שעות - ירד פרק אחד מערך החבילה` },
  { slug: "payment_terms", kind: "package", part: 1, sort: 70, title: "", body:
`- שריון התאריכים יתבצע אך ורק לאחר העברת התשלום הראשון
- איחור בתשלום מקנה לספק את הזכות להשעות את מתן השירות ולעכב את מסירת התוצרים עד להסדרת התשלום, מבלי שהדבר ייחשב הפרה מצדו. תקופת ההשעיה לא תבוא במניין תקופת תוקף החבילה.` },
  { slug: "bank", kind: "both", part: 1, sort: 80, title: "", body:
`**נמרוד גולדפרב | בנק אוצר החייל 14 | סניף 344 | חשבון 228991**` },

  { slug: "s1", kind: "both", part: 2, sort: 10, title: "1. כללי", body:
`- תקנון זה מהווה הסכם מחייב בין אולפני הנסיכה ("הספק") לבין {{client}} ("הלקוח").
- הזמנת שירות, חתימה על הצעת מחיר או חוזה עבודה, או קבלת השירות בפועל - מהווים הסכמה מלאה ובלתי חוזרת לכל תנאי התקנון ותנאי החבילה.
- התקנון נועד להסדיר את היחסים בין הצדדים, למנוע אי־הבנות, ולהבטיח חוויית עבודה תקינה ומקצועית.` },
  { slug: "s2", kind: "both", part: 2, sort: 20, title: "2. השירותים הניתנים", body:
`- הקלטה וצילום פודקאסט באורך של {{minutes}} דקות נטו
- צילום משלוש מצלמות. במצב של שני משתתפים - מצלמה ייעודית על כל דובר ושוט רחב. במצב של שלושה משתתפים - מצלמה אחת על דובר אחד, מצלמה שנייה על שני דוברים, ושוט רחב. **נא ליידע 48 שעות מראש על פרקים עם יותר משני משתתפים.**
- מיקרופון ייעודי לכל דובר
- ניתוב בזמן אמת בין המצלמות
- עריכת צבע ותיקוני סאונד בסיסיים
- קובץ וידאו בפורמט MP4 באיכות HD וקובץ אודיו בפורמט MP3/WAV, מוכנים להפצה
- קבצי גלם מכל מצלמה באיכות HD, לפני צבע
- **שירותים נוספים:**
  - הפקת רילז נוספים - 250₪ + מע״מ לריל
  - ייצוא חומרים בפורמט מותאם לרשתות חברתיות - 250₪ + מע״מ לחמישה קטעים
  - הפקת פתיח מוזיקלי - 600₪ + מע״מ, תשלום חד־פעמי
  - קובץ מנותב וקבצי גלם באיכות 4K - 250₪ + מע״מ
  - עריכת תוכן - 250₪ + מע״מ לשעה. ככל שהקלטת הפרק תהיה רציפה, וככל שתדעו ותדייקו לנו בדיוק מה אתם רוצים לערוך, יידרש פחות זמן עריכה. ניתן וכדאי לשלב עריכה של כמה פרקים בסשן עריכה אחד ובכך לחסוך עלויות.` },
  { slug: "s3", kind: "both", part: 2, sort: 30, title: "3. משך ההקלטה", body:
`- ההקלטה והצילום מתחילים ומסתיימים בשעות שנקבעו מראש ולא מעבר להן. ההקלטה מתבצעת ברצף, כולל הפסקות ורגעים "מתים".
- כל בקשה להסרת חלקים מהתוכן מעבר לסבב התיקונים הכלול תיחשב **עריכה נוספת** ותחויב בתשלום נוסף של 250₪ + מע״מ לשעת עריכה.
- במידה והצילום התחיל באיחור בגלל הספק, יקבל הלקוח חריגה בזמן הצילום של אותו פרק באופן יחסי לזמן האיחור.` },
  { slug: "s4", kind: "package", part: 2, sort: 40, title: "4. חומרי גלם ושמירת קבצים", body:
`- חומרי הגלם (וידאו ואודיו) יימסרו ללקוח באמצעות שירות אחסון דיגיטלי או כונן זיכרון נייד מטעם הלקוח, עד שלושה ימים מצילום הפרק.
- הפרק המלא יימסר ללקוח עד שלושה ימי עסקים מסיום ההקלטה, אלא אם הוסכם אחרת בכתב, או במקרה של כוח עליון.
{{reelsDeliveryLine}}- הספק ישמור את קבצי התוצר למשך 7 ימי עסקים בלבד ממועד מסירת החומרים. לאחר מכן הקבצים יימחקו ולא יישמר אצל הספק עותק נוסף.
- האחריות לגיבוי ואחסון הקבצים לאחר המסירה - על הלקוח בלבד.` },
  { slug: "s5", kind: "both", part: 2, sort: 50, title: "5. הגעה למועד ההקלטה", body:
`- הלקוח וכל המשתתפים מתבקשים להגיע לפחות 20 דקות לפני מועד תחילת ההקלטה לצורך התארגנות והתאמות טכניות.
- המצלמות והמיקרופונים מתחילים ומסיימים הקלטה בזמן הנקוב בלבד ולא מעבר לכך. איחור יגרור קיצור זמן ההקלטה, ללא החזר כספי.` },
  { slug: "s6", kind: "both", part: 2, sort: 60, title: "6. שינויים בציוד ובסידור הסט", body:
`- מיקומי המצלמות, התאורה והסט נקבעים מראש על ידי הספק.
- אין לבצע שינויים במיקומי הציוד. שינויים יבוצעו רק באישור מראש של הספק ועלולים לגרור תוספת תשלום.` },
  { slug: "s7", kind: "package", part: 2, sort: 70, title: "7. ביטולים ודחיות", body:
`- דחייה או ביטול פרק בין 7 ימים ל־48 שעות - יהיה ניתן לשמור את ערך הפרק.
- דחייה או ביטול פחות מ־48 שעות - ערך הפרק ירד מהחבילה.
- במקרים חריגים (מחלה, כוח עליון) - ייקבע פתרון חלופי בהתאם לשיקול דעת הספק.` },
  { slug: "s8", kind: "both", part: 2, sort: 80, title: "8. זכויות יוצרים ושימוש בתכנים", body:
`- כל הזכויות על התוכן המוקלט שייכות ללקוח, לרבות הזכות לערוך, לקצר, לפרסם, להפיץ, למסחר ולעשות בהם שימוש בכל פלטפורמה וללא הגבלת זמן.
- הלקוח מצהיר כי כל התכנים המוקלטים אינם מפרים זכויות יוצרים של צד שלישי, וכי הוא נושא באחריות משפטית מלאה על התוכן.
- התוכן המופק ומוקלט באולפני הנסיכה הינו באחריותם הבלעדית של האנשים והגופים המייצרים והמציגים אותו. למרות שהאולפן מספק את הכלים להקלטה ולהפקה באיכות גבוהה, איננו מאמצים, תומכים או לוקחים אחריות על כל דעה, אמירה או תוכן המובעים בפודקאסטים המוקלטים באולפן.
- הלקוח מתחייב לשפות את הספק בגין כל נזק, הוצאה או תביעה שתוגש נגדו כתוצאה מהתוכן המוקלט.
- הספק רשאי להשתמש בקטעים קצרים מהתוצרים ובצילומי "מאחורי הקלעים" לצרכי שיווק ותיעוד, אלא אם הלקוח ביקש במפורש שלא לעשות זאת בכתב לפני תחילת השירות.
- הלקוח אחראי ליידע את המשתתפים בהקלטה בדבר האמור בסעיף הקודם.` },
  { slug: "s9", kind: "both", part: 2, sort: 90, title: "9. אחריות הספק", body:
`- הספק מתחייב לבצע את השירות במקצועיות ובאמצעים הטובים ביותר העומדים לרשותו.
- במקרים בהם פרק או חלק משמעותי ממנו אבד או אינו שמיש עקב תקלה טכנית שבאחריות האולפן, הצילום החוזר יבוצע ללא עלות ולא ייחשב כאחד מפרקי החבילה, ללא פיצוי כספי מצד האולפן.
- אי־עמידה חוזרת ובלתי סבירה בלוחות הזמנים, או אי־יכולת או אי־נכונות של הספק לספק את השירות שסוכם, תיחשב להפרה מהותית של ההסכם. במקרה כזה תהיה ללקוח אפשרות לסיים את ההתקשרות, לאחר שניתנה לספק אפשרות סבירה לתקן את ההפרה. במקרה של סיום ההתקשרות ישולם לספק החלק היחסי בגין השירותים שסופקו בפועל, וכל יתרה ששולמה בגין שירותים שטרם סופקו תוחזר ללקוח.` },
  { slug: "s10", kind: "both", part: 2, sort: 100, title: "10. דין וסמכות שיפוט", body:
`- תקנון זה כפוף לדיני מדינת ישראל.
- סמכות השיפוט הבלעדית לכל עניין הנובע ממנו תהיה לבית המשפט המוסמך במחוז מרכז.` },
  { slug: "t_intro", kind: "trial", part: 1, sort: 10, title: "", body:
`בתאריך {{recDate}} בשעה {{recTime}} הספק יספק ללקוח הקלטה וצילום של פרק פודקאסט אחד בלבד, עם {{participants}} משתתפים, באורך של עד {{minutes}} דקות נטו, בצילום משלוש מצלמות עם ניתוב בין דוברים, הקלטה עם מיקרופון לכל דובר, עריכת צבע ותיקוני סאונד. לאחר ההקלטה יימסרו ללקוח קבצי MP4 ו־MP3/WAV באיכות HD, מוכנים להפצה, תוך {{deliveryHours}} שעות מסיום ההקלטה.` },
  { slug: "t_payment_terms", kind: "trial", part: 1, sort: 70, title: "", body:
`- שריון התאריך יתבצע אך ורק לאחר העברת תשלום מלא. ניתן לבצע תשלום במערכת הסליקה או בהעברה בנקאית.` },
  { slug: "t_s4", kind: "trial", part: 2, sort: 40, title: "4. חומרי גלם ושמירת קבצים", body:
`- חומרי הגלם (Raw) יימסרו ללקוח באמצעות שירות אחסון דיגיטלי, ויישמרו שם {{deliveryHours}} שעות מיום ההעלאה.
- הקבצים הסופיים יימסרו ללקוח עד {{deliveryHours}} שעות מסיום ההקלטה, אלא אם הוסכם אחרת בכתב, או במקרה של כוח עליון.
- הספק ישמור את קבצי התוצר למשך 7 ימי עסקים בלבד ממועד המסירה. לאחר מכן הקבצים יימחקו ולא יישמר אצל הספק עותק נוסף.
- האחריות לגיבוי ואחסון הקבצים לאחר המסירה - על הלקוח בלבד.` },
  { slug: "t_s7", kind: "trial", part: 2, sort: 70, title: "7. ביטולים ודחיות", body:
`- ביטול עד 7 ימי עסקים לפני המועד - החזר מלא.
- ביטול בין 7 ימים ל־48 שעות לפני המועד - חיוב של 50% ממחיר השירות.
- ביטול פחות מ־48 שעות לפני המועד - חיוב מלא.
- דחייה תתאפשר בהתראה של לפחות 72 שעות, בכפוף לזמינות האולפן.
- במקרים חריגים (מחלה, כוח עליון) - ייקבע פתרון חלופי בהתאם לשיקול דעת הספק.` },
  { slug: "short_text", kind: "short", part: 1, sort: 10, title: "", body:
`היי {{client}}!
קבענו להפגש ב{{recDate}} בשעה {{recTime}} ל{{duration}} צילום - פודקאסט {{participants}} משתתפים באולפני הנסיכה - הדקל 21 אודים

ככה עובד אצלנו פרק הקלטה + צילום:

מה כלול:
* צילום מ-3 מצלמות: מצלמה 1 - את/ה. מצלמה 2 - האורח/ת שלך. מצלמה 3 - כולם יחד. במצב של שלושה משתתפים ויותר - באחת או שתי המצלמות יהיו שני דוברים.
* מיקרופון ייעודי לכל דובר/ת
* ניתוב + צבע + מיקס
* קובץ MP4 (HD) + MP3/WAV מוכנים להעלאה, תוך {{deliveryHours}} שעות מסיום ההקלטה
* ההקלטה מתחילה ונגמרת בזמנים שנקבעו

מחיר: {{price}}₪ + מע"מ ({{priceVat}}₪ סה"כ)

חשוב לדעת:
* כדאי להגיע 15-20 דק' לפני, כדי שנספיק להתארגן - ההקלטה מתחילה ונגמרת בול בזמן שסוכם, גם אם יש איחור מהצד שלכם (בלי החזר על הזמן שהלך לאיבוד)
* מומלץ לא ללבוש ביגוד עם פסים צפופים או משבצות קטנות - זה יכול לרצד במצלמה
* מיקום המצלמות, התאורה והסט נקבעים מראש על ידינו - אם רוצים לשנות דברים יש להודיע מראש, השינוי בתוספת תשלום.
* הגלם והחומרים הסופיים נשמרים אצלנו 7 ימי עסקים בלבד אחרי המסירה - אז חשוב לגבות אצלכם ברגע שמקבלים את התוצרים! אם רוצים חומרי גלם באותו יום אפשר להביא הארדיסק SSD מפורמט למק.
* ביטול פחות מ-48 שעות = חיוב מלא. דחייה אפשרית בהתראה של לפחות 72 שעות ובכפוף לזמינות.
* כל הזכויות על התוכן שלכם, אתם אחראים על התוכן שאתם מעלים (זכויות יוצרים וכו'), ואנחנו לא לוקחים אחריות על מה שנאמר בפרק
* אנחנו כן משתמשים בקטעים קצרים/מאחורי הקלעים לשיווק, אלא אם תבקשו אחרת מראש
* אנחנו נמצאים במשק משפחתי, אנא השארו באזור האולפן וכבדו את המשק ותושביו
* אנחנו מתחייבים לספק את השירות המקצועי ביותר ותוצרים ברמה שעומדת בסטנדרט של פודקאסטים בארץ, במידה ויהיו תקלות טכניות/כח עליון שיגרמו לפרק להיות לא שלם או לא שמיש בצורה גורפת, יקבע מועד חדש להקלטה על חשבוננו, ללא החזר של הכסף ששולם.

שירותים נוספים במידה ותרצו: עריכת רילז (250₪+מע"מ לריל של עד 90 שניות), ייצוא חומרים לשימוש ברשתות חברתיות (250₪+מע"מ לכחמישה קטעים רציפים), פתיח מוזיקלי (600₪+מע"מ), עריכת תוכן (250₪+מע"מ לשעה)

הגעה
הדקל 21 אודים - בכניסה למשק יש שלט - מש׳ גרעין
כניסה לדרך עפר - ממשיכים בה ישר עד הסוף בצמוד לאורנים שבצד שמאל עד שרואים שער במבוק - שם האולפן

אם מגיעים מכביש 553 - אחרי השער של המושב סופרים 5 במפרים ומיד אחרי החמישי פונים שמאלה למשק

אם מגיעים מכביש 2 - נכנסים למושב לרחוב הצאלון, בצומת T לוקחים שמאלה לרחוב הדקל, המשק יהיה מימין לאחר כ 800 מ׳ אחרי תחנת האוטובוס השניה.` },
];

const esc = s => String(s == null ? "" : s);

function renderClauseBody(text, vars) {
  let t = esc(text);
  Object.keys(vars).forEach(k => { t = t.split("{{" + k + "}}").join(esc(vars[k])); });
  t = t.replace(/\{\{[^}]*\}\}/g, "");
  const bold = s => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const lines = t.split("\n");
  let html = "", para = [], depth = 0, liOpen = false;
  const flushPara = () => { if (para.length) { html += "<p>" + bold(para.join(" ")) + "</p>"; para = []; } };
  const closeTo = target => {
    while (depth > target) { if (liOpen) { html += "</li>"; liOpen = false; } html += "</ul>"; depth--; liOpen = depth > 0; }
    if (depth === target && liOpen && target > 0) { html += "</li>"; liOpen = false; }
  };
  lines.forEach(raw => {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { flushPara(); closeTo(0); return; }
    const m = line.match(/^(\s*)-\s+(.*)$/);
    if (m) {
      flushPara();
      const d = m[1].length >= 2 ? 2 : 1;
      if (d > depth) { while (depth < d) { html += "<ul>"; depth++; liOpen = false; } }
      else { closeTo(d); }
      html += "<li>" + bold(m[2]); liOpen = true;
    } else { closeTo(0); para.push(line.trim()); }
  });
  flushPara(); closeTo(0);
  return html;
}

function substVars(text, vars) {
  let t = String(text == null ? "" : text);
  Object.keys(vars).forEach(k => { t = t.split("{{" + k + "}}").join(String(vars[k] == null ? "" : vars[k])); });
  return t.replace(/\{\{[^}]*\}\}/g, "");
}

const HOUR_WORDS = { 3: "שלוש", 4: "ארבע", 5: "חמש", 6: "שש", 7: "שבע", 8: "שמונה", 9: "תשע", 10: "עשר", 11: "אחת עשרה", 12: "שתים עשרה" };

function hoursPhrase(v) {
  const n = Number(v);
  if (!n || n <= 0) return "שעת";
  if (n === 0.5) return "חצי שעת";
  if (n === 1) return "שעת";
  if (n === 1.5) return "שעה וחצי";
  if (n === 2) return "שעתיים";
  if (n === 2.5) return "שעתיים וחצי";
  if (Number.isInteger(n)) return (HOUR_WORDS[n] || n) + " שעות";
  const whole = Math.floor(n);
  const base = whole === 1 ? "שעה" : whole === 2 ? "שעתיים" : (HOUR_WORDS[whole] || whole) + " שעות";
  return base + " וחצי";
}

function buildShortText(f, clauses) {
  const src = (clauses && clauses.length ? clauses : DEFAULT_CLAUSES).find(c => c.slug === "short_text")
    || DEFAULT_CLAUSES.find(c => c.slug === "short_text");
  const vat = Math.round(f.price * 1.18);
  const fmtIL = d => d ? new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" }) : "____";
  return substVars(src ? src.body : "", {
    client: f.clientName || "____", recDate: f.recDate ? fmtIL(f.recDate) : "____",
    recTime: f.recTime || "____", duration: hoursPhrase(f.duration),
    participants: f.participants, price: f.price.toLocaleString(),
    priceVat: vat.toLocaleString(), deliveryHours: f.deliveryHours || 72,
  });
}

function buildContractHTML(f, clauses) {
  const kind = f.contractType === "trial" ? "trial" : "package";
  const list = (clauses && clauses.length ? clauses : DEFAULT_CLAUSES)
    .filter(c => !c.kind || c.kind === "both" || c.kind === kind)
    .slice().sort((a, b) => (a.sort || 0) - (b.sort || 0));
  const bySlug = {};
  list.forEach(c => { bySlug[c.slug] = c; });
  const vat = Math.round(f.price * 1.18);
  const splits = PAY_SPLITS[f.payments] || PAY_SPLITS[1];
  const fmtIL = d => d ? new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" }) : "____";
  const n = f.reelsPer, hasReels = n > 0;
  const typeAdj = f.reelsType === "רציפים" ? (n === 1 ? "רציף" : "רציפים") : (n === 1 ? "רגיל" : "רגילים");
  const reelNoun = n === 1 ? "ריל אחד" : n + " רילז";

  const vars = {
    client: f.clientName, episodes: f.episodes, minutes: f.minutes, participants: f.participants,
    weeks: f.weeks, price: f.price.toLocaleString(), priceVat: vat.toLocaleString(),
    validUntil: fmtIL(f.validUntil), signDate: fmtIL(f.signDate),
    reelsPer: n, reelLength: f.reelLength,
    recDate: f.recDate ? fmtIL(f.recDate) : "____", recTime: f.recTime || "____", deliveryHours: f.deliveryHours || 72,
    concentrated: f.concentrated ? ", בימי צילום מרוכזים של לפחות שני פרקים ביום" : "",
    reelSuffix: hasReels ? " וריל" : "",
    reelsDelivery: hasReels ? (n === 1 ? " והריל" : " והרילז") : "",
    reelsDeliveryLine: hasReels ? `- ${n === 1 ? "הריל מכל פרק יימסר" : "הרילז מכל פרק יימסרו"} ללקוח עד חמישה ימי עסקים מרגע שהלקוח נתן הוראות לעריכה.\n` : "",
  };

  const blk = slug => {
    const c = bySlug[slug]; if (!c) return "";
    return (c.title ? `<h2>${c.title}</h2>` : "") + renderClauseBody(c.body, vars);
  };

  const reelPara = !hasReels ? "" :
    `<p>אולפני הנסיכה יספקו ללקוח ${reelNoun} מכל פרק באורך של עד ${f.reelLength} שניות, ${f.reelsType === "רציפים" ? "חתוכים מקטע רציף אחד מתוך הפרק" : "ערוכים מתוך תוכן הפרק"}, בפורמט אורכי המותאם לרשתות החברתיות (רילז). ${f.reelsType === "רציפים" ? "הקטעים" : "הסרטונים"} ייבחרו על ידי הלקוח.${f.subtitles ? " הסרטונים יכללו כתוביות וכותרות בסיסיות." : ""}</p>`;

  const summaryItems = [
    `צילום ${f.episodes} פרקים של ${f.minutes} דקות${f.concentrated ? " - ימי צילום מרוכזים של לפחות שני פרקים ביום" : ""}`,
    "ניתוב לפי דוברים, סאונד וצבע לכל פרק",
    "הקלטה ועריכת פתיח מדובר קבוע לכל פרק",
    hasReels ? `${reelNoun} ${typeAdj} באורך של עד ${f.reelLength} שניות מכל פרק${f.subtitles ? ", כולל כתוביות וכותרות בסיסיות" : ""}` : "",
    `סבב תיקונים אחד לכל פרק${hasReels ? " וריל" : ""}`,
  ].filter(Boolean).map(x => `<li>${x}</li>`).join("");

  const priceItems = `<li>מחיר כולל לחבילה: ${f.price.toLocaleString()}₪ + מע״מ (<b>${vat.toLocaleString()}₪</b>)</li>` +
    (f.payments > 1
      ? `<li>חלוקת התשלום:<ul>${splits.map(s => `<li>${Math.round(vat * s.pct / 100).toLocaleString()}₪ (${s.pct}%) - ${s.when}</li>`).join("")}</ul></li>`
      : `<li>התשלום ישולם במלואו עם חתימת ההסכם</li>`);

  const head = `<h1>הסכם עבודה - הקלטה וצילום פודקאסט - ${kind === "trial" ? "פרק ניסיון" : "חבילה"}</h1>
<p class="party"><b>הספק:</b> אולפני הנסיכה</p>
<p class="party"><b>הלקוח:</b> ${f.clientName}</p>`;

  const part1 = kind === "trial"
    ? `${head}
${blk("t_intro")}
${hasReels ? reelPara.replace("</p>", ` ${n === 1 ? "הריל יימסר" : "הרילז יימסרו"} עד חמישה ימי עסקים מרגע שהלקוח נתן הוראות לעריכה.</p>`) : ""}
<div class="keep"><h2>מחיר ותשלום</h2>
<ul><li>מחיר לפרק: ${f.price.toLocaleString()}₪ + מע״מ (<b>${vat.toLocaleString()}₪</b>)</li></ul>
${renderClauseBody(bySlug.t_payment_terms ? bySlug.t_payment_terms.body : "", vars)}
<div class="bankwrap">${renderClauseBody(bySlug.bank ? bySlug.bank.body : "", vars)}</div></div>`
    : `${head}
${blk("intro")}
${reelPara}
${blk("revisions")}
<h3>סיכום החבילה</h3>
<ul>${summaryItems}</ul>
${blk("terms")}
<div class="keep"><h2>מחיר ותשלום</h2>
<ul>${priceItems}</ul>
${renderClauseBody(bySlug.payment_terms ? bySlug.payment_terms.body : "", vars)}
<div class="bankwrap">${renderClauseBody(bySlug.bank ? bySlug.bank.body : "", vars)}</div></div>`;

  const part2 = `<h1>תקנון ותנאי שירות - אולפני הנסיכה</h1>
${list.filter(c => c.part === 2).map(c => blk(c.slug)).join("\n")}
<div class="sign">
  <p><b>חתימה:</b></p>
  <p>שם הלקוח: ${f.clientName}</p>
  <p>חתימה: ___________________</p>
  <p>תאריך: ${fmtIL(f.signDate)}</p>
</div>`;

  return { part1, part2 };
}

const CT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap');
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Assistant','Rubik',sans-serif; font-size: 10.5pt; line-height: 1.6; color: #111; direction: rtl; background: #fff; }
table.pw { width: 100%; border-collapse: collapse; }
table.pw > thead > tr > td,
table.pw > tbody > tr > td,
table.pw > tfoot > tr > td { padding: 0 14mm; border: none; }
table.pw > thead > tr > td { padding-top: 9mm; padding-bottom: 6mm; }
table.pw > tbody > tr > td { vertical-align: top; }
table.pw > tfoot > tr > td { padding-top: 5mm; padding-bottom: 9mm; }
table.brk { page-break-before: always; break-before: page; }
.hdr { text-align: center; }
.hdr img { width: 132px; height: auto; display: inline-block; }
.ftr { text-align: center; font-size: 8.5pt; color: #777; border-top: 1px solid #e2e2e2; padding-top: 3mm; }
.ftr span { unicode-bidi: isolate; }
h1 { font-size: 16pt; font-weight: 800; text-align: center; margin: 0 0 16px; }
h2 { font-size: 12.5pt; font-weight: 700; margin: 18px 0 6px; }
h3 { font-size: 11pt; font-weight: 700; margin: 15px 0 4px; }
p { margin: 0 0 8px; text-align: justify; }
p.party { margin: 0 0 4px; text-align: right; }
p.bank { font-weight: 700; text-align: center; margin: 14px 0 0; }
.bankwrap p { font-weight: 700; text-align: center; margin: 14px 0 0; }
ul { margin: 4px 0 10px; padding-right: 20px; }
li { margin-bottom: 4px; }
ul ul { margin: 4px 0; }
.sign { margin-top: 30px; padding-top: 14px; border-top: 1px solid #ccc; }
.sign p { margin: 0 0 5px; }
@media screen {
  table.pw { max-width: 210mm; margin: 0 auto; }
  table.brk { border-top: 12px solid #eee; }
}
@media print {
  @page { size: A4; margin: 8mm; }
  h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
  li, .sign, .keep { break-inside: avoid; page-break-inside: avoid; }
}`;

// Fills the remainder of the final page so the footer lands at the page bottom.
// Bails out unless the fill is clearly safe, so it can never create a blank page.
const CT_PAD_JS = `
(function(){
  function pad(){
    var MM = 96/25.4, pageH = (297 - 16) * MM;
    var tails = document.querySelectorAll('.tail');
    var tail = tails[tails.length - 1];
    if (!tail) return;
    var total = document.body.getBoundingClientRect().height;
    var rem = total % pageH;
    if (rem < 1) return;
    var need = pageH - rem;
    if (need > 60 && need < pageH - 60) tail.style.height = Math.floor(need - 6) + 'px';
  }
  if (document.readyState === 'complete') pad();
  else window.addEventListener('load', pad);
})();`;

const CT_FOOTER = `<div class="ftr"><span>נימשי</span> | <span dir="ltr">052-2505397</span> | <span dir="ltr">nimrodgf@gmail.com</span></div>`;

function ctPage(bodyHtml, isSecond) {
  return `<table class="pw${isSecond ? " brk" : ""}">
  <thead><tr><td><div class="hdr"><img src="${LOGO_B64}" alt="אולפני הנסיכה"></div></td></tr></thead>
  <tfoot><tr><td>${CT_FOOTER}</td></tr></tfoot>
  <tbody><tr><td>${bodyHtml}<div class="tail"></div></td></tr></tbody>
</table>`;
}

function ctDocument(f, clauses, forPrint) {
  const { part1, part2 } = buildContractHTML(f, clauses);
  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>הסכם - ${f.clientName}</title><style>${CT_CSS}</style></head><body>${ctPage(part1, false)}${ctPage(part2, true)}${forPrint ? "<script>" + CT_PAD_JS + "<\/script>" : ""}</body></html>`;
}

const CODE = { background: "#1E293B", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, margin: "0 2px", direction: "ltr", display: "inline-block" };

function ClauseEditor({ clause, onSave, onReset, saving }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(clause.title || "");
  const [body, setBody] = useState(clause.body || "");
  const dirty = title !== (clause.title || "") || body !== (clause.body || "");
  useEffect(() => { setTitle(clause.title || ""); setBody(clause.body || ""); }, [clause.id, clause.title, clause.body]);
  return (
    <div style={{ ...S.statCard, marginBottom: 6, borderRight: `3px solid ${clause.part === 1 ? "#10B981" : "#8B5CF6"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 11, color: "#64748B" }}>{open ? "▼" : "◀"}</span>
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{clause.title || (clause.slug === "bank" ? "פרטי בנק" : clause.slug === "revisions" ? "תיקונים והצהרות" : clause.slug === "payment_terms" ? "תנאי תשלום" : clause.slug)}</span>
        <span style={{ fontSize: 10, color: "#475569" }}>{clause.part === 1 ? "הסכם" : "תקנון"}{clause.kind && clause.kind !== "both" ? (clause.kind === "trial" ? " · פרק ניסיון" : " · חבילה") : ""}</span>
        {dirty && <span style={{ fontSize: 10, color: "#F59E0B" }}>● לא נשמר</span>}
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          <label style={S.lbl}>כותרת (ריק = בלי כותרת)</label>
          <input style={{ ...S.inp, marginBottom: 8 }} value={title} onChange={e => setTitle(e.target.value)} />
          <label style={S.lbl}>תוכן</label>
          <textarea style={{ ...S.inp, minHeight: 160, fontFamily: "inherit", lineHeight: 1.7, resize: "vertical" }} value={body} onChange={e => setBody(e.target.value)} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button style={S.btn1} disabled={!dirty || saving} onClick={() => onSave(clause, { title, body })}>שמור</button>
            <button style={S.btn2} disabled={!dirty} onClick={() => { setTitle(clause.title || ""); setBody(clause.body || ""); }}>בטל שינויים</button>
            <span style={{ flex: 1 }} />
            <button style={{ ...S.btn2, color: "#EF4444" }} disabled={saving} onClick={() => onReset(clause)}>שחזר מקורי</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractGenerator({ leads }) {
  const [f, setF] = useState({
    contractType: "package",
    clientName: "", episodes: 10, minutes: 60, participants: 4, concentrated: false,
    reelsPer: 1, reelsType: "רגילים", reelLength: 90, subtitles: true,
    price: 7000, payments: 1, validUntil: "", weeks: 26, signDate: new Date().toISOString().split("T")[0],
    recDate: "", recTime: "", deliveryHours: 72, duration: 1,
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const [showPreview, setShowPreview] = useState(false);
  const [mode, setMode] = useState("form");
  const [copied, setCopied] = useState(false);
  const [clauses, setClauses] = useState(DEFAULT_CLAUSES);
  const [dbReady, setDbReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sb("contract_clauses", "GET", null, "?order=sort.asc&limit=200")
      .then(rows => { if (rows && rows.length) { setClauses(rows); setDbReady(true); } })
      .catch(() => {});
  }, []);

  const seedClauses = async () => {
    setSaving(true);
    try {
      const existing = await sb("contract_clauses", "GET", null, "?select=id,slug&limit=200").catch(() => []);
      const have = new Set((existing || []).map(x => x.slug));
      const missing = DEFAULT_CLAUSES.filter(x => !have.has(x.slug));
      if (missing.length) {
        await sb("contract_clauses", "POST", missing.map(x => ({ slug: x.slug, kind: x.kind || "both", part: x.part, sort: x.sort, title: x.title, body: x.body })));
      }
      // keep structural fields in sync without touching edited text
      for (const d of DEFAULT_CLAUSES) {
        const ex = (existing || []).find(x => x.slug === d.slug);
        if (ex) await sb("contract_clauses", "PATCH", { kind: d.kind || "both", part: d.part, sort: d.sort }, `?id=eq.${ex.id}`).catch(() => {});
      }
      const rows = await sb("contract_clauses", "GET", null, "?order=sort.asc&limit=200");
      setClauses(rows && rows.length ? rows : DEFAULT_CLAUSES); setDbReady(true);
      _showToast(missing.length ? `✓ נוספו ${missing.length} סעיפים` : "✓ הסעיפים מסונכרנים");
    } catch (e) { _showToast("שגיאה: " + e.message, "error"); }
    setSaving(false);
  };

  const saveClause = async (cl, patch) => {
    setSaving(true);
    try {
      const [r] = await sb("contract_clauses", "PATCH", patch, `?id=eq.${cl.id}`);
      setClauses(p => p.map(x => x.id === cl.id ? r : x)); _showToast("✓ נשמר");
    } catch (e) { _showToast("שגיאה: " + e.message, "error"); }
    setSaving(false);
  };

  const resetClause = async (cl) => {
    const d = DEFAULT_CLAUSES.find(x => x.slug === cl.slug);
    if (!d || !confirm("לשחזר את הנוסח המקורי של הסעיף?")) return;
    await saveClause(cl, { title: d.title, body: d.body });
  };

  const isTrial = f.contractType === "trial";
  const isShort = f.contractType === "short";
  const isSingle = isTrial || isShort;
  const vat = Math.round(f.price * 1.18);
  const splits = PAY_SPLITS[f.payments] || PAY_SPLITS[1];
  const clientNames = [...new Set(leads.map(l => l.name).filter(Boolean))];

  const printContract = () => {
    const doc = ctDocument(f, clauses, true);
    const w = window.open("", "_blank");
    if (!w) { alert("החלון נחסם. אפשר חלונות קופצים לאתר ונסה שוב."); return; }
    w.document.open(); w.document.write(doc); w.document.close();
    const go = () => { try { w.focus(); w.print(); } catch (e) {} };
    if (w.document.readyState === "complete") setTimeout(go, 500);
    else w.addEventListener("load", () => setTimeout(go, 400));
  };

  if (mode === "edit") {
    return (
      <div style={{ padding: "8px 0 20px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <button style={S.btn2} onClick={() => setMode("form")}>← חזרה</button>
          <span style={{ fontSize: 15, fontWeight: 700 }}>עריכת נוסח החוזה</span>
          {saving && <span style={{ fontSize: 11, color: "#64748B" }}>שומר...</span>}
        </div>
        {!dbReady ? (
          <div style={S.statCard}>
            <p style={{ fontSize: 13, margin: "0 0 10px" }}>הנוסח עדיין לא נטען לבסיס הנתונים. לחיצה תעתיק את הנוסח הנוכחי לטבלה, ומשם הוא ניתן לעריכה.</p>
            <button style={S.btn1} disabled={saving} onClick={seedClauses}>טען את הנוסח לעריכה</button>
          </div>
        ) : (
          <>
            <div style={{ ...S.statCard, marginBottom: 10, fontSize: 11, color: "#94A3B8", lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, color: "#E2E8F0", marginBottom: 4 }}>עזרה</div>
              <div>שורה שמתחילה ב־<code style={CODE}>- </code> הופכת לפריט ברשימה. שתי רווחים לפניה יוצרים רשימה מקוננת. שורה ריקה מפרידה בין פסקאות. טקסט בין <code style={CODE}>**</code> יוצא מודגש.</div>
              <div style={{ marginTop: 4 }}>משתנים שיוחלפו אוטומטית: {CLAUSE_VARS.map(v => <code key={v} style={CODE}>{"{{" + v + "}}"}</code>)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
              <button style={{ ...S.btn2, padding: "4px 12px", fontSize: 11 }} disabled={saving} onClick={seedClauses}>סנכרן סעיפים חדשים</button>
            </div>
            {clauses.slice().sort((a, b) => (a.part - b.part) || (a.sort - b.sort)).map(cl => (
              <ClauseEditor key={cl.id || cl.slug} clause={cl} onSave={saveClause} onReset={resetClause} saving={saving} />
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 0 20px" }}>
      {!showPreview ? (
        <div style={S.statCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>פרטי החוזה</span>
            <button style={{ ...S.btn2, padding: "4px 12px", fontSize: 12 }} onClick={() => setMode("edit")}>✎ עריכת נוסח</button>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {CONTRACT_TYPES.map(t => (
              <button key={t.id} style={{ border: "none", padding: "6px 18px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: f.contractType === t.id ? 700 : 500, background: f.contractType === t.id ? "#8B5CF6" : "#1E293B", color: f.contractType === t.id ? "#fff" : "#64748B" }}
                onClick={() => { setCopied(false); setF(p => ({ ...p, contractType: t.id, price: t.id === "package" ? 7000 : 550, participants: t.id === "package" ? 4 : 2, payments: 1 })); }}>{t.label}</button>
            ))}
          </div>
          <div style={S.grid2}>
            <div style={S.full}><label style={S.lbl}>שם הלקוח *</label>
              <input style={S.inp} value={f.clientName} onChange={e => set("clientName", e.target.value)} placeholder="שם מלא / שם חברה" list="leadNames" />
              <datalist id="leadNames">{clientNames.map(n => <option key={n} value={n} />)}</datalist>
            </div>
            {isSingle && <div><label style={S.lbl}>תאריך ההקלטה</label><input style={S.inp} type="date" value={f.recDate} onChange={e => set("recDate", e.target.value)} dir="ltr" /></div>}
            {isSingle && <div><label style={S.lbl}>שעה</label><input style={S.inp} type="time" value={f.recTime} onChange={e => set("recTime", e.target.value)} dir="ltr" /></div>}
            {!isSingle && <div><label style={S.lbl}>מספר פרקים</label><input style={S.inp} type="number" value={f.episodes} onChange={e => set("episodes", Number(e.target.value))} dir="ltr" /></div>}
            {!isShort && <div><label style={S.lbl}>אורך פרק (דקות)</label><input style={S.inp} type="number" value={f.minutes} onChange={e => set("minutes", Number(e.target.value))} dir="ltr" /></div>}
            {isShort && <div><label style={S.lbl}>משך הצילום (שעות)</label><input style={S.inp} type="number" min="0.5" step="0.5" value={f.duration} onChange={e => set("duration", Number(e.target.value))} dir="ltr" /><div style={{ fontSize: 10, color: "#64748B", marginTop: 3 }}>ייכתב: ל{hoursPhrase(f.duration)} צילום</div></div>}
            <div><label style={S.lbl}>{isSingle ? "מספר משתתפים" : "עד כמה משתתפים"}</label><input style={S.inp} type="number" value={f.participants} onChange={e => set("participants", Number(e.target.value))} dir="ltr" /></div>
            {isSingle && <div><label style={S.lbl}>מסירה (שעות)</label><input style={S.inp} type="number" value={f.deliveryHours} onChange={e => set("deliveryHours", Number(e.target.value))} dir="ltr" /></div>}
            {!isSingle && <div><label style={S.lbl}>ימי צילום</label><select style={S.inp} value={f.concentrated ? "y" : "n"} onChange={e => set("concentrated", e.target.value === "y")}><option value="n">פרק בכל יום</option><option value="y">מרוכזים - לפחות 2 ביום</option></select></div>}
          </div>

          {!isShort && <><div style={{ fontSize: 13, fontWeight: 700, margin: "16px 0 8px", paddingTop: 12, borderTop: "1px solid #1E293B" }}>רילז</div>
          <div style={S.grid2}>
            <div><label style={S.lbl}>כמות מכל פרק</label><select style={S.inp} value={f.reelsPer} onChange={e => set("reelsPer", Number(e.target.value))}><option value={0}>ללא רילז</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option></select></div>
            {f.reelsPer > 0 && <div><label style={S.lbl}>סוג</label><select style={S.inp} value={f.reelsType} onChange={e => set("reelsType", e.target.value)}><option>רגילים</option><option>רציפים</option></select></div>}
            {f.reelsPer > 0 && <div><label style={S.lbl}>אורך (שניות)</label><input style={S.inp} type="number" value={f.reelLength} onChange={e => set("reelLength", Number(e.target.value))} dir="ltr" /></div>}
            {f.reelsPer > 0 && <div><label style={S.lbl}>כתוביות וכותרות</label><select style={S.inp} value={f.subtitles ? "y" : "n"} onChange={e => set("subtitles", e.target.value === "y")}><option value="y">כלולות</option><option value="n">לא כלולות</option></select></div>}
          </div></>}

          <div style={{ fontSize: 13, fontWeight: 700, margin: "16px 0 8px", paddingTop: 12, borderTop: "1px solid #1E293B" }}>מחיר ותשלום</div>
          <div style={S.grid2}>
            <div><label style={S.lbl}>{isSingle ? "מחיר לפרק (לפני מע״מ)" : "מחיר לפני מע״מ"}</label><input style={S.inp} type="number" value={f.price} onChange={e => set("price", Number(e.target.value))} dir="ltr" /></div>
            <div><label style={S.lbl}>כולל מע״מ</label><input style={{ ...S.inp, color: "#10B981", fontWeight: 700 }} value={`₪${vat.toLocaleString()}`} readOnly dir="ltr" /></div>
            {!isSingle && <div><label style={S.lbl}>מספר תשלומים</label><select style={S.inp} value={f.payments} onChange={e => set("payments", Number(e.target.value))}><option value={1}>תשלום אחד</option><option value={2}>2 תשלומים</option><option value={3}>3 תשלומים</option><option value={4}>4 תשלומים</option></select></div>}
            {!isSingle && <div><label style={S.lbl}>תוקף ההצעה</label><input style={S.inp} type="date" value={f.validUntil} onChange={e => set("validUntil", e.target.value)} dir="ltr" /></div>}
            {!isSingle && <div><label style={S.lbl}>תוקף החבילה (שבועות)</label><input style={S.inp} type="number" value={f.weeks} onChange={e => set("weeks", Number(e.target.value))} dir="ltr" /></div>}
            {!isShort && <div><label style={S.lbl}>תאריך חתימה</label><input style={S.inp} type="date" value={f.signDate} onChange={e => set("signDate", e.target.value)} dir="ltr" /></div>}
          </div>

          {!isSingle && f.payments > 1 && <div style={{ marginTop: 10, padding: 10, background: "#0F172A", borderRadius: 8, fontSize: 12 }}>
            {splits.map((s, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span>{s.when}</span><span style={{ color: "#10B981", fontWeight: 600, direction: "ltr" }}>₪{Math.round(vat * s.pct / 100).toLocaleString()} ({s.pct}%)</span></div>)}
          </div>}

          <div style={{ marginTop: 16 }}>
            <button style={S.btn1} disabled={!f.clientName.trim()} onClick={() => setShowPreview(true)}>{isShort ? "צור טקסט ←" : "צפייה בחוזה ←"}</button>
          </div>
        </div>
      ) : (
        isShort ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <button style={S.btn2} onClick={() => setShowPreview(false)}>← חזרה לעריכה</button>
            <button style={S.btn1} onClick={async () => {
              const txt = buildShortText(f, clauses);
              try { await navigator.clipboard.writeText(txt); }
              catch (e) { const ta = document.getElementById("shortTxt"); if (ta) { ta.select(); document.execCommand("copy"); } }
              setCopied(true); setTimeout(() => setCopied(false), 2500);
            }}>{copied ? "✓ הועתק" : "📋 העתק"}</button>
            <span style={{ fontSize: 11, color: "#475569" }}>אפשר גם לערוך כאן לפני ההעתקה</span>
          </div>
          <textarea id="shortTxt" readOnly={false} defaultValue={buildShortText(f, clauses)}
            style={{ ...S.inp, width: "100%", minHeight: "70vh", fontFamily: "inherit", fontSize: 13, lineHeight: 1.8, resize: "vertical", whiteSpace: "pre-wrap" }} />
        </>
        ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button style={S.btn2} onClick={() => setShowPreview(false)}>← חזרה לעריכה</button>
            <button style={S.btn1} onClick={printContract}>🖨 הדפס / שמור כ-PDF</button>
          </div>
          <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden" }}>
            <iframe
              title="preview"
              style={{ width: "100%", height: "78vh", border: "none", background: "#fff" }}
              srcDoc={ctDocument(f, clauses)}
            />
          </div>
        </>
        )
      )}
    </div>
  );
}

export default function App(){
  const [leads,setLeads]=useState([]);const [interactions,setInteractions]=useState([]);const [tasks,setTasks]=useState([]);const [sessions,setSessions]=useState([]);const [packages,setPackages]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(null);
  const [section,setSection]=useState("crm");
  const [view,setView]=useState("leads");
  const [leadsMode,setLeadsMode]=useState("board");const [showForm,setShowForm]=useState(false);const [showNotifs,setShowNotifs]=useState(false);const [selectedLead,setSelectedLead]=useState(null);const [search,setSearch]=useState("");const [serviceFilter,setServiceFilter]=useState("");const [statusFilter,setStatusFilter]=useState("");const [sourceFilter,setSourceFilter]=useState("");const [lostReasonFilter,setLostReasonFilter]=useState("");const [taskFilter,setTaskFilter]=useState(false);const [dragId,setDragId]=useState(null);const [sortCol,setSortCol]=useState("created_at");const [sortDir,setSortDir]=useState("desc");const toast=useToast();const [notifRefresh,setNotifRefresh]=useState(0);const notifs=useNotifications(leads,tasks,interactions,notifRefresh);

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
  const filtered=leads.filter(l=>{if(search&&!l.name?.includes(search)&&!l.phone?.includes(search)&&!l.service?.includes(search))return false;if(serviceFilter&&l.service!==serviceFilter)return false;if(statusFilter&&l.status!==statusFilter)return false;if(sourceFilter&&l.source!==sourceFilter)return false;if(lostReasonFilter&&l.lost_reason!==lostReasonFilter)return false;if(taskFilter&&!tasks.some(t=>t.lead_id===l.id&&!t.completed))return false;return true;});

  // Section/view sync
  const switchSection = (s) => {
    setSection(s);
    if (s === "crm") setView("leads");
    else setView("dashboard");
  };

  const CRM_TABS = [
    { id: "leads", label: "לידים" },
    { id: "clients", label: "לקוחות" },
    { id: "tasks", label: "משימות" },
    { id: "stats", label: "נתונים" },
    { id: "contracts", label: "צור חוזה" },
  ];
  const FIN_TABS = [
    { id: "dashboard", label: "דאשבורד" },
    { id: "cashflow_biz", label: "תזרים עסק" },
    { id: "cashflow_afik", label: "תזרים פוקסי" },
    { id: "cashflow_shared", label: "תזרים משותף" },
    { id: "cashflow_cash", label: "תזרים מזומנים" },
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

  {view==="leads"&&<div style={{display:"flex",gap:4,flexWrap:"wrap",padding:"6px 0",alignItems:"center"}}><button style={!serviceFilter&&!taskFilter&&!statusFilter&&!sourceFilter&&!lostReasonFilter?S.filterOn:S.filterOff} onClick={()=>{setServiceFilter("");setTaskFilter(false);setStatusFilter("");setSourceFilter("");setLostReasonFilter("");}}>הכל</button>{STATUSES.map(s=>{const c=leads.filter(l=>l.status===s.id).length;if(c===0)return null;return <button key={s.id} style={statusFilter===s.id?{...S.filterOn,background:s.color}:S.filterOff} onClick={()=>setStatusFilter(statusFilter===s.id?"":s.id)}>{s.label} ({c})</button>;})}<span style={{width:1,height:16,background:"#334155",margin:"0 2px"}}/>{SERVICES.map(svc=>{const c=leads.filter(l=>l.service===svc).length;if(c===0)return null;return <button key={svc} style={serviceFilter===svc?S.filterOn:S.filterOff} onClick={()=>setServiceFilter(serviceFilter===svc?"":svc)}>{svc} ({c})</button>;})}<span style={{width:1,height:16,background:"#334155",margin:"0 2px"}}/><select style={{...S.inp,width:"auto",padding:"3px 8px",fontSize:12,borderRadius:14,background:sourceFilter?"#F59E0B":"#1E293B",color:sourceFilter?"#fff":"#64748B",border:"none",fontWeight:sourceFilter?600:400}} value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option value="">מקור</option>{SOURCES.map(src=>{const c=leads.filter(l=>l.source===src).length;if(c===0)return null;return <option key={src} value={src}>{src} ({c})</option>;})}</select><select style={{...S.inp,width:"auto",padding:"3px 8px",fontSize:12,borderRadius:14,background:lostReasonFilter?"#EF4444":"#1E293B",color:lostReasonFilter?"#fff":"#64748B",border:"none",fontWeight:lostReasonFilter?600:400}} value={lostReasonFilter} onChange={e=>setLostReasonFilter(e.target.value)}><option value="">סיבת אי-סגירה</option>{LOST_REASONS.map(r=>{const c=leads.filter(l=>l.lost_reason===r).length;if(c===0)return null;return <option key={r} value={r}>{r} ({c})</option>;})}</select><span style={{width:1,height:16,background:"#334155",margin:"0 2px"}}/><button style={taskFilter?{...S.filterOn,background:"#3B82F6"}:S.filterOff} onClick={()=>setTaskFilter(!taskFilter)}>📋 משימות</button></div>}

  {view==="leads"&&leadsMode==="board"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8,padding:"8px 0 20px",minHeight:400}}>{BOARD_STATUSES.map(status=>{const col=filtered.filter(l=>l.status===status.id);return(<div key={status.id} style={S.col} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragId){updateLead(dragId,{status:status.id});setDragId(null);}}}><div style={S.colHead}><span style={{width:8,height:8,borderRadius:"50%",background:status.color}}/><span style={{fontSize:13,fontWeight:700,flex:1}}>{status.label}</span><span style={S.badge}>{col.length}</span></div><div style={{display:"flex",flexDirection:"column",gap:6}}>{col.map(lead=>{const temp=TEMPS.find(t=>t.id===lead.temperature);return(<div key={lead.id} style={{...S.card,cursor:"pointer",borderRight:temp?`3px solid ${temp.color}`:"3px solid transparent"}} draggable onDragStart={()=>setDragId(lead.id)} onDragEnd={()=>setDragId(null)} onClick={()=>setSelectedLead(lead)}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:14,fontWeight:600}}>{lead.name}</span>{temp&&<span style={{fontSize:14}}>{temp.emoji}</span>}</div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>{lead.service&&<span style={{fontSize:11,background:"#1E293B",color:"#94A3B8",padding:"1px 7px",borderRadius:4}}>{lead.service}</span>}{lead.amount>0&&<span style={{fontSize:11,color:"#10B981",fontWeight:600}}>₪{lead.amount.toLocaleString()}</span>}</div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#475569"}}><span>{lead.source}</span><span>{daysAgo(lead.updated_at)}</span></div></div>);})}{col.length===0&&<div style={{fontSize:12,color:"#334155",textAlign:"center",padding:20}}>אין לידים</div>}</div></div>);})}</div>}

  {view==="leads"&&leadsMode==="list"&&(()=>{
    const toggleSort=(col)=>{if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(col);setSortDir(col==="created_at"||col==="updated_at"?"desc":"asc");}};
    const arrow=col=>sortCol===col?(sortDir==="asc"?" ▲":" ▼"):"";
    const sorted=[...filtered].sort((a,b)=>{
      let va=a[sortCol],vb=b[sortCol];
      if(sortCol==="name"){va=(va||"").toLowerCase();vb=(vb||"").toLowerCase();}
      if(sortCol==="amount"){va=Number(va)||0;vb=Number(vb)||0;}
      if(sortCol==="created_at"||sortCol==="updated_at"){va=va||"";vb=vb||"";}
      if(sortCol==="status"){const order={new:0,in_progress:1,frozen:2,closed:3,lost:4};va=order[va]??5;vb=order[vb]??5;}
      if(va<vb)return sortDir==="asc"?-1:1;
      if(va>vb)return sortDir==="asc"?1:-1;
      return 0;
    });
    const cols=[{key:"name",label:"שם"},{key:"phone",label:"טלפון"},{key:"service",label:"שירות"},{key:"status",label:"סטטוס"},{key:"source",label:"מקור"},{key:"amount",label:"סכום"},{key:"created_at",label:"תאריך"},{key:"updated_at",label:"עדכון"}];
    return <div style={{overflowX:"auto",padding:"8px 0 20px"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{cols.map(c=><th key={c.key} style={{...S.th,cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}} onClick={()=>toggleSort(c.key)}>{c.label}{arrow(c.key)}</th>)}</tr></thead><tbody>{sorted.map(lead=>{const s=STATUSES.find(x=>x.id===lead.status);const temp=TEMPS.find(t=>t.id===lead.temperature);return(<tr key={lead.id} style={{cursor:"pointer"}} onClick={()=>setSelectedLead(lead)}><td style={S.td}><strong>{lead.name}</strong> {temp?temp.emoji:""}</td><td style={{...S.td,direction:"ltr",textAlign:"right"}}>{lead.phone}</td><td style={S.td}>{lead.service}</td><td style={S.td}><span style={{background:s.bg,color:s.color,padding:"2px 10px",borderRadius:12,fontSize:12,fontWeight:600}}>{s.label}</span></td><td style={S.td}>{lead.source}</td><td style={S.td}>{lead.amount>0?`₪${lead.amount.toLocaleString()}`:"—"}</td><td style={S.td}>{fmtDate(lead.created_at)}</td><td style={S.td}>{daysAgo(lead.updated_at)}</td></tr>);})}</tbody></table>{sorted.length===0&&<div style={S.empty}>אין לידים</div>}</div>;
  })()}

  {view==="clients"&&<ClientsView leads={leads} onSelect={setSelectedLead}/>}
  {view==="tasks"&&<TasksView tasks={tasks} leads={leads} onToggle={toggleTask} onDelete={deleteTask}/>}
  {view==="cashflow_biz"&&<CashflowView leads={leads} accountId="biz" key="biz"/>}
  {view==="cashflow_afik"&&<CashflowView leads={leads} accountId="afik" key="afik"/>}
  {view==="cashflow_shared"&&<CashflowView leads={leads} accountId="shared" key="shared"/>}
  {view==="cashflow_cash"&&<CashflowView leads={leads} accountId="cash" key="cash"/>}
  {view==="dashboard"&&<DashboardView/>}
  {view==="stats"&&<Stats leads={leads}/>}
  {view==="contracts"&&<ContractGenerator leads={leads}/>}
  {showForm&&<LeadForm onSave={addLead} onClose={()=>setShowForm(false)}/>}
  {showNotifs&&<NotifPanel notifs={notifs} onClose={()=>setShowNotifs(false)} onSelect={id=>{const l=leads.find(x=>x.id===id);if(l)setSelectedLead(l);}} onDismiss={()=>setNotifRefresh(r=>r+1)}/>}
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
